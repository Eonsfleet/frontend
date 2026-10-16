"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { VehicleStatusChart } from "@/components/dashboard/VehicleStatusChart";
import { DashboardMap } from "@/components/dashboard/DashboardMap";
import {
  ActivityFeed,
  type ActivityItem,
} from "@/components/dashboard/ActivityFeed";
import { AlertsPanel, AlertItem } from "@/components/dashboard/AlertsPanel";
import {
  MaintenanceHeatmap,
  MaintenanceDay,
} from "@/components/dashboard/MaintenanceHeatmap";
import { FleetOverviewModal } from "@/components/dashboard/FleetOverviewModal";
import { ClusterDistributionChart, ClusterDistribution } from "@/components/dashboard/ClusterDistributionChart";
import { Car, Route, AlertTriangle, Zap } from "lucide-react";
import { parseISO, format } from "date-fns";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  REFETCH_INTERVAL_MAP,
  PAGE_SIZE_DROPDOWN,
  STALE_TIME_REALTIME,
} from "@/lib/config";
import * as dashboardApi from "@/lib/api/dashboard";
import * as trackingApi from "@/lib/api/tracking";
import * as vehicleApi from "@/lib/api/vehicles";
import * as analyticsApi from "@/lib/api/analytics";
import { useAuthStore } from "@/store/authStore";
import { useClusterFleetStats } from "@/hooks/useClusterFleetStats";

