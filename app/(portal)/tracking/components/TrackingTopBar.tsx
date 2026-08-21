"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  ChevronDown,
  Map as MapIcon,
  Satellite,
  Layers,
  Radio,
  Menu,
  Diamond,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import type { TrackingMapStyle } from "../utils";

const MAP_STYLE_LABEL: Record<TrackingMapStyle, string> = {
  standard: "Street",
  satellite: "Satellite",
  hybrid: "Hybrid",
};

const MAP_STYLE_ICON: Record<TrackingMapStyle, typeof MapIcon> = {
  standard: MapIcon,
  satellite: Satellite,
  hybrid: Layers,
};

const CONNECTION_STATUS_LABEL: Record<string, string> = {
  connected: "Live connection active",
  connecting: "Reconnecting…",
  disconnected: "Connection lost",
  failed: "Connection failed",
};

const CONNECTION_STATUS_COLOR: Record<string, string> = {
  connected: "text-blue-600 fill-blue-600",
  connecting: "text-amber-500 fill-amber-500",
  disconnected: "text-rose-600 fill-rose-600",
  failed: "text-rose-600 fill-rose-600",
};

interface TrackingTopBarProps {
  locationSearch: string;
  setLocationSearch: (v: string) => void;
  onLocationSelect: (coords: { latitude: number; longitude: number }) => void;
  mapStyle: TrackingMapStyle;
  setMapStyle: (s: TrackingMapStyle) => void;
  showTraffic: boolean;
  setShowTraffic: (v: boolean) => void;
  showGeofences: boolean;
  setShowGeofences: (v: boolean) => void;
}

/**
 * Floats directly over the map area (rendered inside the map's own relative
 * container in page.tsx) — it is not a page-wide docked bar, so it never
 * extends over the asset sidebar or the vehicle detail panel columns.
 */
export function TrackingTopBar({
  locationSearch,
  setLocationSearch,
  onLocationSelect,
  mapStyle,
  setMapStyle,
  showTraffic,
  setShowTraffic,
  showGeofences,
  setShowGeofences,
}: TrackingTopBarProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const CurrentStyleIcon = MAP_STYLE_ICON[mapStyle];
  const { status: connectionStatus } = useConnectionStatus();

  const iconButtonClass =
    "h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors";
  const activeIconButtonClass = "bg-blue-50 text-blue-600 hover:bg-blue-100";

  // Collapses back to the icon-only button on blur — focus moving to
  // anything outside this container (including clicking the map). A blur
  // whose relatedTarget is still inside the container (e.g. clicking a
  // suggestion row in the autocomplete's own dropdown) doesn't count, since
  // that's not actually leaving the search.
  const handleSearchBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (searchContainerRef.current?.contains(e.relatedTarget as Node)) return;
    setIsSearchExpanded(false);
  };

  // LocationAutocomplete doesn't expose an autoFocus prop — focus its inner
  // input imperatively once it mounts on expand.
  useEffect(() => {
    if (!isSearchExpanded) return;
    searchContainerRef.current?.querySelector("input")?.focus();
  }, [isSearchExpanded]);

  return (
    <div className="flex items-start justify-between gap-3">
      {/* Search — collapses to an icon-only pill until clicked, so it doesn't
          permanently take up map-overlay space the way a full input would. */}
      <div ref={searchContainerRef} className="relative" onBlur={handleSearchBlur}>
        {isSearchExpanded ? (
          <LocationAutocomplete
            value={locationSearch}
            onSelect={(loc) => {
              setLocationSearch(loc.name);
              onLocationSelect(loc.coords);
            }}
            placeholder="Search location / address"
            className="w-72 [&_input]:h-10 [&_input]:rounded-2xl [&_input]:border-slate-200 [&_input]:bg-white [&_input]:shadow-none [&_input:focus-visible]:border-blue-500 [&_input:focus-visible]:ring-blue-500/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsSearchExpanded(true)}
            aria-label="Search location"
            className="h-10 w-10 rounded-2xl border border-slate-200 bg-white shadow-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Desktop controls — a separate floating pill, with a gap of map visible between it and search */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 bg-white shadow-lg">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 px-3 rounded-xl border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <Radio className={cn("h-4 w-4", showTraffic ? "text-blue-600" : "text-slate-400")} />
              Traffic
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem checked={showTraffic} onCheckedChange={setShowTraffic}>
              Show fleet-speed traffic
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 px-3 rounded-xl border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <CurrentStyleIcon className="h-4 w-4 text-slate-500" />
              Map Style
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Map Style</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={mapStyle} onValueChange={(v) => setMapStyle(v as TrackingMapStyle)}>
              {(Object.keys(MAP_STYLE_LABEL) as TrackingMapStyle[]).map((style) => (
                <DropdownMenuRadioItem key={style} value={style}>
                  {MAP_STYLE_LABEL[style]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => setShowGeofences(!showGeofences)}
          aria-label="Toggle layers"
          className={cn(iconButtonClass, showGeofences && activeIconButtonClass)}
        >
          <Layers className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-slate-200" />

        <div
          className="h-9 w-9 flex items-center justify-center"
          role="status"
          aria-label={CONNECTION_STATUS_LABEL[connectionStatus]}
          title={CONNECTION_STATUS_LABEL[connectionStatus]}
        >
          <Diamond className={cn("h-4 w-4", CONNECTION_STATUS_COLOR[connectionStatus])} />
        </div>
      </div>

      {/* Mobile/tablet: collapse everything but search into its own filters-sheet pill */}
      <button
        onClick={() => setMobileFiltersOpen(true)}
        aria-label="Map filters"
        className="lg:hidden h-10 w-10 rounded-2xl border border-slate-200 bg-white shadow-lg flex items-center justify-center text-slate-600"
      >
        <Menu className="h-4 w-4" />
      </button>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl lg:hidden">
          <SheetHeader>
            <SheetTitle>Map Filters</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Map Style</p>
              <div className="flex gap-2">
                {(Object.keys(MAP_STYLE_LABEL) as TrackingMapStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setMapStyle(style)}
                    className={cn(
                      "flex-1 h-10 rounded-xl border text-sm font-medium",
                      mapStyle === style
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-200 text-slate-600",
                    )}
                  >
                    {MAP_STYLE_LABEL[style]}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700 flex items-center gap-2">
                <Radio className="h-4 w-4" /> Traffic
              </span>
              <input
                type="checkbox"
                checked={showTraffic}
                onChange={(e) => setShowTraffic(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700 flex items-center gap-2">
                <Layers className="h-4 w-4" /> Geofence Layer
              </span>
              <input
                type="checkbox"
                checked={showGeofences}
                onChange={(e) => setShowGeofences(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
