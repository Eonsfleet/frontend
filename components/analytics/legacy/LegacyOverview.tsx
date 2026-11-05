"use client";

import { ReportBuilderWizard } from "@/components/analytics/ReportBuilderWizard";
import {
  AnalyticsFilterBar,
  useAnalyticsFilter,
} from "@/components/analytics/AnalyticsFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Route,
  Truck,
  Fuel,
  AlertTriangle,
  ShieldCheck,
  Zap,
  WifiOff,
  Wifi,
  Activity,
  Wrench,
} from "lucide-react";
import { useState, useMemo, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import * as analyticsApi from "@/lib/api/analytics";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const DEVICE_COLORS = ["#10b981", "#ef4444", "#f59e0b"];

function OverviewInner() {
  const searchParams = useSearchParams();
  const filter = (searchParams.get("filter") ?? "30d") as
    | "7d"
    | "30d"
    | "90d"
    | "1y";
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // ── KPI data ────────────────────────────────────────────────────────────────
  const { data: gpsSummary } = useQuery({
    queryKey: ["analytics-gps-trip-summary", filter],
    queryFn: () => analyticsApi.getGpsTripSummary({ filter }),
  });

  const { data: availabilitySnapshot } = useQuery({
    queryKey: ["analytics-availability-snapshot"],
    queryFn: () => analyticsApi.getFleetAvailabilitySnapshot(),
  });

  const { data: fuelKpis } = useQuery({
    queryKey: ["analytics-fuel-kpis", filter],
    queryFn: () => analyticsApi.getFuelExecutiveKpis({ filter }),
  });

  const { data: incidentSummary } = useQuery({
    queryKey: ["analytics-incident-summary"],
    queryFn: () => analyticsApi.getIncidentSummary(),
  });

  // ── Fleet Health + Anomalies ─────────────────────────────────────────────
  const { data: fleetHealthScore } = useQuery({
    queryKey: ["analytics-fleet-health-score"],
    queryFn: () => analyticsApi.getFleetHealthScore(),
  });

  const { data: anomalies } = useQuery({
    queryKey: ["analytics-anomalies"],
    queryFn: () => analyticsApi.detectAnomalies({ days: 30 }),
  });

  // ── Distance trend + Device status ───────────────────────────────────────
  const { data: tripsOverTime } = useQuery({
    queryKey: ["analytics-trips-over-time", filter],
    queryFn: () => analyticsApi.getGpsTripsOverTime({ filter }),
  });

  const { data: deviceStatus } = useQuery({
    queryKey: ["analytics-device-status"],
    queryFn: () => analyticsApi.getDeviceStatusSummary(),
  });

  // ── Top vehicles + Predictive maintenance ────────────────────────────────
  const { data: topVehicles } = useQuery({
    queryKey: ["analytics-top-vehicles", filter],
    queryFn: () => analyticsApi.getFleetTopVehicles({ limit: 5, filter }),
  });

  const { data: predictive } = useQuery({
    queryKey: ["analytics-predictive-maintenance"],
    queryFn: () => analyticsApi.getPredictiveMaintenance(),
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const totalDistance =
    gpsSummary?.total_distance_km ?? gpsSummary?.total_km ?? null;
  const totalTrips = gpsSummary?.total_trips ?? null;
  const activeVehicles =
    availabilitySnapshot?.active_vehicles ??
    availabilitySnapshot?.available ??
    null;
  const totalVehicles =
    availabilitySnapshot?.total_vehicles ?? availabilitySnapshot?.total ?? null;
  const fuelCostThisMonth = fuelKpis?.total_fuel_cost_this_month ?? null;
  const fuelCostChange = fuelKpis?.cost_vs_last_month_percent ?? null;
  const totalIncidents =
    incidentSummary?.total_incidents ?? incidentSummary?.total ?? null;
  const openIncidents =
    incidentSummary?.open_incidents ?? incidentSummary?.open ?? null;

  const healthScore = fleetHealthScore?.score ?? null;
  const healthRating = fleetHealthScore?.rating ?? null;

  const anomalyList: any[] = useMemo(() => {
    if (!anomalies) return [];
    return anomalies?.anomalies ?? anomalies?.data ?? anomalies ?? [];
  }, [anomalies]);

  const distanceTrendData = useMemo(() => {
    const trend = tripsOverTime?.trend ?? tripsOverTime?.data ?? [];
    if (!Array.isArray(trend) || !trend.length) return [];
    return trend.map((item: any) => {
      let name = item.period_label;
      if (!name && item.period) {
        try {
          name = format(new Date(item.period), "MMM d");
        } catch {
          name = item.period;
        }
      }
      return {
        name: name ?? "—",
        trips: item.total_trips ?? item.trips ?? 0,
        distance: item.total_distance_km ?? item.distance_km ?? 0,
      };
    });
  }, [tripsOverTime]);

  const deviceDonut = useMemo(() => {
    if (!deviceStatus) return [];
    const online = deviceStatus.online ?? deviceStatus.active ?? 0;
    const offline = deviceStatus.offline ?? deviceStatus.inactive ?? 0;
    const stale = deviceStatus.stale ?? deviceStatus.idle ?? 0;
    return [
      { name: "Online", value: online },
      { name: "Offline", value: offline },
      { name: "Stale", value: stale },
    ].filter((d) => d.value > 0);
  }, [deviceStatus]);

  const topVehiclesList: any[] = useMemo(() => {
    return topVehicles?.vehicles ?? topVehicles?.data ?? topVehicles ?? [];
  }, [topVehicles]);

  const upcomingMaintenance: any[] = useMemo(() => {
    return (
      predictive?.vehicles ??
      predictive?.predictions ??
      predictive?.data ??
      predictive ??
      []
    );
  }, [predictive]);

  return (
    <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
            Analytics <span className="text-blue-600">Overview</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Self-Service Insights • Predictive Intelligence
          </p>
        </div>
        {/* <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Create Report
                </button> */}
      </div>

      {/* Filter bar */}
      <AnalyticsFilterBar />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Distance */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total Distance
              </p>
              <Route className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 italic">
              {totalDistance != null
                ? `${Number(totalDistance).toLocaleString()} km`
                : "—"}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
              {totalTrips != null
                ? `${Number(totalTrips).toLocaleString()} trips`
                : "GPS tracked distance"}
            </p>
          </CardContent>
        </Card>

        {/* Active Vehicles */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Active Vehicles
              </p>
              <Truck className="h-4 w-4 text-indigo-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 italic">
              {activeVehicles != null ? activeVehicles : "—"}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
              {totalVehicles != null
                ? `of ${totalVehicles} total fleet`
                : "Fleet deployment"}
            </p>
            {activeVehicles != null && totalVehicles != null && (
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{
                    width: `${Math.round((activeVehicles / totalVehicles) * 100)}%`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fuel Spend */}
        <Card className="border-none shadow-sm bg-blue-600 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">
                Fuel Spend
              </p>
              <Fuel className="h-4 w-4 text-blue-200" />
            </div>
            <h3 className="text-3xl font-black text-white italic">
              {fuelCostThisMonth != null
                ? `₦${Number(fuelCostThisMonth).toLocaleString()}`
                : "—"}
            </h3>
            {fuelCostChange != null && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-1",
                  fuelCostChange <= 0 ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {fuelCostChange <= 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                <span className="text-[10px] font-bold uppercase">
                  {Math.abs(fuelCostChange).toFixed(1)}% vs last month
                </span>
              </div>
            )}
            <p className="text-[10px] text-blue-200 font-bold uppercase mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        {/* Incidents */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Incidents
              </p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 italic">
              {totalIncidents != null ? totalIncidents : "—"}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
              {openIncidents != null
                ? `${openIncidents} open / unresolved`
                : "Total recorded incidents"}
            </p>
            {openIncidents != null && openIncidents > 0 && (
              <p className="text-[10px] text-amber-600 font-bold uppercase mt-0.5">
                Needs attention
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fleet Health + Anomaly Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fleet Health Score */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Fleet Health Score
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            {healthScore != null ? (
              <>
                {/* Gauge-style display */}
                <div className="relative flex items-center justify-center w-36 h-36">
                  <svg
                    viewBox="0 0 120 120"
                    className="w-full h-full -rotate-90"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke={
                        healthScore >= 80
                          ? "#10b981"
                          : healthScore >= 60
                            ? "#f59e0b"
                            : "#ef4444"
                      }
                      strokeWidth="10"
                      strokeDasharray={`${(healthScore / 100) * 301.6} 301.6`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-3xl font-black text-slate-900">
                      {healthScore}
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      / 100
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      "text-sm font-black uppercase tracking-widest",
                      healthScore >= 80
                        ? "text-emerald-600"
                        : healthScore >= 60
                          ? "text-amber-600"
                          : "text-rose-600",
                    )}
                  >
                    {healthRating ??
                      (healthScore >= 80
                        ? "Good"
                        : healthScore >= 60
                          ? "Fair"
                          : "Critical")}
                  </p>
                </div>
                {fleetHealthScore?.components && (
                  <div className="w-full grid grid-cols-2 gap-2 text-center">
                    {Object.entries(fleetHealthScore.components).map(
                      ([key, val]) => (
                        <div key={key} className="bg-slate-50 rounded-xl p-2">
                          <p className="text-base font-black text-slate-900">
                            {String(val)}%
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {key.replace(/_/g, " ")}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                No data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anomaly / Insight Alerts */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest">
                AI Anomaly Alerts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {anomalyList.length > 0 ? (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {anomalyList.slice(0, 10).map((item: any, i: number) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border text-xs",
                      item.severity === "high" || item.type === "critical"
                        ? "border-rose-200 bg-rose-50"
                        : item.severity === "medium"
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-100 bg-slate-50",
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        "h-3.5 w-3.5 mt-0.5 shrink-0",
                        item.severity === "high"
                          ? "text-rose-500"
                          : item.severity === "medium"
                            ? "text-amber-500"
                            : "text-slate-400",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">
                        {item.description ??
                          item.message ??
                          item.type ??
                          "Anomaly detected"}
                      </p>
                      {item.vehicle_registration && (
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {item.vehicle_registration}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-center">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-bold text-emerald-600">
                  No anomalies detected
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Fleet operating normally
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distance Trend + Device Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distance / Trips Trend */}
        <Card className="border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Distance & Trips Trend
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pr-4">
            {distanceTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={distanceTrendData}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                    formatter={(val: any, name: any) => [
                      name === "distance"
                        ? `${Number(val).toLocaleString()} km`
                        : val,
                      name === "distance" ? "Distance" : "Trips",
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, fontWeight: 700 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="distance"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                    name="Distance (km)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="trips"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Trips"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
                No trend data
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPS Device Status */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Device Status
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center gap-3">
            {deviceDonut.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={deviceDonut}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                    >
                      {deviceDonut.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DEVICE_COLORS[i % DEVICE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5">
                  {deviceDonut.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.name === "Online" ? (
                          <Wifi className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <WifiOff
                            className="h-3 w-3"
                            style={{ color: DEVICE_COLORS[i] }}
                          />
                        )}
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                {deviceStatus?.total != null && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {deviceStatus.total} total devices
                  </p>
                )}
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                No device data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Vehicles + Upcoming Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Vehicles by Distance */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Top 5 Vehicles
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pr-4">
            {topVehiclesList.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={topVehiclesList.slice(0, 5).map((v: any) => ({
                    name:
                      v.registration_number ??
                      v.registration ??
                      v.plate ??
                      v.name ??
                      "—",
                    distance:
                      v.total_distance_km ?? v.distance_km ?? v.trips ?? 0,
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                    formatter={(val: any) => [
                      `${Number(val).toLocaleString()} km`,
                      "Distance",
                    ]}
                  />
                  <Bar
                    dataKey="distance"
                    fill="#4f46e5"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                No data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Maintenance */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Upcoming Maintenance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingMaintenance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Vehicle
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Service
                      </th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingMaintenance
                      .slice(0, 6)
                      .map((item: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-bold text-slate-800 uppercase">
                            {item.registration_number ??
                              item.vehicle ??
                              item.plate ??
                              "—"}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 font-medium">
                            {item.service_type ??
                              item.maintenance_type ??
                              item.type ??
                              "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={cn(
                                "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                item.urgency === "overdue" ||
                                  item.status === "overdue"
                                  ? "bg-rose-100 text-rose-700"
                                  : item.urgency === "due_soon" ||
                                      item.days_until_due <= 7
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600",
                              )}
                            >
                              {item.due_date &&
                              !isNaN(new Date(item.due_date).getTime())
                                ? format(new Date(item.due_date), "MMM d")
                                : item.days_until_due != null
                                  ? `${item.days_until_due}d`
                                  : (item.urgency ?? "—")}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-bold text-emerald-600">
                  All schedules up to date
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReportBuilderWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
}

/** The existing Overview, unchanged, kept beside the rebuild for comparison and rollback. */
export default function LegacyOverview() {
  return (
    <Suspense
      fallback={
        <div className="p-8 animate-pulse text-slate-400">
          Loading overview…
        </div>
      }
    >
      <OverviewInner />
    </Suspense>
  );
}
