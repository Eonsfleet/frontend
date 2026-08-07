"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Download,
  BarChart3,
  AlertOctagon,
  TrendingDown,
  MapPin,
  Car,
  DollarSign,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api/fuel";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

// ── 8.4.1 IFTA Report ────────────────────────────────────────────────────────

function IftaTab() {
  const currentYear = new Date().getFullYear();
  const [quarter, setQuarter] = useState("1");
  const [year, setYear] = useState(String(currentYear));
  const [generated, setGenerated] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fuel-ifta-report", { quarter, year }],
    queryFn: () => api.getIftaReport(Number(quarter), Number(year)),
    enabled: generated,
  });

  const handleGenerate = () => {
    setGenerated(true);
    refetch();
  };

  const report = data?.data;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">
                IFTA Compliance Report
              </CardTitle>
              <CardDescription>
                International Fuel Tax Agreement — quarterly fuel and distance
                summary by jurisdiction.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Quarter</p>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="w-32 h-9 bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct–Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Year</p>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-28 h-9 bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
            {report && (
              <Button variant="outline" size="sm" className="h-9 ml-auto">
                <Download className="mr-2 h-4 w-4" /> Export PDF
              </Button>
            )}
          </div>

          {/* Results */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}

          {report && !isLoading && (
            <div className="space-y-5">
              <div className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <strong className="text-blue-900">
                  Q{report.quarter} {report.year} Report.
                </strong>{" "}
                Distance source:{" "}
                <span className="capitalize">
                  {report.distance_source?.replace(/_/g, " ")}
                </span>
                . Ensure all trip distance logs are finalized before submitting
                to your jurisdiction.
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border border-slate-200 rounded-lg">
                    <tr>
                      <th className="px-5 py-3.5">Jurisdiction</th>
                      <th className="px-5 py-3.5 text-right">Distance (km)</th>
                      <th className="px-5 py-3.5 text-right">Fuel Used (L)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 border border-slate-200 border-t-0">
                    {report.by_jurisdiction?.map((row) => (
                      <tr
                        key={row.jurisdiction_code}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-medium text-slate-900">
                              {row.jurisdiction_code}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                          {row.distance_km !== null
                            ? row.distance_km.toLocaleString()
                            : "—"}{" "}
                          km
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                          {(row.fuel_liters || 0).toFixed(1)} L
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!generated && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <BarChart3 className="h-10 w-10 mb-3" />
              <p className="text-sm">
                Select a quarter and year, then click Generate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 8.4.2 Theft Summary ───────────────────────────────────────────────────────

function TheftTab() {
  const defaultEnd = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fuel-theft-summary", { startDate, endDate }],
    queryFn: () =>
      api.getTheftSummary({ start_date: startDate, end_date: endDate }),
  });

  const report = data?.data;

  return (
    <div className="space-y-5">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">
                Theft & Anomaly Summary
              </CardTitle>
              <CardDescription>
                Anomalous fuel drain events detected by GPS devices.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="h-9 w-36 bg-slate-50 border-slate-200 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-400">→</span>
              <Input
                type="date"
                className="h-9 w-36 bg-slate-50 border-slate-200 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            {report && report.total_incidents > 0 && (
              <Button variant="outline" size="sm" className="h-9 ml-auto">
                <Download className="mr-2 h-4 w-4" /> Download CSV
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
            </div>
          )}

          {report && !isLoading && (
            <div className="space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">
                    Total Incidents
                  </p>
                  <p className="text-3xl font-bold text-rose-700">
                    {report.total_incidents || 0}
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">
                    Total Liters Lost
                  </p>
                  <p className="text-3xl font-bold text-rose-700">
                    {(report.total_liters_lost || 0).toFixed(1)}{" "}
                    <span className="text-base font-medium">L</span>
                  </p>
                </div>
              </div>

              {/* Incidents table */}
              {!report.incidents || report.incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <TrendingDown className="h-8 w-8 mb-2" />
                  <p className="text-sm">
                    No theft incidents detected for this period.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Vehicle</th>
                        <th className="px-5 py-3.5">Date & Time</th>
                        <th className="px-5 py-3.5 text-right">Lost (L)</th>
                        <th className="px-5 py-3.5 text-right">Confidence</th>
                        <th className="px-5 py-3.5">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 border border-slate-200 border-t-0">
                      {report.incidents?.map((inc) => (
                        <tr key={inc.alert_id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-900 uppercase">
                                {inc.registration_number}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                            {inc.occurred_at
                              ? format(
                                  new Date(inc.occurred_at),
                                  "dd MMM, HH:mm",
                                )
                              : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-700">
                            {(inc.liters_lost || 0).toFixed(1)} L
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Badge
                              className={`border-none text-[10px] ${
                                (inc.confidence || 0) >= 0.9
                                  ? "bg-rose-100 text-rose-800"
                                  : (inc.confidence || 0) >= 0.7
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {Math.round((inc.confidence || 0) * 100)}%
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[180px] truncate">
                            {inc.location?.address ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 8.4.3 Cost Analysis ───────────────────────────────────────────────────────

function CostAnalysisTab() {
  const defaultEnd = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fuel-cost-analysis", { startDate, endDate }],
    queryFn: () =>
      api.getCostAnalysis({ start_date: startDate, end_date: endDate }),
  });

  const report = data?.data;

  return (
    <div className="space-y-5">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">
                Cost Analysis
              </CardTitle>
              <CardDescription>
                Fuel spend breakdown by vehicle for the selected period.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="h-9 w-36 bg-slate-50 border-slate-200 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-400">→</span>
              <Input
                type="date"
                className="h-9 w-36 bg-slate-50 border-slate-200 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          )}

          {report && !isLoading && (
            <div className="space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Total Spend
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    ₦
                    {((report.total_cost_kobo || 0) / 100).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 },
                    )}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Total Volume
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {(report.total_volume_liters || 0).toFixed(1)} L
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Avg Cost / L
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    ₦
                    {((report.average_cost_per_liter_kobo || 0) / 100).toFixed(
                      2,
                    )}
                  </p>
                </div>
              </div>

              {/* By vehicle table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Vehicle</th>
                      <th className="px-5 py-3.5 text-right">Volume (L)</th>
                      <th className="px-5 py-3.5 text-right">Cost (₦)</th>
                      <th className="px-5 py-3.5 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 border border-slate-200 border-t-0">
                    {report.by_vehicle?.map((row) => {
                      const totalCost = report.total_cost_kobo || 0;
                      const rowCost = row.total_cost_kobo || 0;
                      const sharePct =
                        totalCost > 0
                          ? ((rowCost / totalCost) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <tr key={row.vehicle_id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {row.registration_number}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {row.make} {row.model}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                            {(row.total_liters || 0).toFixed(1)} L
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-medium text-slate-900">
                            ₦
                            {(rowCost / 100).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${sharePct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-10 text-right">
                                {sharePct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!report && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <DollarSign className="h-8 w-8 mb-2" />
              <p className="text-sm">No cost data available for this period.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FuelReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Reports
        </h1>
        <p className="text-slate-500 mt-1">
          IFTA compliance schedules, theft summaries, and cost analysis.
        </p>
      </div>

      <Tabs defaultValue="ifta" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1">
          <TabsTrigger
            value="ifta"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            IFTA Compliance
          </TabsTrigger>
          <TabsTrigger
            value="theft"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Theft Summary
          </TabsTrigger>
          <TabsTrigger
            value="cost"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Cost Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ifta">
          <IftaTab />
        </TabsContent>
        <TabsContent value="theft">
          <TheftTab />
        </TabsContent>
        <TabsContent value="cost">
          <CostAnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
