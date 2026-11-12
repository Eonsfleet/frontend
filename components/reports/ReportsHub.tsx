"use client";

import React, { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Columns3, History, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReportCatalog } from "@/lib/api/reports";
import { getReport } from "@/lib/reports/registry";
import { HUB_FILTER_PARAMS, settingsFromSearch } from "@/lib/analytics/reportLinks";
import { useReportLists } from "@/lib/reports/useReportLists";
import { CatalogTab } from "./CatalogTab";
import { ExportDialog, type ReportSettings } from "./ExportDialog";
import { ScheduleDialog, type ScheduleDraft } from "./ScheduleDialog";
import { SchedulesTab } from "./SchedulesTab";
import { TemplatesTab } from "./TemplatesTab";
import { HistoryTab } from "./HistoryTab";

const TABS = [
  { id: "reports", label: "Reports", icon: LayoutGrid },
  { id: "templates", label: "Templates", icon: Columns3 },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
  { id: "history", label: "History", icon: History },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * The reports page: find a report, see it on screen, then export or schedule
 * it. The tab and the open report live in the URL, so a report can be shared
 * and the back button returns to the list.
 */
export function ReportsHub() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const lists = useReportLists();

  const tab: TabId = TABS.some((t) => t.id === search.get("tab")) ? (search.get("tab") as TabId) : "reports";
  const reportParam = search.get("report");
  const openType = tab === "reports" && reportParam && getReport(reportParam) ? reportParam : null;

  const [initial, setInitial] = useState<ReportSettings | undefined>();
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);

  // A link from Analytics arrives with the period and vehicles to open the report with.
  const linked = useMemo(() => settingsFromSearch(search), [search]);

  const go = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    // Those settings belong to the arrival only; any later navigation drops them.
    for (const key of HUB_FILTER_PARAMS) next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, search]);

  const catalog = useQuery({ queryKey: ["report-catalog"], queryFn: getReportCatalog, staleTime: 5 * 60_000, retry: 1 });
  const vehicleTypes = useMemo(
    () => new Set((catalog.data ?? []).filter((r) => r.allowed && r.filters.includes("vehicle_ids")).map((r) => r.type)),
    [catalog.data],
  );
  const catalogByType = useMemo(() => new Map((catalog.data ?? []).map((r) => [r.type, r])), [catalog.data]);

  const openReport = (type: string, settings?: ReportSettings) => {
    setInitial(settings);
    go({ tab: "reports", report: type });
  };

  return (
    <div className="p-4 sm:p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">See your fleet numbers on screen, then export, schedule or save them as a template.</p>
      </header>

      <nav aria-label="Reports sections" className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <div role="tablist" className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => go({ tab: id, report: null })}
              className={cn(
                "min-h-10 px-4 rounded-xl text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                tab === id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </nav>

      <main>
        {tab === "reports" && (
          <CatalogTab
            favorites={lists.favorites}
            recent={lists.recent}
            onOpen={(type) => openReport(type)}
            onToggleFavorite={lists.toggleFavorite}
          />
        )}
        {tab === "templates" && <TemplatesTab onRunQueued={() => go({ tab: "history", report: null })} />}
        {tab === "schedules" && <SchedulesTab onEdit={setDraft} />}
        {tab === "history" && <HistoryTab onRerun={(type, settings) => openReport(type, settings)} />}
      </main>

      <ExportDialog
        type={openType}
        initial={initial ?? linked}
        canScopeVehicles={!!openType && vehicleTypes.has(openType)}
        sixtyDays={!!openType && catalogByType.get(openType)?.window === "60d"}
        onClose={() => go({ report: null })}
        onRan={lists.markRecent}
      />

      <ScheduleDialog draft={draft} onClose={() => setDraft(null)} vehicleTypes={vehicleTypes} />
    </div>
  );
}
