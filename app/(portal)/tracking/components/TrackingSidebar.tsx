"use client";

import { Loader2, Navigation, Search, Activity } from "lucide-react";
import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusFilters, StatusFilter } from "./StatusFilters";
import { VehicleListItem } from "./VehicleListItem";
import { TripListItem } from "./TripListItem";

interface TrackingSidebarProps {
  viewMode: "all" | "focused";
  vehicles: Vehicle[];
  filteredVehicles: Vehicle[];
  locations: Record<string, any>;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  setIsTelemetryOpen: (open: boolean) => void;
  isLoadingVehicles: boolean;
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  ongoingTripsCount: number;
  ongoingTripsData: any[];
  setIsReplayOpen: (open: boolean) => void;
  isLoadingTrips: boolean;
}

export function TrackingSidebar({
  viewMode,
  vehicles,
  filteredVehicles,
  locations,
  selectedVehicleId,
  setSelectedVehicleId,
  setIsTelemetryOpen,
  isLoadingVehicles,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  ongoingTripsCount,
  ongoingTripsData,
  setIsReplayOpen,
  isLoadingTrips,
}: TrackingSidebarProps) {
  return (
    <div className="absolute left-6 top-6 bottom-6 z-20 flex flex-col pointer-events-none">
      <div
        className={cn(
          "w-72 h-full border border-white/20 rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden pointer-events-auto transition-all duration-500 ease-in-out",
          viewMode === "focused"
            ? "bg-white"
            : "bg-white/95 backdrop-blur-xl",
        )}
      >
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

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {viewMode === "all" ? (
            <>
              <StatusFilters
                vehicles={vehicles}
                locations={locations}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
              />
              <div className="space-y-2">
                {isLoadingVehicles ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Hydrating Fleet...
                    </span>
                  </div>
                ) : (
                  filteredVehicles.map((v: Vehicle) => (
                    <VehicleListItem
                      key={v.id}
                      vehicle={v}
                      loc={locations[v.id]}
                      isSelected={String(selectedVehicleId) === String(v.id)}
                      onSelect={() => {
                        const isSelected =
                          String(selectedVehicleId) === String(v.id);
                        setSelectedVehicleId(isSelected ? null : v.id);
                        setIsTelemetryOpen(false);
                      }}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {isLoadingTrips ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Scanning Missions...
                  </span>
                </div>
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
