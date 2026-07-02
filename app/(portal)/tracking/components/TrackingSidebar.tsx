"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Navigation, Search, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusFilters, StatusFilter } from "./StatusFilters";
import { VehicleListItem } from "./VehicleListItem";
import { TripListItem } from "./TripListItem";
import { AssetCardSkeleton } from "./AssetCardSkeleton";
import { VIRTUALIZE_LIST_THRESHOLD } from "@/lib/config";
import { useTrackingUiStore } from "@/store/trackingUiStore";

interface TrackingSidebarProps {
  viewMode: "all" | "focused";
  vehicles: Vehicle[];
  filteredVehicles: Vehicle[];
  locations: Record<string, any>;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  isLoadingVehicles: boolean;
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  ongoingTripsCount: number;
  ongoingTripsData: any[];
  setIsReplayOpen: (open: boolean) => void;
  isLoadingTrips: boolean;
  alarmState?: Record<string, boolean>;
}

export function TrackingSidebar({
  viewMode,
  vehicles,
  filteredVehicles,
  locations,
  selectedVehicleId,
  setSelectedVehicleId,
  isLoadingVehicles,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  ongoingTripsCount,
  ongoingTripsData,
  setIsReplayOpen,
  isLoadingTrips,
  alarmState = {},
}: TrackingSidebarProps) {
  const listParentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = filteredVehicles.length > VIRTUALIZE_LIST_THRESHOLD;
  const { isAssetListCollapsed, toggleAssetList } = useTrackingUiStore();

  const virtualizer = useVirtualizer({
    count: filteredVehicles.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 92,
    overscan: 8,
    enabled: shouldVirtualize,
  });

  const renderCard = (v: Vehicle) => (
    <VehicleListItem
      key={v.id}
      vehicle={v}
      loc={locations[v.id]}
      isSelected={String(selectedVehicleId) === String(v.id)}
      hasActiveAlarm={alarmState[v.id] === true}
      onSelect={() => {
        const isSelected = String(selectedVehicleId) === String(v.id);
        setSelectedVehicleId(isSelected ? null : v.id);
      }}
    />
  );

  if (isAssetListCollapsed) {
    return (
      <div className="hidden md:flex absolute left-6 top-6 bottom-6 z-20 flex-col pointer-events-none">
        <button
          onClick={toggleAssetList}
          aria-label="Expand asset list"
          className="pointer-events-auto self-start mt-2 h-12 w-8 rounded-r-2xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-lg flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="hidden md:flex absolute left-6 top-6 bottom-6 z-20 flex-col pointer-events-none">
      <div
        className={cn(
          "w-72 h-full border border-white/20 rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden pointer-events-auto transition-all duration-500 ease-in-out relative",
          viewMode === "focused"
            ? "bg-white"
            : "bg-white/95 backdrop-blur-xl",
        )}
      >
        <button
          onClick={toggleAssetList}
          aria-label="Collapse asset list"
          className="lg:hidden absolute -right-3 top-4 z-10 h-7 w-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="p-6 border-b border-slate-100/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              {viewMode === "all" ? "Fleet" : "Active"}{" "}
              <span className="text-blue-600">
                {viewMode === "all" ? "Listing" : "Trips"}
              </span>
            </h2>
            <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black uppercase tracking-widest">
              {viewMode === "all"
                ? `${vehicles.length} Assets`
                : `${ongoingTripsCount} Active`}
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={
                viewMode === "all" ? "SEARCH ASSETS..." : "SEARCH TRIPS..."
              }
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
          {viewMode === "all" ? (
            <>
              <StatusFilters
                vehicles={vehicles}
                locations={locations}
                alarmState={alarmState}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
              />

              {isLoadingVehicles ? (
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <AssetCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {vehicles.length === 0 ? "No assets yet" : "No assets match your filters"}
                    </p>
                  </div>
                </div>
              ) : shouldVirtualize ? (
                <div ref={listParentRef} className="flex-1 overflow-y-auto no-scrollbar">
                  <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                    {virtualizer.getVirtualItems().map((virtualRow) => (
                      <div
                        key={filteredVehicles[virtualRow.index].id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: 8,
                        }}
                      >
                        {renderCard(filteredVehicles[virtualRow.index])}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                  {filteredVehicles.map(renderCard)}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
              {isLoadingTrips ? (
                Array.from({ length: 6 }).map((_, i) => <AssetCardSkeleton key={i} />)
              ) : ongoingTripsData.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    No ongoing missions
                  </p>
                </div>
              ) : (
                ongoingTripsData.map((trip) => (
                  <TripListItem
                    key={trip.id}
                    trip={trip}
                    isSelected={
                      String(selectedVehicleId) === String(trip.vehicleId)
                    }
                    locations={locations}
                    onSelect={() => {
                      if (trip.vehicleId) {
                        setSelectedVehicleId(trip.vehicleId);
                        setIsReplayOpen(true);
                      }
                    }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