export default function DashboardPage() {
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const { token } = useAuthStore();

  const { data: alertsData } = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: () =>
      dashboardApi.getAlerts({ severity: "critical,warning", limit: 10 }),
    enabled: !!token,
  });

  const { data: forecastData } = useQuery({
    queryKey: ["dashboard-forecast"],
    queryFn: () => dashboardApi.getMaintenanceForecast({ days: 7 }),
    enabled: !!token,
  });

  const { data: metricsData } = useQuery({
    queryKey: ["tracking-metrics"],
    queryFn: () => trackingApi.getTrackingMetrics(),
    enabled: !!token,
    staleTime: STALE_TIME_REALTIME,
  });

  const { data: totalVehicleData } = useQuery({
    queryKey: ["dashboard-total-vehicles"],
    queryFn: () => dashboardApi.getVehicleStats(),
    enabled: !!token,
  });

  const { data: activeTripsData } = useQuery({
    queryKey: ["dashboard-active-trips"],
    queryFn: () => dashboardApi.getActiveTrips(),
    enabled: !!token,
  });

  const { data: efficiencyData } = useQuery({
    queryKey: ["dashboard-avg-efficiency"],
    queryFn: () => dashboardApi.getEfficiencyStats(),
    enabled: !!token,
  });

  const { data: incidentsData } = useQuery({
    queryKey: ["dashboard-recent-incidents"],
    queryFn: () => dashboardApi.getRecentIncidents(),
    enabled: !!token,
  });

  const { data: vehicleStatusData } = useQuery({
    queryKey: ["dashboard-vehicle-status"],
    queryFn: () => dashboardApi.getVehicleStatus(),
    enabled: !!token,
  });

  const { data: activityLogsData } = useQuery({
    queryKey: ["dashboard-activity-logs"],
    queryFn: () => dashboardApi.getActivityLogs(),
    enabled: !!token,
  });

  const { data: dashboardVehicles } = useQuery({
    queryKey: ["dashboard-vehicles-map"],
    queryFn: () => vehicleApi.getVehicles({ per_page: PAGE_SIZE_DROPDOWN }),
    enabled: !!token,
    staleTime: STALE_TIME_REALTIME,
    refetchInterval: REFETCH_INTERVAL_MAP,
  });

  // Shared with /analytics and /analytics/gps via the same query key — device
  // connectivity counts come straight from the backend's own tally instead of
  // being derived from a (page-capped) vehicle list.
  const { data: deviceStatus } = useQuery({
    queryKey: ["gps-device-status"],
    queryFn: () => analyticsApi.getDeviceStatusSummary(),
    enabled: !!token,
    staleTime: STALE_TIME_REALTIME,
    refetchInterval: REFETCH_INTERVAL_MAP,
  });

  // Per-cluster stats — shared with the Clusters module via the same React
  // Query key, so navigating between /dashboard and /clusters reuses one
  // fetch. Counts come straight from each cluster's own record (backend-
  // computed), so this never waits on a vehicle fetch.
  const { clusters: clusterStats, isLoading: isClusterStatsLoading } = useClusterFleetStats(!!token);

  // Normalize Activity Logs
  const normalizedActivities = useMemo(() => {
    const logs: any[] = Array.isArray(activityLogsData?.data)
      ? activityLogsData.data
      : [];

    const resourceTypeMap: Record<string, ActivityItem["type"]> = {
      incident: "incident",
      maintenancejob: "maintenance",
      maintenance: "maintenance",
      vehicle: "system",
      trip: "system",
      device: "system",
      user: "system",
      geofence: "system",
    };

    return logs.map((log: any) => {
      const activityType =
        resourceTypeMap[log.resource_type?.toLowerCase().replace(/\s/g, "")] ??
        "system";
      const actor = log.changed_by?.name ?? "System";

      // Build a human-readable description of what changed
      let description = `By ${actor}`;
      if (log.changes && Object.keys(log.changes).length > 0) {
        const fields = Object.entries(log.changes)
          .slice(0, 2)
          .map(
            ([field, val]: [string, any]) =>
              `${field.replace(/_/g, " ")}: ${val.from} → ${val.to}`,
          )
          .join(" • ");
        description = `${actor} — ${fields}${Object.keys(log.changes).length > 2 ? " …" : ""}`;
      }

      return {
        id: String(log.id),
        title: log.description,
        description,
        timestamp: log.changed_at,
        type: activityType,
        status:
          log.action === "created"
            ? ("completed" as const)
            : log.action === "updated"
              ? ("in_progress" as const)
              : log.action === "deleted"
                ? ("resolved" as const)
                : undefined,
      };
    });
  }, [activityLogsData]);

  const metrics = metricsData?.data || {
    total_active_assets: 0,
    moving_assets: 0,
    idle_assets: 0,
    offline_assets: 0,
  };
  const totalVehicles = totalVehicleData?.total || metrics.total_active_assets;
  const activeTripsCount = activeTripsData?.count || metrics.moving_assets || 0;
  const avgEfficiency = efficiencyData?.efficiency || "0%";
  const recentIncidentsCount = incidentsData?.count || "0";

  // Connectivity summary — sourced directly from GET /analytics/gps/device-status,
  // the backend's own device-connectivity tally, rather than derived from a vehicle list.
  const dynamicDeviceStatusData = useMemo(() => {
    const online = deviceStatus?.online ?? 0;
    const offline = deviceStatus?.offline ?? 0;
    return [
      { name: "Online", value: online, color: "#10b981" },
      { name: "Offline", value: offline, color: "#ef4444" },
    ];
  }, [deviceStatus]);

  const dynamicVehicleStats = [
    { label: "Active", value: metrics.moving_assets, color: "bg-emerald-500" },
    { label: "Idle", value: metrics.idle_assets, color: "bg-amber-500" },
    { label: "Offline", value: metrics.offline_assets, color: "bg-rose-500" },
    {
      label: "Maint.",
      value:
        metrics.total_active_assets -
        (metrics.moving_assets + metrics.idle_assets + metrics.offline_assets),
      color: "bg-blue-500",
    },
  ];

  const STATUS_COLORS: Record<string, string> = {
    active: "#10b981",
    available: "#10b981",
    in_transit: "#3b82f6",
    under_maintenance: "#f59e0b",
    maintenance: "#f59e0b",
    disbursed: "#8b5cf6",
    inactive: "#6b7280",
    offline: "#ef4444",
    stopped: "#ef4444",
    parked: "#ef4444",
  };

  const dynamicStatusData = useMemo(() => {
    const distribution = vehicleStatusData?.distribution || [];
    return distribution.map(
      (item: { status: string; count: number; percentage: number }) => ({
        name: (item.status || "Unknown")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase()),
        value: item.count,
        color: STATUS_COLORS[item.status] ?? "#94a3b8",
      }),
    );
  }, [vehicleStatusData]);

  // Per-cluster asset distribution — sourced directly from the shared
  // useClusterFleetStats hook (same computation the Clusters module uses),
  // so cluster totals can never disagree between Dashboard and /clusters.
  const clusterDistribution: ClusterDistribution[] = useMemo(
    () => clusterStats.map((c) => ({ name: c.name, total: c.total, online: c.online, offline: c.offline })),
    [clusterStats],
  );
  const isClusterCountPending = isClusterStatsLoading;

  // Normalize Alerts Data
  const normalizedAlerts: AlertItem[] = useMemo(() => {
    const alerts = alertsData?.alerts || [];
    return alerts.map((alert: any) => {
      const meta = alert.meta || {};

      let description = alert.description;
      if (
        alert.type === "fuel_alert" &&
        meta.previous_level != null &&
        meta.current_level != null
      ) {
        description = `${alert.description} — ${meta.previous_level}L → ${meta.current_level}L (−${meta.difference}L)`;
      } else if (alert.type === "incident" && meta.status) {
        description = `${alert.description} • Priority: ${meta.priority ?? "N/A"} • Status: ${meta.status}`;
      } else if (alert.type === "maintenance_alert" && meta.alert_type) {
        description = `${alert.description} • Trigger: ${meta.alert_type} (${meta.threshold_type})`;
      }

      const actionMap: Record<string, string> = {
        fuel_alert: "/fuel",
        incident: "/incidents",
        maintenance_alert: "/maintenance",
      };
      const href = actionMap[alert.type];

      return {
        id: String(alert.id),
        severity: (alert.severity === "informational"
          ? "info"
          : alert.severity) as any,
        title: `${alert.vehicle_registration} — ${alert.title}`,
        description,
        timestamp: format(parseISO(alert.created_at), "hh:mm a"),
        location: meta.geofence_name || alert.vehicle_registration,
        actions: href
          ? [
              {
                label: "View Details",
                onClick: () => {
                  window.location.href = href;
                },
                variant: "outline" as const,
              },
            ]
          : undefined,
      };
    });
  }, [alertsData]);

  // Normalize Maintenance Data
  const normalizedForecast: MaintenanceDay[] = useMemo(() => {
    if (!forecastData?.data?.forecast) return [];
    return forecastData.data.forecast.map((day: any) => ({
      date: parseISO(day.date),
      count: day.count,
      vehicles: day.schedules.map((s: any) => ({
        id: String(s.id),
        reg: s.vehicle_registration,
        service: s.service_type,
      })),
    }));
  }, [forecastData]);

  const normalizedMapLocations = useMemo(() => {
    const vehicles = dashboardVehicles?.data || [];
    return vehicles
      .map((v: any) => {
        const loc = v.relationships?.current_location;
        if (!loc) return null;
        // New API: lat/lng are flat on current_location (no .attributes wrapper)
        const lat = parseFloat(String(loc.latitude ?? 0));
        const lng = parseFloat(String(loc.longitude ?? 0));
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

        const isOnline = v.attributes?.is_online ?? false;
        const vehicleStatus = (v.attributes?.status || "").toLowerCase();

        let status: string;
        if (!isOnline) {
          status = "offline";
        } else if ((loc.speed ?? 0) > 0 || vehicleStatus === "in_transit") {
          status = "in_transit";
        } else if (vehicleStatus === "under_maintenance") {
          status = "parked";
        } else {
          status = "idle";
        }

        return {
          id: String(v.id),
          name:
            v.attributes?.registration_number ||
            v.attributes?.display_number ||
            "Vehicle",
          lat,
          lng,
          status,
          speed: loc.speed ?? 0,
          heading: null,
          address: null,
        };
      })
      .filter(Boolean);
  }, [dashboardVehicles]);

  return (
    <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
            Dashboard
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Intelligent Operations Hub • Real-time Monitoring
          </p>
        </div>
      </div>

      {/* KPI Cards — Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Vehicles"
          value={String(totalVehicles)}
          icon={Car}
          trend={{
            value: Number(totalVehicleData?.change_percent) || 0,
            label: "vs last month",
            isPositive: true,
          }}
        />
        <StatCard
          title="Active Trips"
          value={String(activeTripsCount)}
          icon={Route}
          trend={{
            value: Number(activeTripsData?.change_percent) || 0,
            label: "vs yesterday",
            isPositive: true,
          }}
        />
        <StatCard
          title="Recent Incidents"
          value={String(recentIncidentsCount)}
          icon={AlertTriangle}
          trend={{
            value: Number(incidentsData?.change_percent) || 0,
            label: "vs last week",
            isPositive: false,
          }}
        />
        <StatCard
          title="Avg Efficiency"
          value={String(avgEfficiency)}
          icon={Zap}
          trend={{
            value: Number(efficiencyData?.change_percent) || 0,
            label: "vs last week",
            isPositive: true,
          }}
        />
      </div>

      {/* Row 2: operational status overview — vehicle status + cluster distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-105">
        <div className="h-105 lg:h-full">
          <VehicleStatusChart data={dynamicStatusData} />
        </div>
        <div className="lg:col-span-2 h-105 lg:h-full">
          <ClusterDistributionChart data={clusterDistribution} height={280} isCountPending={isClusterCountPending} />
        </div>
      </div>

      {/* Row 3: maintenance forecast, live alerts, device connectivity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-100">
        {/* <DashboardMap locations={normalizedMapLocations} /> */}
        <div className="h-100 lg:h-full">
          <MaintenanceHeatmap data={normalizedForecast} />
        </div>
        {/* <ActivityFeed activities={normalizedActivities} />   */}
        <div className="h-100 lg:h-full">
          <AlertsPanel alerts={normalizedAlerts} />
        </div>
        <div className="h-100 lg:h-full">
          <VehicleStatusChart
            data={dynamicDeviceStatusData}
            title="Device Status"
            description="GPS tracker heartbeat monitoring"
            showSummary
          />
        </div>
      </div>

      <FleetOverviewModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
      />
    </div>
  );
}
