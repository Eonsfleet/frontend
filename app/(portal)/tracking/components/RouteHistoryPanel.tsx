"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  subDays,
} from "date-fns";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  FileDown,
  Loader2,
  MapPinned,
  RefreshCw,
  Route as RouteIcon,
  X,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, extractApiError } from "@/lib/utils";
import {
  getVehicleRouteHistory,
  ROUTE_HISTORY_MAX_WINDOW_DAYS,
  type RouteHistoryPlace,
  type RouteHistorySegment,
} from "@/lib/api/tracking";
import { useTrackingUiStore } from "@/store/trackingUiStore";

export type RouteHistoryPreset = "today" | "week" | "custom";

interface RouteHistoryPanelProps {
  vehicleId: string;
  plate: string;
  onClose: () => void;
}

/** "2h 12m", "45m", "38s" — never "0h 0m". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;

  return `${Math.round(seconds)}s`;
}

/**
 * The server leaves an endpoint's address null when it ran out of geocoding
 * budget, so coordinates stand in rather than an empty line.
 */
export function describePlace(place: RouteHistoryPlace): string {
  if (place.address) return place.address;
  if (place.latitude == null || place.longitude == null) return "Unknown";

  return `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`;
}

/**
 * Resolve a preset (or a hand-picked range) into the window sent to the API.
 * Both ends are snapped to whole days so the query key stays stable across
 * re-renders — an end of "now" would change on every keystroke elsewhere.
 */
export function resolveRange(
  preset: RouteHistoryPreset,
  custom: DateRange | undefined,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  if (preset === "today") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (preset === "week") {
    return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  }

  if (!custom?.from) return null;

  // A single picked day is that whole day, not a zero-length window.
  return { start: startOfDay(custom.from), end: endOfDay(custom.to ?? custom.from) };
}

