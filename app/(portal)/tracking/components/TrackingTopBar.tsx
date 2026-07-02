"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  Map as MapIcon,
  Satellite,
  Layers,
  Radio,
  Menu,
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
import { cn } from "@/lib/utils";
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

interface TrackingTopBarProps {
  locationSearch: string;
  setLocationSearch: (v: string) => void;
  onLocationSearchSubmit: () => void;
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
  onLocationSearchSubmit,
  mapStyle,
  setMapStyle,
  showTraffic,
  setShowTraffic,
  showGeofences,
  setShowGeofences,
}: TrackingTopBarProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const CurrentStyleIcon = MAP_STYLE_ICON[mapStyle];

  const iconButtonClass =
    "h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors";
  const activeIconButtonClass = "bg-blue-50 text-blue-600 hover:bg-blue-100";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={locationSearch}
          onChange={(e) => setLocationSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onLocationSearchSubmit();
          }}
          placeholder="Search location / address"
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
        />
      </div>

      {/* Desktop controls */}
      <div className="hidden lg:flex items-center gap-2 ml-auto">
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
      </div>

      {/* Mobile/tablet: collapse everything but search into one filters sheet */}
      <button
        onClick={() => setMobileFiltersOpen(true)}
        aria-label="Map filters"
        className="lg:hidden h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600"
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
