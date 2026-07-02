"use client";

import { useState } from "react";
import { List, Search, Navigation } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Vehicle } from "@/types";
import { StatusFilters, StatusFilter } from "./StatusFilters";
import { VehicleListItem } from "./VehicleListItem";
import { AssetCardSkeleton } from "./AssetCardSkeleton";

interface MobileAssetSheetProps {
  vehicles: Vehicle[];
  filteredVehicles: Vehicle[];
  locations: Record<string, any>;
  alarmState: Record<string, boolean>;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  isLoadingVehicles: boolean;
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/**
 * Mobile-only (<lg) entry point to the fleet list. The desktop docked
 * TrackingSidebar is hidden below the lg breakpoint (see page.tsx); this bottom
 * sheet is the mobile/tablet equivalent, keeping the map as the full-screen background
 * at all times per the "preserve map area" requirement.
 */
export function MobileAssetSheet({
  vehicles,
  filteredVehicles,
  locations,
  alarmState,
  selectedVehicleId,
  setSelectedVehicleId,
  isLoadingVehicles,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
}: MobileAssetSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 left-6 z-40 h-14 px-5 rounded-full bg-slate-900 text-white shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest"
      >
        <List className="h-4 w-4" />
        Assets ({vehicles.length})
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl lg:hidden">
          <SheetHeader>
            <SheetTitle>Fleet Assets</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-2 space-y-3 flex-1 flex flex-col min-h-0">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vehicle"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="shrink-0">
              <StatusFilters
                vehicles={vehicles}
                locations={locations}
                alarmState={alarmState}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
              />
            </div>
            <div className="flex-1 overflow-y-auto pb-4">
              {isLoadingVehicles ? (
                Array.from({ length: 6 }).map((_, i) => <AssetCardSkeleton key={i} />)
              ) : filteredVehicles.length === 0 ? (
                <div className="p-8 text-center">
                  <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-400">
                    No assets match your filters
                  </p>
                </div>
              ) : (
                filteredVehicles.map((v) => (
                  <VehicleListItem
                    key={v.id}
                    vehicle={v}
                    loc={locations[v.id]}
                    isSelected={String(selectedVehicleId) === String(v.id)}
                    hasActiveAlarm={alarmState[v.id] === true}
                    onSelect={() => {
                      const isSelected = String(selectedVehicleId) === String(v.id);
                      setSelectedVehicleId(isSelected ? null : v.id);
                      setIsOpen(false);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
