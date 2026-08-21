"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import type { VehicleMapEntry } from "@/lib/api/vehicles";

export interface FilterState {
  search: string;
  group: string; // cluster id or "all"
  statuses: string[]; // ['moving', 'idle', 'stopped', 'offline']
  locationType: "all" | "radius";
  radiusKm: number;
  locationCoords: { latitude: number; longitude: number } | null;
  locationName: string;
  geofenceId: string; // geofence id or "all"
  vehicleModel: string;
  speedRange: [number, number];
  fuelLevel: "all" | "low" | "medium" | "high";
  viewType: "listing" | "cluster";
}

export const initialFilterState: FilterState = {
  search: "",
  group: "all",
  statuses: ["moving", "idle", "stopped", "offline"],
  locationType: "all",
  radiusKm: 10,
  locationCoords: null,
  locationName: "",
  geofenceId: "all",
  vehicleModel: "all",
  speedRange: [0, 120],
  fuelLevel: "all",
  viewType: "listing",
};

interface FilterPanelDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: VehicleMapEntry[];
  clusters: any[];
  geofences: any[];
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
}

export function FilterPanelDrawer({
  open,
  onOpenChange,
  vehicles,
  clusters,
  geofences,
  filters,
  onApplyFilters,
  onResetFilters,
}: FilterPanelDrawerProps) {
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  // Sync temp filters with external filters when drawer opens
  useEffect(() => {
    if (open) {
      setTempFilters(filters);
    }
  }, [open, filters]);

  // Extract unique options from vehicles data. Vehicle type/make/year/engine-status
  // filters were dropped: GET /vehicles?view=map (the panel/map feed) carries
  // none of body_type/type, make, year, or ignition — there's no data left to
  // filter on for this page.
  const vehicleModels = useMemo(() => {
    const models = vehicles.map((v) => v.attributes.model).filter(Boolean);
    return Array.from(new Set(models)) as string[];
  }, [vehicles]);

  const updateTempFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleStatusToggle = (status: string, checked: boolean) => {
    const current = [...tempFilters.statuses];
    if (checked) {
      if (!current.includes(status)) {
        updateTempFilter("statuses", [...current, status]);
      }
    } else {
      updateTempFilter(
        "statuses",
        current.filter((s) => s !== status)
      );
    }
  };

  const handleApply = () => {
    onApplyFilters(tempFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setTempFilters(initialFilterState);
    onResetFilters();
  };

  // Get active filter count & details for tags display
  const activeFilters = useMemo(() => {
    const badges: { id: string; label: string; clear: () => void }[] = [];

    if (filters.search) {
      badges.push({
        id: "search",
        label: `"${filters.search}"`,
        clear: () => onApplyFilters({ ...filters, search: "" }),
      });
    }
    if (filters.statuses.length < 4) {
      filters.statuses.forEach((status) => {
        badges.push({
          id: `status-${status}`,
          label: status.charAt(0).toUpperCase() + status.slice(1),
          clear: () =>
            onApplyFilters({
              ...filters,
              statuses: filters.statuses.filter((s) => s !== status),
            }),
        });
      });
    }
    if (filters.locationType === "radius" && filters.locationName) {
      badges.push({
        id: "location",
        label: `${filters.locationName.split(",")[0]} (${filters.radiusKm}km)`,
        clear: () =>
          onApplyFilters({
            ...filters,
            locationType: "all",
            locationCoords: null,
            locationName: "",
          }),
      });
    }
    if (filters.geofenceId !== "all") {
      const gName = geofences.find((g) => String(g.id) === filters.geofenceId)?.attributes?.name || "Geofence";
      badges.push({
        id: "geofence",
        label: gName,
        clear: () => onApplyFilters({ ...filters, geofenceId: "all" }),
      });
    }
    if (filters.vehicleModel !== "all") {
      badges.push({
        id: "vehicleModel",
        label: filters.vehicleModel,
        clear: () => onApplyFilters({ ...filters, vehicleModel: "all" }),
      });
    }
    if (filters.speedRange[0] > 0 || filters.speedRange[1] < 120) {
      badges.push({
        id: "speedRange",
        label: `${filters.speedRange[0]}-${filters.speedRange[1]} km/h`,
        clear: () => onApplyFilters({ ...filters, speedRange: [0, 120] }),
      });
    }
    if (filters.fuelLevel !== "all") {
      badges.push({
        id: "fuelLevel",
        label: `Fuel: ${filters.fuelLevel.toUpperCase()}`,
        clear: () => onApplyFilters({ ...filters, fuelLevel: "all" }),
      });
    }

    return badges;
  }, [filters, clusters, geofences, onApplyFilters]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-md h-full flex flex-col p-0 bg-white border-l border-slate-100 shadow-2xl text-slate-700"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-slate-100 flex flex-row items-center justify-between shrink-0">
          <SheetTitle className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Filters
          </SheetTitle>
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
            >
              Clear All
            </button>
            <SheetClose className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
              <X className="h-4.5 w-4.5" />
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Scrollable Filters Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 no-scrollbar">
          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                Active Filters ({activeFilters.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map((badge) => (
                  <span
                    key={badge.id}
                    className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors group"
                  >
                    {badge.label}
                    <button
                      onClick={badge.clear}
                      className="h-4.5 w-4.5 rounded-full flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-200/50 transition-colors shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* View Mode Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-1.5">
              View
            </h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="viewType"
                  checked={tempFilters.viewType === "listing"}
                  onChange={() => updateTempFilter("viewType", "listing")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-700">By listing</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="viewType"
                  checked={tempFilters.viewType === "cluster"}
                  onChange={() => updateTempFilter("viewType", "cluster")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-700">By group (i.e. cluster)</span>
              </label>
            </div>
          </div>

          {/* General Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-1.5">
              General
            </h4>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={tempFilters.search}
                  onChange={(e) => updateTempFilter("search", e.target.value)}
                  placeholder="Search vehicles, drivers..."
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Statuses Checkboxes */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Status
              </label>
              <div className="flex flex-wrap gap-y-3 gap-x-4 pt-1">
                {["moving", "idle", "stopped", "offline", "online"].map((status) => {
                  const isChecked = tempFilters.statuses.includes(status);
                  return (
                    <label key={status} className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        id={`filter-status-${status}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleStatusToggle(status, !!checked)}
                      />
                      <span className="text-sm font-semibold text-slate-700 capitalize">
                        {status === "stopped" ? "Stopped" : status}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-1.5">
              Location
            </h4>

            {/* Current Location Radio Selection */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Current Location
              </label>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="locationType"
                    checked={tempFilters.locationType === "all"}
                    onChange={() => updateTempFilter("locationType", "all")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-700">All Locations</span>
                </label>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer shrink-0">
                    <input
                      type="radio"
                      name="locationType"
                      checked={tempFilters.locationType === "radius"}
                      onChange={() => updateTempFilter("locationType", "radius")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-700">Within Radius</span>
                  </label>
                  {tempFilters.locationType === "radius" && (
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={tempFilters.radiusKm}
                        onChange={(e) => updateTempFilter("radiusKm", Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 bg-transparent text-center border-none outline-none focus:ring-0 p-0"
                      />
                      <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider ml-1">km</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Geofence Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Geofence
              </label>
              <div className="relative">
                <select
                  value={tempFilters.geofenceId}
                  onChange={(e) => updateTempFilter("geofenceId", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                >
                  <option value="all">All Geofences</option>
                  {geofences.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.attributes?.name || g.name || `Geofence ${g.id}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Location Autocomplete */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Location
              </label>
              <LocationAutocomplete
                value={tempFilters.locationName}
                onSelect={(loc) => {
                  setTempFilters((prev) => ({
                    ...prev,
                    locationName: loc.name,
                    locationCoords: {
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                    },
                    locationType: "radius",
                  }));
                }}
                placeholder="Oshodi, Lagos"
                className="[&_input]:rounded-xl [&_input]:bg-slate-50 [&_input]:border-slate-200 hover:[&_input]:border-slate-300 focus:[&_input]:border-blue-500 [&_input]:h-11"
              />
            </div>
          </div>

          {/* Vehicle Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-1.5">
              Vehicle
            </h4>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Model
              </label>
              <div className="relative">
                <select
                  value={tempFilters.vehicleModel}
                  onChange={(e) => updateTempFilter("vehicleModel", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                >
                  <option value="all">All Models</option>
                  {vehicleModels.map((md) => (
                    <option key={md} value={md}>
                      {md}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Other Filters Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-1.5">
              Other Filters
            </h4>

            {/* Speed Range Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Speed Range (km/h)
                </label>
                <span className="text-xs font-bold text-slate-800">
                  {tempFilters.speedRange[0]} - {tempFilters.speedRange[1]}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-400">0</span>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={tempFilters.speedRange[1]}
                  onChange={(e) =>
                    updateTempFilter("speedRange", [tempFilters.speedRange[0], parseInt(e.target.value)])
                  }
                  className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-medium text-slate-400">120</span>
              </div>
            </div>

            {/* Fuel Level */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Fuel Level
              </label>
              <div className="relative">
                <select
                  value={tempFilters.fuelLevel}
                  onChange={(e) => updateTempFilter("fuelLevel", e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="low">Low (&lt;20%)</option>
                  <option value="medium">Medium (20-70%)</option>
                  <option value="high">High (&gt;70%)</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 grid grid-cols-3 gap-3 shrink-0 bg-white">
          <button
            onClick={handleReset}
            className="col-span-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:bg-slate-100 transition-colors uppercase tracking-wider text-center"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="col-span-2 py-3 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors uppercase tracking-wider text-center shadow-lg shadow-blue-500/20"
          >
            Apply Filters
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
