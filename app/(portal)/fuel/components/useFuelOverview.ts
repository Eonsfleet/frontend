"use client";

/**
 * Data layer for the Fuel Overview dashboard.
 *
 * Wires the existing fuel API into flat view-models the presentational components consume.
 * Keeps the overview grounded in values returned by the fuel API. Deeper
 * analysis stays in the dedicated analysis/reports views.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  getTheftSummary,
  getFuelConsumptionReport,
  getFuelCostReport,
  getFuelEfficiencyReport,
  getFuelDistribution,
  getFuelEfficiencyGraph,
  getFuelVehiclesRealtime,
  getTopFuelConsumers,
} from "@/lib/api/fuel";
import type { FuelVehicle } from "@/types/fuel";
import {
  formatVehicleMakeModel,
  formatVehicleRegistration,
} from "./formatVehicleText";

const KOBO = 100;

/** Naira from a kobo integer. */
export const nairaFromKobo = (kobo: number) => kobo / KOBO;

function formatDateOrFallback(
  value: string | number | Date | null | undefined,
  pattern: string,
  fallback = "—",
) {
  if (value == null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : format(date, pattern);
}

function finiteNumberOrFallback(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function paginationTotal(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export interface FuelOverviewRange {
  startDate: string; // yyyy-MM-dd
  endDate: string;
}

export interface FuelOverviewFilters {
  vehicleSearch?: string;
  vehicleFilter?: string;
  topConsumersFilter?: string;
}

// ── KPI view-models ──────────────────────────────────────────────────────────

export interface KpiViewModel {
  totalFuelUsedLiters: number;
  totalFuelCostNaira: number;
  avgEfficiencyKmPerL: number;
  totalRefills: number;
  totalVehicles: number;
}

// ── Vehicle-row view-model (list, distribution, low-fuel) ─────────────────────

export type VehicleMovement = "moving" | "parked" | "idle" | "offline";

export interface VehicleRow {
  id: number;
  registration: string;
  model: string;
  /** Chassis / device identifier shown under the registration. */
  chassis: string;
  fuelPercent: number | null;
  fuelLiters: number | null;
  online: boolean;
  /** Last known address, or null when the vehicle API has no position for it. */
  location: string | null;
  /** Live coordinates from /vehicles?has_fuel=true, or null when the vehicle has no fix. */
  lat: number | null;
  lng: number | null;
  status: VehicleMovement;
}

const FUEL_BANDS = [
  { key: "0-20", label: "0 – 20%", min: 0, max: 20, color: "#ef4444" },
  { key: "20-40", label: "20 – 40%", min: 20, max: 40, color: "#3b82f6" },
  { key: "40-60", label: "40 – 60%", min: 40, max: 60, color: "#60a5fa" },
  { key: "60-80", label: "60 – 80%", min: 60, max: 80, color: "#f59e0b" },
  { key: "80-100", label: "80 – 100%", min: 80, max: 101, color: "#10b981" },
] as const;

export interface DistributionBand {
  key: string;
  label: string;
  color: string;
  count: number;
  percent: number;
}

export interface LowFuelAlert {
  id: number;
  registration: string;
  fuelPercent: number;
  fuelLiters: number;
  location: string;
  time: string;
}

export interface TopConsumer {
  id: number;
  registration: string;
  model: string;
  litersUsed: number;
  costNaira: number;
  /** 0–1, share of the top consumer for the progress bar. */
  share: number;
}

export interface SummaryMetrics {
  idleFuelLiters: number;
  idleTrend: number;
  unauthorizedDrainAlerts: number;
  unauthorizedDrainTrend: number;
  theftPreventionNaira: number;
  co2SavedKg: number;
  totalSavingsNaira: number;
  totalSavingsTrend: number;
}

/** Reads a lat/lng from the coordinate shapes /vehicles?has_fuel=true may return; null when absent. */
function readCoord(
  ...values: Array<number | string | null | undefined>
): number | null {
  for (const value of values) {
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number) && number !== 0) return number;
  }
  return null;
}

/** Minutes since a device's last report before we treat it as offline/stale. */
const STALE_AFTER_MINUTES = 30;

/**
 * Derives movement status from the signals the fuel API exposes:
 *  - offline device, or a reading older than STALE_AFTER_MINUTES → 'offline'
 *  - online + a positive speed reading                          → 'moving'
 *  - online but not moving (speed 0/absent)                     → 'parked'
 * Speed comes from attributes.speed or current_location.speed; last-seen from
 * fuel_level.last_updated / fuel_data.live_metric_updated_at.
 */
function deriveStatus(v: FuelVehicle): VehicleMovement {
  const online = v.attributes.device_online;
  const lastSeen =
    v.fuel_level?.last_updated ??
    v.fuel_metrics?.last_updated ??
    v.fuel_data?.live_metric_updated_at ??
    null;
  const stale = (() => {
    if (!lastSeen) return false;
    const t = new Date(lastSeen).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t > STALE_AFTER_MINUTES * 60_000;
  })();

  if (!online || stale) return "offline";

  const speed = Number(
    v.attributes.speed ?? v.relationships?.current_location?.speed ?? 0,
  );
  return Number.isFinite(speed) && speed > 0 ? "moving" : "parked";
}

function mapVehicleRow(v: FuelVehicle): VehicleRow {
  const online = v.attributes.device_online;
  const status: VehicleMovement = deriveStatus(v);
  const coordinates = v.attributes.coordinates;
  const currentLocation = v.relationships?.current_location;
  const lat = readCoord(coordinates?.latitude, currentLocation?.latitude);
  const lng = readCoord(coordinates?.longitude, currentLocation?.longitude);
  return {
    id: Number(v.id),
    registration: formatVehicleRegistration(v.attributes.registration_number),
    model: formatVehicleMakeModel(v.attributes.make, v.attributes.model),
    chassis: v.attributes.device_imei ?? "—",
    fuelPercent: v.fuel_level
      ? Math.round(v.fuel_level.fuel_level_percent)
      : null,
    fuelLiters: v.fuel_level
      ? Number(
          finiteNumberOrFallback(v.fuel_level.fuel_level_liters).toFixed(1),
        )
      : null,
    online,
    location: null,
    lat,
    lng,
    status,
  };
}

const BAND_LABEL: Record<string, string> = {
  "0-20": "0 – 20%",
  "20-40": "20 – 40%",
  "40-60": "40 – 60%",
  "60-80": "60 – 80%",
  "80-100": "80 – 100%",
};
const BAND_COLOR: Record<string, string> = {
  "0-20": "#ef4444",
  "20-40": "#3b82f6",
  "40-60": "#60a5fa",
  "60-80": "#f59e0b",
  "80-100": "#10b981",
};

function appendNoReadingBand(
  bands: DistributionBand[],
  totalVehicles: number,
): DistributionBand[] {
  const total = Math.max(0, totalVehicles);
  const bucketed = bands.reduce((sum, band) => sum + band.count, 0);
  const noReadingCount = Math.max(0, total - bucketed);

  if (noReadingCount === 0) return bands;

  return [
    ...bands,
    {
      key: "no-reading",
      label: "No reading",
      color: "#94a3b8",
      count: noReadingCount,
      percent:
        total > 0 ? Number(((noReadingCount / total) * 100).toFixed(1)) : 0,
    },
  ];
}

/** Applies Overview-only vehicle filters to the /vehicles?has_fuel=true rows. */
function vehicleMatchesFilter(vehicle: VehicleRow, filter?: string): boolean {
  switch (filter) {
    case "moving":
      return vehicle.status === "moving";
    case "offline":
      return vehicle.status === "offline";
    case "low_fuel":
      return vehicle.fuelPercent != null && vehicle.fuelPercent <= 20;
    case "unknown_fuel":
      return vehicle.fuelPercent == null;
    default:
      return true;
  }
}

export function useFuelOverview(
  range: FuelOverviewRange,
  filters: FuelOverviewFilters = {},
) {
  const params = { start_date: range.startDate, end_date: range.endDate };
  const vehicleParams = {
    per_page: 200,
    q: filters.vehicleSearch?.trim() || undefined,
  };
  const topConsumersParams = {
    filter: filters.topConsumersFilter,
  };

  // Total Fuel Used → consumption-report.
  const consumptionQuery = useQuery({
    queryKey: ["fuel-overview", "consumption-report"],
    queryFn: () => getFuelConsumptionReport(),
  });

  // Total Fuel Cost → cost-report (sum of monthly totals).
  const costReportQuery = useQuery({
    queryKey: ["fuel-overview", "cost-report"],
    queryFn: () => getFuelCostReport(),
  });

  // Avg Fuel Efficiency → efficiency-report fleet_average.
  const efficiencyQuery = useQuery({
    queryKey: ["fuel-overview", "efficiency-report"],
    queryFn: () => getFuelEfficiencyReport(),
  });

  const totalFuelVehiclesQuery = useQuery({
    queryKey: ["fuel-overview", "fuel-vehicles-count"],
    queryFn: () => getFuelVehiclesRealtime({ page: 1, per_page: 1 }),
  });

  const vehiclesQuery = useQuery({
    queryKey: ["fuel-overview", "vehicles", vehicleParams],
    queryFn: () => getFuelVehiclesRealtime(vehicleParams),
  });

  const distributionQuery = useQuery({
    queryKey: ["fuel-overview", "distribution"],
    queryFn: () => getFuelDistribution(),
  });

  const topConsumersQuery = useQuery({
    queryKey: ["fuel-overview", "top-consumers", topConsumersParams],
    queryFn: () => getTopFuelConsumers(topConsumersParams),
  });

  const theftQuery = useQuery({
    queryKey: ["fuel-overview", "theft-summary", params],
    queryFn: () => getTheftSummary(params),
  });

  const vehicles = useMemo<VehicleRow[]>(() => {
    const search = filters.vehicleSearch?.trim().toLowerCase();
    return (vehiclesQuery.data?.data.vehicles ?? [])
      .map(mapVehicleRow)
      .filter((vehicle) => vehicleMatchesFilter(vehicle, filters.vehicleFilter))
      .filter((vehicle) => {
        if (!search) return true;
        return `${vehicle.registration} ${vehicle.model} ${vehicle.chassis}`
          .toLowerCase()
          .includes(search);
      });
  }, [filters.vehicleFilter, filters.vehicleSearch, vehiclesQuery.data]);

  const theft = theftQuery.data?.data;
  const consumption = consumptionQuery.data?.data;
  const costReport = costReportQuery.data?.data;
  const efficiency = efficiencyQuery.data?.data;
  const totalFuelVehicles =
    paginationTotal(totalFuelVehiclesQuery.data?.data.pagination.total) ??
    paginationTotal(distributionQuery.data?.data.total_vehicles) ??
    vehicles.length;

  const kpi = useMemo<KpiViewModel>(() => {
    const totalCost = (costReport?.months ?? []).reduce(
      (s, m) => s + (m.total_cost ?? 0),
      0,
    );
    const totalVolume = finiteNumberOrFallback(consumption?.total_fuel_liters);
    return {
      totalFuelUsedLiters: Number(totalVolume.toFixed(2)),
      totalFuelCostNaira: totalCost,
      avgEfficiencyKmPerL: efficiency?.fleet_average ?? 0,
      totalRefills: (topConsumersQuery.data?.data.vehicles ?? []).reduce(
        (s, v) => s + (v.segment_count ?? 0),
        0,
      ),
      totalVehicles: totalFuelVehicles,
    };
  }, [
    consumption,
    costReport,
    efficiency,
    topConsumersQuery.data,
    totalFuelVehicles,
  ]);

  const distribution = useMemo<DistributionBand[]>(() => {
    const layers = distributionQuery.data?.data.layers;
    if (layers?.length) {
      const total =
        paginationTotal(distributionQuery.data?.data.total_vehicles) ??
        totalFuelVehicles;
      const bands = layers.map((l) => ({
        key: l.range,
        label: BAND_LABEL[l.range] ?? l.range,
        color: BAND_COLOR[l.range] ?? "#94a3b8",
        count: l.vehicle_count,
        percent: l.percentage,
      }));
      return appendNoReadingBand(bands, total);
    }
    // Fallback: derive from the live vehicle list until distribution loads.
    const total = vehicles.length || 1;
    const bands = FUEL_BANDS.map((band) => {
      const count = vehicles.filter(
        (v) =>
          v.fuelPercent != null &&
          v.fuelPercent >= band.min &&
          v.fuelPercent < band.max,
      ).length;
      return {
        key: band.key,
        label: band.label,
        color: band.color,
        count,
        percent: Number(((count / total) * 100).toFixed(1)),
      };
    });
    return appendNoReadingBand(bands, total);
  }, [distributionQuery.data, totalFuelVehicles, vehicles]);

  const lowFuelAlerts = useMemo<LowFuelAlert[]>(() => {
    // Prefer real theft/abnormality incidents that carry a location; supplement
    // with the lowest-fuel vehicles from the live list.
    const fromIncidents: LowFuelAlert[] = (theft?.incidents ?? [])
      .slice(0, 3)
      .map((i) => ({
        id: i.alert_id,
        registration: formatVehicleRegistration(i.registration_number),
        fuelPercent: Math.max(0, Math.round(100 - i.confidence * 100)),
        fuelLiters: Number(finiteNumberOrFallback(i.liters_lost).toFixed(1)),
        location: i.location?.address ?? "—",
        time: formatDateOrFallback(i.occurred_at, "hh:mm a"),
      }));
    if (fromIncidents.length >= 3) return fromIncidents;

    const lowest = vehicles
      .filter((v) => v.fuelPercent != null && v.fuelPercent <= 25)
      .sort((a, b) => (a.fuelPercent ?? 0) - (b.fuelPercent ?? 0))
      .slice(0, 3 - fromIncidents.length)
      .map<LowFuelAlert>((v) => ({
        id: v.id,
        registration: v.registration,
        fuelPercent: v.fuelPercent ?? 0,
        fuelLiters: v.fuelLiters ?? 0,
        location: "—",
        time: format(new Date(), "hh:mm a"),
      }));
    return [...fromIncidents, ...lowest];
  }, [theft, vehicles]);

  const topConsumers = useMemo<TopConsumer[]>(() => {
    // Cost per litre derived from cost-report (Σ cost / Σ litres) so the top-consumers
    // rows (which carry only litres) can show an approximate spend column.
    const months = costReport?.months ?? [];
    const totalCost = months.reduce((s, m) => s + (m.total_cost ?? 0), 0);
    const totalLiters = months.reduce((s, m) => s + (m.liters ?? 0), 0);
    const pricePerL = totalLiters > 0 ? totalCost / totalLiters : 0;

    const rows = (topConsumersQuery.data?.data.vehicles ?? [])
      .map((r) => ({
        id: r.vehicle_id,
        registration: formatVehicleRegistration(r.vehicle.registration_number),
        model: formatVehicleMakeModel(r.vehicle.make, r.vehicle.model),
        litersUsed: Number(
          finiteNumberOrFallback(r.fuel_used_liters).toFixed(2),
        ),
        costNaira: Number(
          (finiteNumberOrFallback(r.fuel_used_liters) * pricePerL).toFixed(2),
        ),
      }))
      .sort((a, b) => b.litersUsed - a.litersUsed)
      .slice(0, 5);
    const max = rows[0]?.litersUsed || 1;
    return rows.map((r) => ({ ...r, share: r.litersUsed / max }));
  }, [topConsumersQuery.data, costReport]);

  return {
    kpi,
    vehicles,
    distribution,
    lowFuelAlerts,
    topConsumers,
    isTopConsumersLoading: topConsumersQuery.isFetching,
    theftIncidents: theft?.incidents ?? [],
    isLoading: consumptionQuery.isLoading || vehiclesQuery.isLoading,
    isError:
      consumptionQuery.isError &&
      costReportQuery.isError &&
      vehiclesQuery.isError,
  };
}

// ── Trend charts (per-day series) ────────────────────────────────────────────

export interface TrendPoint {
  date: string; // 'May 1'
  value: number;
}

/**
 * Consumption day series for the overview trend chart.
 */
export interface FuelTrendFilters {
  consumptionPeriod?: string;
  efficiencyFilter?: string;
}

export function useFuelTrends(
  _range: FuelOverviewRange,
  filters: FuelTrendFilters = {},
) {
  void _range;

  const consumptionParams = {
    filter: filters.consumptionPeriod,
  };
  const efficiencyParams = {
    filter: filters.efficiencyFilter,
  };

  const consumptionQuery = useQuery({
    queryKey: ["fuel-overview", "consumption-report", consumptionParams],
    queryFn: () => getFuelConsumptionReport(consumptionParams),
  });
  const efficiencyGraphQuery = useQuery({
    queryKey: ["fuel-overview", "efficiency-graph", efficiencyParams],
    queryFn: () => getFuelEfficiencyGraph(efficiencyParams),
  });

  return useMemo(() => {
    const consumption: TrendPoint[] = (
      consumptionQuery.data?.data.trend ?? []
    ).map((t) => ({
      date: formatDateOrFallback(t.period, "MMM d"),
      value: Number(finiteNumberOrFallback(t.total_fuel_liters).toFixed(1)),
    }));
    const g = efficiencyGraphQuery.data?.data;
    const efficiency: TrendPoint[] = (g?.labels ?? []).map((label, i) => ({
      date: label,
      value: Number(finiteNumberOrFallback(g?.efficiency_data?.[i]).toFixed(2)),
    }));
    return {
      consumption,
      efficiency,
      isConsumptionLoading: consumptionQuery.isFetching,
      isEfficiencyLoading: efficiencyGraphQuery.isFetching,
    };
  }, [
    consumptionQuery.data,
    consumptionQuery.isFetching,
    efficiencyGraphQuery.data,
    efficiencyGraphQuery.isFetching,
  ]);
}
