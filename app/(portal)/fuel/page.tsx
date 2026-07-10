"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { QueryError } from "@/components/shared/QueryError";
import { OverviewHeader } from "./components/OverviewHeader";
import { KpiSection } from "./components/KpiSection";
import { RealtimeTrackingCard } from "./components/RealtimeTrackingCard";
import { VehicleListCard } from "./components/VehicleListCard";
import { FuelDistributionCard } from "./components/FuelDistributionCard";
import { LowFuelAlertsCard } from "./components/LowFuelAlertsCard";
import { TrendChartCard } from "./components/TrendChartCard";
import { TopConsumersCard } from "./components/TopConsumersCard";
import {
  useFuelOverview,
  useFuelTrends,
  type FuelOverviewRange,
} from "./components/useFuelOverview";
import type {
  MapMarkerPoint,
  FeaturedVehicle,
} from "./components/FuelTrackingMap";
import type { VehicleFilter } from "./components/VehicleListCard";
import type { TopConsumersFilter } from "./components/TopConsumersCard";
import type { TrendFilterOption } from "./components/TrendChartCard";

type TrendApiFilter = "7d" | "30d" | "90d" | "1y";
type EfficiencyApiFilter = "daily" | "monthly" | "yearly";

const CONSUMPTION_FILTER_OPTIONS: TrendFilterOption[] = [
  { label: "Last 7", value: "7d" },
  { label: "Last 30", value: "30d" },
  { label: "Last 90", value: "90d" },
  { label: "This Year", value: "1y" },
];

const EFFICIENCY_FILTER_OPTIONS: TrendFilterOption[] = [
  { label: "Daily", value: "daily" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

/** Default the range to the current month. */
function defaultRange(): FuelOverviewRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export default function FuelOverviewPage() {
  const [range] = useState<FuelOverviewRange>(defaultRange);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>("all");
  const [consumptionFilter, setConsumptionFilter] =
    useState<TrendApiFilter>("30d");
  const [efficiencyFilter, setEfficiencyFilter] =
    useState<EfficiencyApiFilter>("daily");
  const [topConsumersFilter, setTopConsumersFilter] =
    useState<TopConsumersFilter>("daily");

  const {
    kpi,
    vehicles,
    distribution,
    lowFuelAlerts,
    topConsumers,
    theftIncidents,
    isLoading,
    isError,
  } = useFuelOverview(range, {
    vehicleSearch,
    vehicleFilter,
    topConsumersFilter,
  });
  const trends = useFuelTrends(range, {
    consumptionPeriod: consumptionFilter,
    efficiencyFilter,
  });

  // Map markers come from theft/abnormality incidents that carry coordinates.
  const markers = useMemo<MapMarkerPoint[]>(
    () =>
      theftIncidents
        .filter((i) => i.location?.lat != null && i.location?.lng != null)
        .map((i) => ({
          id: i.alert_id,
          lat: i.location.lat,
          lng: i.location.lng,
        })),
    [theftIncidents],
  );

  // Feature the highest-fuel online vehicle in the overlay card.
  const featured = useMemo<FeaturedVehicle | null>(() => {
    const candidate =
      vehicles.find((v) => v.online && v.fuelPercent != null) ??
      vehicles.find((v) => v.fuelPercent != null) ??
      vehicles[0];
    if (!candidate) return null;
    return {
      registration: candidate.registration,
      status: candidate.online ? "Moving" : "Parked",
      fuelPercent: candidate.fuelPercent,
      fuelLiters: candidate.fuelLiters,
      consumptionLph: 3.2,
      location: "—",
      lastUpdated: format(new Date(), "hh:mm a"),
    };
  }, [vehicles]);

  return (
    <div className="space-y-6">
      <OverviewHeader />

      {isError ? (
        <QueryError message="Failed to load fuel overview." />
      ) : (
        <>
          {/* KPI summary */}
          <KpiSection kpi={kpi} isLoading={isLoading} />

          {/* Main dashboard — responsive: 1col (mobile) → 2col (md) → 12col (lg) */}
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-12">
            <div className="md:col-span-2 lg:col-span-5">
              <RealtimeTrackingCard
                markers={markers}
                featured={featured}
                vehicles={vehicles}
              />
            </div>
            <div className="md:col-span-1 lg:col-span-4">
              <VehicleListCard
                vehicles={vehicles}
                isLoading={isLoading}
                search={vehicleSearch}
                filter={vehicleFilter}
                onSearchChange={setVehicleSearch}
                onFilterChange={setVehicleFilter}
              />
            </div>
            <div className="flex flex-col gap-3 md:col-span-1 lg:col-span-3">
              <FuelDistributionCard
                bands={distribution}
                total={kpi.totalVehicles}
              />
              <LowFuelAlertsCard alerts={lowFuelAlerts} className="flex-1" />
            </div>
          </div>

          {/* Analytics: consumption / efficiency / top consumers */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TrendChartCard
              title="Fuel Consumption Trend"
              data={trends.consumption}
              color="#3b82f6"
              formatValue={(v) => `${v.toLocaleString()} L`}
              filter={consumptionFilter}
              filterOptions={CONSUMPTION_FILTER_OPTIONS}
              onFilterChange={(filter) =>
                setConsumptionFilter(filter as TrendApiFilter)
              }
            />
            <TrendChartCard
              title="Fuel Efficiency (km/L)"
              data={trends.efficiency}
              color="#8b5cf6"
              formatValue={(v) => `${v} km/L`}
              filter={efficiencyFilter}
              filterOptions={EFFICIENCY_FILTER_OPTIONS}
              onFilterChange={(filter) =>
                setEfficiencyFilter(filter as EfficiencyApiFilter)
              }
            />
            <TopConsumersCard
              consumers={topConsumers}
              filter={topConsumersFilter}
              onFilterChange={setTopConsumersFilter}
            />
          </div>

          {/* Bottom summary metrics */}
          {/* <SummaryMetrics data={summary} /> */}
        </>
      )}
    </div>
  );
}
