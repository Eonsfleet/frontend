"use client";

import { useRef, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Navigation, Search, ChevronRight, ChevronLeft, SlidersHorizontal, RefreshCw, ChevronDown } from "lucide-react";
import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
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
  isFilterActive: boolean;
  onOpenFilterDrawer: () => void;
  onRefresh: () => void;
  viewType: "listing" | "cluster";
  clusters: any[];
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
  isFilterActive,
  onOpenFilterDrawer,
  onRefresh,
  viewType,
  clusters,
}: TrackingSidebarProps) {
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const listParentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = filteredVehicles.length > VIRTUALIZE_LIST_THRESHOLD && viewType !== "cluster";
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

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [clusterId]: prev[clusterId] === false,
    }));
  };

  const groupedClusters = useMemo(() => {
    if (viewType !== "cluster") return [];

    const map: Record<string, Vehicle[]> = {};
    const clusterMap = new Map<string, string>();
    clusters.forEach((c) => {
      clusterMap.set(String(c.id), c.attributes?.name || c.name || `Cluster ${c.id}`);
    });

    filteredVehicles.forEach((v) => {
      const cId = v.relationships?.cluster?.id ? String(v.relationships?.cluster.id) : "unassigned";
      if (!map[cId]) {
        map[cId] = [];
      }
      map[cId].push(v);
    });

    return Object.keys(map).map((cId) => ({
      id: cId,
      name: cId === "unassigned" ? "Unassigned" : (clusterMap.get(cId) || `Cluster ${cId}`),
      vehicles: map[cId],
    }));
  }, [filteredVehicles, clusters, viewType]);

  if (isAssetListCollapsed) {
    return (
      <div className="hidden lg:flex h-full flex-col pointer-events-none">
        <button
          onClick={toggleAssetList}
          aria-label="Expand asset list"
          className="pointer-events-auto self-start mt-2 h-12 w-8 rounded-r-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900">
              {viewMode === "all" ? "Assets" : "Active Trips"}
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              ({viewMode === "all" ? vehicles.length : ongoingTripsCount})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenFilterDrawer}
              aria-label="Filter assets"
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors",
                isFilterActive && "bg-blue-50 text-blue-600 hover:bg-blue-100",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              onClick={onRefresh}
              aria-label="Re-sync fleet data"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={toggleAssetList}
              aria-label="Collapse asset list"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={viewMode === "all" ? "Search vehicle" : "Search trips"}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === "all" ? (
          <>
            <div className="px-4 pt-2">
              <StatusFilters
                vehicles={vehicles}
                locations={locations}
                alarmState={alarmState}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
              />
            </div>

            {isLoadingVehicles ? (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {Array.from({ length: 8 }).map((_, i) => (
                  <AssetCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="p-8 text-center">
                  <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-400">
                    {vehicles.length === 0 ? "No assets yet" : "No assets match your filters"}
                  </p>
                </div>
              </div>
            ) : viewType === "cluster" ? (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {groupedClusters.map((cluster) => {
                  const isExpanded = expandedClusters[cluster.id] !== false;
                  return (
                    <div key={cluster.id} className="border-b border-slate-100 last:border-0">
                      {/* Cluster Header */}
                      <button
                        onClick={() => toggleCluster(cluster.id)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {cluster.name}
                          </span>
                          <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                            {cluster.vehicles.length}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-slate-400 transition-transform duration-200",
                            isExpanded ? "transform rotate-0" : "transform -rotate-90"
                          )}
                        />
                      </button>

                      {/* Nested Vehicles */}
                      {isExpanded && (
                        <div className="bg-white">
                          {cluster.vehicles.map((v) => renderCard(v))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      }}
                    >
                      {renderCard(filteredVehicles[virtualRow.index])}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {filteredVehicles.map(renderCard)}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {isLoadingTrips ? (
              Array.from({ length: 6 }).map((_, i) => <AssetCardSkeleton key={i} />)
            ) : ongoingTripsData.length === 0 ? (
              <div className="p-8 text-center">
                <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-400">No ongoing missions</p>
              </div>
            ) : (
              ongoingTripsData.map((trip) => (
                <TripListItem
                  key={trip.id}
                  trip={trip}
                  isSelected={String(selectedVehicleId) === String(trip.vehicleId)}
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
  );
}