export function RouteHistoryPanel({
  vehicleId,
  plate,
  onClose,
}: RouteHistoryPanelProps) {
  const [preset, setPreset] = useState<RouteHistoryPreset>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setCalendarOpen] = useState(false);

  const { focusedRoute, setFocusedRoute } = useTrackingUiStore();

  useEffect(() => {
    // A journey drawn for one asset means nothing once another is selected, and
    // nothing at all once this panel is gone.
    return () => setFocusedRoute(null);
  }, [vehicleId, setFocusedRoute]);

  const range = useMemo(
    () => resolveRange(preset, customRange),
    // customRange is replaced wholesale by the picker, so identity is enough.
    [preset, customRange],
  );

  const spanDays = range
    ? differenceInCalendarDays(range.end, range.start) + 1
    : 0;
  const isRangeTooWide = spanDays > ROUTE_HISTORY_MAX_WINDOW_DAYS;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      "route-history",
      vehicleId,
      range?.start.toISOString(),
      range?.end.toISOString(),
    ],
    queryFn: () =>
      getVehicleRouteHistory(
        vehicleId,
        range!.start.toISOString(),
        range!.end.toISOString(),
      ),
    enabled: !!vehicleId && !!range && !isRangeTooWide,
    staleTime: 60_000,
  });

  const segments = data?.data ?? [];
  const summary = data?.meta?.summary;
  // Within a single day the date is noise on every row; across days it is the
  // only thing telling two journeys apart.
  const isSingleDay = !!range && isSameDay(range.start, range.end);

  const handleShowOnMap = (segment: RouteHistorySegment) => {
    if (focusedRoute?.segmentId === segment.id) {
      setFocusedRoute(null);
      return;
    }

    const path = segment.path
      .filter((point) => point.latitude != null && point.longitude != null)
      .map((point) => ({ lat: point.latitude, lng: point.longitude }));

    if (path.length < 2) {
      toast.info("This journey has no path to draw.");
      return;
    }

    setFocusedRoute({ vehicleId, segmentId: segment.id, path });
  };

  const handleExport = (segment: RouteHistorySegment) => {
    if (segment.path.length === 0) {
      toast.info("This journey has no path to export.");
      return;
    }

    const rows = [
      "timestamp,latitude,longitude,speed_kmh",
      ...segment.path.map((point) =>
        [
          point.timestamp,
          point.latitude,
          point.longitude,
          point.speed ?? "",
        ].join(","),
      ),
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `route-${plate}-${format(new Date(segment.started_at), "yyyy-MM-dd-HHmm")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const rangeLabel = range
    ? isSingleDay
      ? format(range.start, "MMM d, yyyy")
      : `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`
    : "Pick dates";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Route History</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            View historical routes and movements of this vehicle.
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close route history"
          className="h-7 w-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Date range selector */}
      <div className="flex items-center gap-2 px-6 py-3 shrink-0">
        <PresetButton
          label="Today"
          isActive={preset === "today"}
          onClick={() => setPreset("today")}
        />
        <PresetButton
          label="Last 7 days"
          isActive={preset === "week"}
          onClick={() => setPreset("week")}
        />

        <Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={() => setPreset("custom")}
              className={cn(
                "border rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-2 transition-colors",
                preset === "custom"
                  ? "border-blue-500 text-blue-600 bg-blue-50/40"
                  : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300",
              )}
            >
              <span>{preset === "custom" ? rangeLabel : "Custom"}</span>
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 rounded-2xl border-slate-100"
            align="start"
          >
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={(next) => {
                setCustomRange(next);
                setPreset("custom");
                if (next?.from && next?.to) setCalendarOpen(false);
              }}
              disabled={{ after: new Date() }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>

        <button
          onClick={() => refetch()}
          disabled={!range || isRangeTooWide}
          aria-label="Refresh route history"
          className="ml-auto h-7 w-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
          />
        </button>
      </div>

      {preset !== "custom" && (
        <p className="px-6 pb-2 text-[10px] font-semibold text-slate-400 shrink-0">
          {rangeLabel}
        </p>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 mx-6 mb-4 text-center shrink-0">
        <SummaryCell label="Trips" value={summary ? String(summary.trips) : "—"} />
        <SummaryCell
          label="Distance"
          value={summary ? `${summary.distance_km.toLocaleString()} km` : "—"}
        />
        <SummaryCell
          label="Duration"
          value={summary ? formatDuration(summary.duration_seconds) : "—"}
        />
        <SummaryCell label="Stops" value={summary ? String(summary.stops) : "—"} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4 relative min-h-0">
        {isRangeTooWide ? (
          <EmptyState
            title={`Pick a shorter range`}
            detail={`Route history covers up to ${ROUTE_HISTORY_MAX_WINDOW_DAYS} days at a time. This one spans ${spanDays}.`}
          />
        ) : !range ? (
          <EmptyState
            title="Choose a date"
            detail="Pick a day or a range to see where this vehicle has been."
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : isError ? (
          <EmptyState
            title="Could not load route history"
            detail={extractApiError(
              error,
              "Something went wrong fetching this vehicle's journeys.",
            )}
            action={
              <button
                onClick={() => refetch()}
                className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
              >
                Try again
              </button>
            }
          />
        ) : segments.length === 0 ? (
          <EmptyState
            title="No journeys recorded"
            detail={`No movement recorded for ${rangeLabel}.`}
          />
        ) : (
          <>
            <div className="absolute left-[33px] top-6 bottom-6 w-0.5 bg-slate-100" />

            <div className="space-y-4">
              {segments.map((segment) => (
                <SegmentRow
                  key={segment.id}
                  segment={segment}
                  isSingleDay={isSingleDay}
                  isFocused={focusedRoute?.segmentId === segment.id}
                  onShowOnMap={() => handleShowOnMap(segment)}
                  onExport={() => handleExport(segment)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PresetButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "border rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        isActive
          ? "border-blue-500 text-blue-600 bg-blue-50/40"
          : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300",
      )}
    >
      {label}
    </button>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-extrabold text-slate-800">{value}</div>
      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
      <RouteIcon className="h-8 w-8 text-slate-300 mx-auto mb-3" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {title}
      </p>
      <p className="text-[11px] text-slate-400 mt-2">{detail}</p>
      {action}
    </div>
  );
}

function SegmentRow({
  segment,
  isSingleDay,
  isFocused,
  onShowOnMap,
  onExport,
}: {
  segment: RouteHistorySegment;
  isSingleDay: boolean;
  isFocused: boolean;
  onShowOnMap: () => void;
  onExport: () => void;
}) {
  const startedAt = new Date(segment.started_at);
  const endedAt = new Date(segment.ended_at);
  const timePattern = isSingleDay ? "hh:mm a" : "MMM d, hh:mm a";

  return (
    <div className="flex items-start gap-4 relative pl-1">
      <div className="relative flex items-center justify-center w-5 h-5 rounded-full border border-slate-200 bg-white z-10 shrink-0 mt-1">
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            isFocused ? "bg-blue-600" : "bg-emerald-500",
          )}
        />
      </div>

      <div
        className={cn(
          "flex-1 min-w-0 rounded-xl p-3 border transition-all duration-200 flex items-center justify-between gap-4",
          isFocused
            ? "bg-blue-50/40 border-blue-200"
            : "bg-white border-slate-100 hover:bg-slate-50/50 hover:border-slate-200",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              {format(startedAt, timePattern)} - {format(endedAt, timePattern)}
            </span>
            {isFocused && (
              <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider">
                On map
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {formatDuration(segment.duration_seconds)} • {segment.distance_km} km
            {" • "}
            {segment.stops} {segment.stops === 1 ? "stop" : "stops"}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-50">
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Start
              </span>
              <span className="text-[10px] font-semibold text-slate-700 truncate block">
                {describePlace(segment.start)}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                End
              </span>
              <span className="text-[10px] font-semibold text-slate-700 truncate block">
                {describePlace(segment.end)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Journey actions"
                className="h-7 w-7 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1"
            >
              <DropdownMenuItem
                onClick={onShowOnMap}
                className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                <MapPinned className="h-3.5 w-3.5 text-slate-400" />
                <span>{isFocused ? "Hide from Map" : "Show on Map"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExport}
                className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                <FileDown className="h-3.5 w-3.5 text-slate-400" />
                <span>Export Trip</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
