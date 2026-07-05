"use client";

import { useState, useMemo } from "react";
import { List, Search, Navigation, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Vehicle } from "@/types";
import { StatusFilters, StatusFilter } from "./StatusFilters";
import { VehicleListItem } from "./VehicleListItem";
import { AssetCardSkeleton } from "./AssetCardSkeleton";
import { cn } from "@/lib/utils";

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
  isFilterActive: boolean;
  onOpenFilterDrawer: () => void;
  viewType: "listing" | "cluster";
  clusters: any[];
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
  isFilterActive,
  onOpenFilterDrawer,
  viewType,
  clusters,
}: MobileAssetSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [clusterId]: prev[clusterId] === false,
    }));
  };

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
        setIsOpen(false);
      }}
    />
  );

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
          <SheetHeader className="flex flex-row items-center justify-between pr-8 shrink-0">
            <SheetTitle>Fleet Assets</SheetTitle>
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
              ) : viewType === "cluster" ? (
                <div className="space-y-1">
                  {groupedClusters.map((cluster) => {
                    const isExpanded = expandedClusters[cluster.id] !== false;
                    return (
                      <div key={cluster.id} className="border-b border-slate-100 last:border-0">
                        {/* Cluster Header */}
                        <button
                          onClick={() => toggleCluster(cluster.id)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
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
              ) : (
                filteredVehicles.map(renderCard)
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
