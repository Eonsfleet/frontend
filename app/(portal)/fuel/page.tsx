"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  formatLastSeen,
  useFuelOverview,
  useFuelTrends,
  type FuelOverviewRange,
} from "./components/useFuelOverview";
import type { MapMarkerPoint } from "./components/FuelTrackingMap";
import type { VehicleFilter } from "./components/VehicleListCard";
import type { TopConsumersFilter } from "./components/TopConsumersCard";
import type { TrendFilterOption } from "./components/TrendChartCard";

type TrendApiFilter = "7d" | "30d" | "90d" | "1y";
type EfficiencyApiFilter = "daily" | "monthly" | "yearly";

const CONSUMPTION_FILTER_OPTIONS: TrendFilterOption[] = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
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
  const router = useRouter();
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
    vehiclesUpdatedAt,
    distribution,
    lowFuelAlerts,
    topConsumers,
    isTopConsumersLoading,
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

  // Map markers: fuel-capable vehicle positions from /vehicles?has_fuel=true,
  // plus abnormality incidents that carry coordinates.
  const markers = useMemo<MapMarkerPoint[]>(() => {
    const vehicleMarkers: MapMarkerPoint[] = vehicles
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => ({
        id: `vehicle-${v.id}`,
        lat: v.lat as number,
        lng: v.lng as number,
        fuelPercent: v.fuelPercent,
        vehicleId: v.id,
        featured: {
          registration: v.registration,
          status: v.status.charAt(0).toUpperCase() + v.status.slice(1),
          fuelPercent: v.fuelPercent,
          fuelLiters: v.fuelLiters,
          location: v.location ?? "—",
          lastUpdated: formatLastSeen(v.lastSeen),
        },
      }));
    const incidentMarkers: MapMarkerPoint[] = theftIncidents
      .filter((i) => i.location?.lat != null && i.location?.lng != null)
      .map((i) => ({
        id: `incident-${i.alert_id}`,
        lat: i.location.lat,
        lng: i.location.lng,
      }));
    return [...vehicleMarkers, ...incidentMarkers];
  }, [vehicles, theftIncidents]);

  return (
    <div className="space-y-6">
      <OverviewHeader />

      {isError ? (
        <QueryError message="Failed to load fuel overview." />
      ) : (
        <>
          {/* KPI summary */}
          <KpiSection kpi={kpi} isLoading={isLoading} />

          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-12">
            <div className="min-w-0 md:col-span-2 lg:col-span-12 xl:col-span-5">
              <RealtimeTrackingCard
                markers={markers}
                vehicles={vehicles}
                updatedAt={vehiclesUpdatedAt}
                onViewVehicle={(vehicleId) =>
                  router.push(`/vehicles/${vehicleId}`)
                }
              />
            </div>
            <div className="min-w-0 md:col-span-1 lg:col-span-7 xl:col-span-4">
              <VehicleListCard
                vehicles={vehicles}
                isLoading={isLoading}
                search={vehicleSearch}
                filter={vehicleFilter}
                onSearchChange={setVehicleSearch}
                onFilterChange={setVehicleFilter}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-3 md:col-span-1 lg:col-span-5 xl:col-span-3">
              <FuelDistributionCard
                bands={distribution}
                total={kpi.totalVehicles}
              />
              <LowFuelAlertsCard alerts={lowFuelAlerts} className="flex-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TrendChartCard
              title="Fuel Consumption Trend"
              data={trends.consumption}
              color="#3b82f6"
              formatValue={(v) => `${v.toLocaleString()} L`}
              filter={consumptionFilter}
              filterOptions={CONSUMPTION_FILTER_OPTIONS}
              isLoading={trends.isConsumptionLoading}
              onFilterChange={(filter) =>
                setConsumptionFilter(filter as TrendApiFilter)
              }
            />
            <TrendChartCard
              title="Fuel Efficiency (km/L)"
              data={trends.efficiency}
              color="#0055FF"
              formatValue={(v) => `${v} km/L`}
              filter={efficiencyFilter}
              filterOptions={EFFICIENCY_FILTER_OPTIONS}
              isLoading={trends.isEfficiencyLoading}
              onFilterChange={(filter) =>
                setEfficiencyFilter(filter as EfficiencyApiFilter)
              }
            />
            <TopConsumersCard
              consumers={topConsumers}
              filter={topConsumersFilter}
              onFilterChange={setTopConsumersFilter}
              isLoading={isTopConsumersLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
