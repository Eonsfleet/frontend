"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Vehicle, Trip } from "@/types";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useEcho } from "@/hooks/useEcho";
import * as api from "@/lib/api/vehicles";
import * as tripApi from "@/lib/api/trips";
import { getClusters } from "@/lib/api/settings";
import { getGeofences } from "@/lib/api/geofencing";
import TrackingMap from "./TrackingMap";
import { AssetPanel } from "./components/AssetPanel";
import { TripPlaybackTimeline } from "@/components/live/TripPlaybackTimeline";
import { MAP_LAYERS, getMarkerSVG, getVehicleIcon, type TrackingMapStyle } from "./utils";
import { useVehicleLocations } from "./hooks/useVehicleLocations";
import { useResolvedVehicleTelemetry } from "@/hooks/useResolvedVehicleTelemetry";
import { buildVehicleSnapshot } from "@/lib/resolveVehicleTelemetry";
import { usePlaybackData } from "./hooks/usePlaybackData";
import { TrackingSidebar } from "./components/TrackingSidebar";
import { TrackingTopBar } from "./components/TrackingTopBar";
import { MapZoomControl } from "./components/MapZoomControl";
import { MapExtraControls } from "./components/MapExtraControls";
import { MapLegend } from "./components/MapLegend";
import { FilterPanelDrawer, FilterState, initialFilterState } from "./components/FilterPanelDrawer";
import { StatusFilter } from "./components/StatusFilters";
import { ConnectionBanner } from "./components/ConnectionBanner";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { BottomCards } from "./components/BottomCards";
import { MobileAssetSheet } from "./components/MobileAssetSheet";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

export default function TrackingPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  // The view-mode toggle UI (All Assets / Active Trips) was removed from the map
  // toolbar per design feedback; "focused" is currently unreachable, but the
  // underlying Active Trips code path in TrackingSidebar is left intact in case
  // this is reintroduced elsewhere later.
  const [viewMode] = useState<"all" | "focused">("all");
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("standard");
  const [showTraffic, setShowTraffic] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [showGeofences, setShowGeofences] = useState(false);
  const [zoomResetKey, setZoomResetKey] = useState(0);
  const [playbackType, setPlaybackType] = useState<"trip" | "history">("trip");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 1),
    to: new Date(),
  });

  const resetZoom = () => setZoomResetKey((prev) => prev + 1);

  const { token, organization } = useAuthStore();
  const { setSidebarCollapsed } = useUIStore();
  const { subscribePrivate } = useEcho();
  const { status: connectionStatus } = useConnectionStatus();

  const { data: vehicleData, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles-tracking"],
    queryFn: () => api.getVehiclesBatched(),
    enabled: !!token,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const { data: clustersData } = useQuery({
    queryKey: ["clusters-tracking"],
    queryFn: () => getClusters({ per_page: 100 }),
    enabled: !!token,
  });

  const { data: tripData, isLoading: isLoadingTrips } = useQuery({
    queryKey: ["trips", { status: "in_progress" }],
    queryFn: () => tripApi.getTrips({ status: "in_progress" }),
    enabled: !!token && viewMode === "focused",
  });

  const { data: geofencesData } = useQuery({
    queryKey: ["geofences-tracking"],
    queryFn: () => getGeofences({ per_page: 100 }),
    enabled: !!token,
  });

  const vehicles = useMemo(() => vehicleData ?? [], [vehicleData]);
  const ongoingTrips = useMemo(() => tripData?.data?.trips || [], [tripData]);
  const clusters = useMemo(() => clustersData?.data?.clusters || [], [clustersData]);
  const geofences = useMemo(() => geofencesData?.data?.geofences || [], [geofencesData]);

  const { locations, interpolator, alarmState, trails } = useVehicleLocations({
    vehicles,
    token,
    organization,
    subscribePrivate,
    selectedVehicleId,
  });

  const selectedVehicle = useMemo(
    () =>
      vehicles.find((v: Vehicle) => String(v.id) === String(selectedVehicleId)) || null,
    [vehicles, selectedVehicleId],
  );

  const selectedTrail = useMemo(
    () => (selectedVehicleId ? trails[selectedVehicleId] ?? [] : []),
    [trails, selectedVehicleId],
  );

  // Hoisted here (rather than inside AssetPanel) so it opens exactly one set of
  // per-vehicle WS channels — AssetPanel renders twice simultaneously (desktop +
  // mobile variants, toggled with CSS breakpoints, not conditional mounting), and
  // BottomCards needs the same live-resolved telemetry, so all three consume this
  // single subscription instead of each opening their own.
  const selectedLoc = selectedVehicle ? locations[selectedVehicle.id] : null;
  const selectedVehicleSnapshot = useMemo(
    () => buildVehicleSnapshot(selectedVehicle, selectedLoc),
    [selectedVehicle, selectedLoc],
  );
  const resolvedTelemetry = useResolvedVehicleTelemetry(
    selectedVehicle?.id ?? null,
    selectedVehicleSnapshot,
    !!selectedVehicle,
  );

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  // Sync sidebar search query with drawer search
  useEffect(() => {
    if (searchQuery !== filters.search) {
      setFilters((prev) => ({ ...prev, search: searchQuery }));
    }
  }, [searchQuery]);

  useEffect(() => {
    if (filters.search !== searchQuery) {
      setSearchQuery(filters.search);
    }
  }, [filters.search]);

  // Sync sidebar statusFilter with drawer status checkboxes
  const handleStatusFilterChange = useCallback((newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setFilters((prev) => {
      if (newStatus === "all") {
        return { ...prev, statuses: ["moving", "idle", "stopped", "offline"] };
      } else if (newStatus === "moving") {
        return { ...prev, statuses: ["moving"] };
      } else if (newStatus === "idle") {
        return { ...prev, statuses: ["idle"] };
      } else if (newStatus === "parked") {
        return { ...prev, statuses: ["stopped"] };
      } else if (newStatus === "offline") {
        return { ...prev, statuses: ["offline"] };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const s = filters.statuses;
    if (s.length === 4) {
      setStatusFilter("all");
    } else if (s.length === 1) {
      if (s[0] === "moving") setStatusFilter("moving");
      else if (s[0] === "idle") setStatusFilter("idle");
      else if (s[0] === "stopped") setStatusFilter("parked");
      else if (s[0] === "offline") setStatusFilter("offline");
    } else {
      setStatusFilter("all");
    }
  }, [filters.statuses]);

  const isFilterActive = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.group !== "all" ||
      filters.statuses.length < 4 ||
      filters.locationType === "radius" ||
      filters.geofenceId !== "all" ||
      filters.vehicleType !== "all" ||
      filters.vehicleMake !== "all" ||
      filters.vehicleModel !== "all" ||
      filters.vehicleYearFrom !== "" ||
      filters.speedRange[0] > 0 ||
      filters.speedRange[1] < 120 ||
      filters.engineStatus !== "all" ||
      filters.fuelLevel !== "all"
    );
  }, [filters]);

  // Geographical Distance Calculator (Haversine Formula)
  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in km
  }, []);

  // Geofence Inclusion Check
  const isVehicleInGeofence = useCallback((lat: number, lng: number, geofence: any) => {
    const { type, coordinates, radius } = geofence.attributes || {};
    if (!coordinates) return false;

    if (type === "circle") {
      const centerLat = coordinates.lat ?? coordinates.latitude;
      const centerLng = coordinates.lng ?? coordinates.longitude;
      if (centerLat == null || centerLng == null) return false;
      const dist = getDistance(lat, lng, centerLat, centerLng) * 1000; // to meters
      return dist <= (radius ?? 500);
    } else if (type === "polygon") {
      let vertices: [number, number][] = [];
      if (coordinates.type === "Polygon" && Array.isArray(coordinates.coordinates)) {
        vertices = coordinates.coordinates[0].map(([lg, lt]: [number, number]) => [lt, lg]);
      } else if (Array.isArray(coordinates)) {
        vertices = coordinates.map((p: any) => {
          if (Array.isArray(p)) {
            return [p[1], p[0]] as [number, number];
          }
          return [p.lat ?? p.latitude, p.lng ?? p.longitude] as [number, number];
        });
      }

      if (vertices.length === 0) return false;

      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i][0], yi = vertices[i][1];
        const xj = vertices[j][0], yj = vertices[j][1];
        const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    }
    return false;
  }, [getDistance]);

  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    // 1. Search Query
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((v: Vehicle) => {
        const currentDriver = v.relationships?.current_driver;
        const driverName = Array.isArray(currentDriver) ? undefined : currentDriver?.name;
        const imei = v.relationships?.device?.imei ?? v.relationships?.device?.data?.imei;
        const deviceSerial = v.relationships?.device?.serial_number;
        const haystack = [
          v.attributes.registration_number,
          v.attributes.make,
          v.attributes.model,
          driverName,
          imei,
          deviceSerial,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    // 2. Group/Cluster filter
    if (filters.group !== "all") {
      result = result.filter((v: Vehicle) => {
        const clusterId = String(v.relationships?.cluster?.id || "");
        return String(filters.group) === clusterId;
      });
    }

    // 3. Status filter
    if (filters.statuses.length < 4) {
      result = result.filter((v: Vehicle) => {
        const loc = locations[v.id];
        const isOnline = loc?.is_online ?? v.attributes.is_online ?? false;

        let match = false;
        if (filters.statuses.includes("moving") && loc?.status === "in_transit") match = true;
        if (filters.statuses.includes("idle") && loc?.status === "idle") match = true;
        if (filters.statuses.includes("stopped") && loc?.status === "parked") match = true;
        if (filters.statuses.includes("offline") && (!isOnline || !loc)) match = true;
        return match;
      });
    }

    // 4. Location & Radius filter
    if (filters.locationType === "radius" && filters.locationCoords) {
      const { latitude: centerLat, longitude: centerLng } = filters.locationCoords;
      result = result.filter((v: Vehicle) => {
        const loc = locations[v.id];
        if (!loc?.lat || !loc?.lng) return false;
        const dist = getDistance(loc.lat, loc.lng, centerLat, centerLng);
        return dist <= filters.radiusKm;
      });
    }

    // 5. Geofence filter
    if (filters.geofenceId !== "all") {
      const selectedGeofence = geofences.find((g) => String(g.id) === filters.geofenceId);
      if (selectedGeofence) {
        result = result.filter((v: Vehicle) => {
          const loc = locations[v.id];
          if (!loc?.lat || !loc?.lng) return false;
          return isVehicleInGeofence(loc.lat, loc.lng, selectedGeofence);
        });
      }
    }

    // 6. Vehicle Type
    if (filters.vehicleType !== "all") {
      result = result.filter((v: Vehicle) => {
        const t = (v.attributes.body_type || v.attributes.type || "").toLowerCase();
        return t === filters.vehicleType.toLowerCase();
      });
    }

    // 7. Vehicle Make
    if (filters.vehicleMake !== "all") {
      result = result.filter((v: Vehicle) => {
        const m = (v.attributes.make || "").toLowerCase();
        return m === filters.vehicleMake.toLowerCase();
      });
    }

    // 8. Vehicle Model
    if (filters.vehicleModel !== "all") {
      result = result.filter((v: Vehicle) => {
        const md = (v.attributes.model || "").toLowerCase();
        return md === filters.vehicleModel.toLowerCase();
      });
    }

    // 9. Vehicle Year From
    if (filters.vehicleYearFrom) {
      const yearLimit = parseInt(filters.vehicleYearFrom, 10);
      if (!isNaN(yearLimit)) {
        result = result.filter((v: Vehicle) => {
          const y = parseInt(String(v.attributes.year), 10);
          return !isNaN(y) && y >= yearLimit;
        });
      }
    }

    // 10. Speed Range
    if (filters.speedRange[0] > 0 || filters.speedRange[1] < 120) {
      result = result.filter((v: Vehicle) => {
        const loc = locations[v.id];
        const speed = loc?.speed ?? 0;
        return speed >= filters.speedRange[0] && speed <= filters.speedRange[1];
      });
    }

    // 11. Engine Status
    if (filters.engineStatus !== "all") {
      result = result.filter((v: Vehicle) => {
        const loc = locations[v.id];
        const isIgnitionOn = loc?.ignition === "on" || loc?.ignition === "1" || loc?.ignition === true;
        if (filters.engineStatus === "on") return isIgnitionOn;
        if (filters.engineStatus === "off") return !isIgnitionOn;
        return true;
      });
    }

    // 12. Fuel Level
    if (filters.fuelLevel !== "all") {
      result = result.filter((v: Vehicle) => {
        const loc = locations[v.id];
        const fuel = loc?.fuel_level_percent ?? 0;
        if (filters.fuelLevel === "low") return fuel < 20;
        if (filters.fuelLevel === "medium") return fuel >= 20 && fuel <= 70;
        if (filters.fuelLevel === "high") return fuel > 70;
        return true;
      });
    }

    return result;
  }, [vehicles, filters, locations, geofences, getDistance, isVehicleInGeofence]);

  // Clear selection if the selected vehicle is not in the filtered results
  useEffect(() => {
    if (
      selectedVehicleId &&
      !filteredVehicles.find((v: Vehicle) => String(v.id) === String(selectedVehicleId))
    ) {
      setSelectedVehicleId(null);
    }
  }, [filteredVehicles, selectedVehicleId]);

  const ongoingTripsData = useMemo(() => {
    return ongoingTrips.map((trip: Trip) => {
      const relVehicle = trip.relationships?.vehicle;
      const bestVehicleId =
        relVehicle?.id ||
        trip.attributes?.vehicleId ||
        trip.attributes?.vehicle_id;
      const fleetVehicle = bestVehicleId
        ? vehicles.find((v: Vehicle) => String(v.id) === String(bestVehicleId))
        : null;
      return {
        ...trip,
        vehiclePlate:
          fleetVehicle?.attributes.registration_number ||
          relVehicle?.registration_number ||
          "N/A",
        vehicleId: bestVehicleId ? String(bestVehicleId) : null,
        startTime: trip.attributes.planned_start_time || trip.attributes?.created_at,
        endTime: trip.attributes.planned_end_time || new Date().toISOString(),
      };
    });
  }, [ongoingTrips, vehicles]);

  const {
    playbackData,
    playbackIndex,
    setPlaybackIndex,
    isPlayingPlayback,
    setIsPlayingPlayback,
    isLoadingPlayback,
  } = usePlaybackData({
    isReplayOpen,
    selectedVehicleId,
    playbackType,
    ongoingTripsData,
    dateRange,
  });

  useEffect(() => {
    setSidebarCollapsed(true);
    return () => setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }, []);

  const wasDisconnectedRef = useRef(false);
  useEffect(() => {
    if (connectionStatus === "disconnected" || connectionStatus === "failed") {
      wasDisconnectedRef.current = true;
    } else if (connectionStatus === "connected" && wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["vehicles-tracking"] });
    }
  }, [connectionStatus, queryClient]);

  const handleLocationSearchSubmit = useCallback(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return;
    const match = vehicles.find((v: Vehicle) => {
      const loc = locations[v.id];
      return (
        v.attributes.registration_number?.toLowerCase().includes(q) ||
        (loc?.address ?? "").toLowerCase().includes(q)
      );
    });
    const loc = match ? locations[match.id] : null;
    if (loc?.lat && loc?.lng) {
      (window as any).leafletMap?.flyTo([loc.lat, loc.lng], 16);
    }
  }, [locationSearch, vehicles, locations]);

  const handleLiveTrack = useCallback(() => {
    const loc = selectedVehicle ? locations[selectedVehicle.id] : null;
    if (loc?.lat && loc?.lng) {
      (window as any).leafletMap?.flyTo([loc.lat, loc.lng], 16);
    }
  }, [selectedVehicle, locations]);

  const handlePlayback = useCallback(() => {
    const hasTrip = ongoingTripsData.some((t) => t.vehicleId === selectedVehicleId);
    setPlaybackType(hasTrip ? "trip" : "history");
    setIsReplayOpen(true);
  }, [ongoingTripsData, selectedVehicleId]);

  return (
    <UpgradeGate
      module="geofence"
      featureName="Live Tracking"
      description="Monitor your fleet in real-time with precise telemetry and location data."
    >
      <div
        ref={containerRef}
        className={cn(
          "h-screen w-full grid overflow-hidden bg-white",
          selectedVehicle ? "grid-rows-[1fr_auto]" : "grid-rows-[1fr]",
          "grid-cols-1",
          selectedVehicle ? "lg:grid-cols-[320px_1fr_400px]" : "lg:grid-cols-[320px_1fr_0px]",
          "transition-[grid-template-columns] duration-300 ease-in-out",
        )}
      >
        <div className="hidden lg:block row-start-1 row-span-2 border-r border-slate-200 overflow-hidden">
          <TrackingSidebar
            viewMode={viewMode}
            vehicles={vehicles}
            filteredVehicles={filteredVehicles}
            locations={locations}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            isLoadingVehicles={isLoadingVehicles}
            statusFilter={statusFilter}
            setStatusFilter={handleStatusFilterChange}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            ongoingTripsCount={ongoingTrips.length}
            ongoingTripsData={ongoingTripsData}
            setIsReplayOpen={setIsReplayOpen}
            isLoadingTrips={isLoadingTrips}
            alarmState={alarmState}
            isFilterActive={isFilterActive}
            onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["vehicles-tracking"] })}
          />
        </div>

        <div className="relative row-start-1 overflow-hidden">
          <TrackingMap
            filteredVehicles={filteredVehicles}
            locations={locations}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={(v) => setSelectedVehicleId(v?.id)}
            vehicles={vehicles}
            TILE_URL={MAP_LAYERS[mapStyle]}
            mapStyle={mapStyle}
            showTraffic={showTraffic}
            trail={selectedTrail}
            getMarkerSVG={getMarkerSVG}
            getVehicleIcon={getVehicleIcon}
            statusFilter={statusFilter}
            zoomResetKey={zoomResetKey}
            showGeofences={showGeofences}
            geofences={geofences}
            interpolator={interpolator}
            alarmState={alarmState}
          />

          <div className="absolute top-4 left-4 right-4 z-30">
            <TrackingTopBar
              locationSearch={locationSearch}
              setLocationSearch={setLocationSearch}
              onLocationSearchSubmit={handleLocationSearchSubmit}
              mapStyle={mapStyle}
              setMapStyle={setMapStyle}
              showTraffic={showTraffic}
              setShowTraffic={setShowTraffic}
              showGeofences={showGeofences}
              setShowGeofences={setShowGeofences}
            />
          </div>

          <div className="absolute left-4 top-24 z-30 flex flex-col gap-3">
            <MapZoomControl />
            <MapExtraControls
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              onRecenter={resetZoom}
            />
          </div>

          <MapLegend />
          <ConnectionBanner />
        </div>

        <div className="hidden lg:block row-start-1 row-span-2 overflow-hidden">
          <AssetPanel
            isOpen={!!selectedVehicle}
            onClose={() => {
              setSelectedVehicleId(null);
              resetZoom();
            }}
            selectedVehicle={selectedVehicle}
            locations={locations}
            vehicles={vehicles}
            onLiveTrack={handleLiveTrack}
            onPlayback={handlePlayback}
            resolved={resolvedTelemetry}
          />
        </div>

        {selectedVehicle && (
          <div className="hidden lg:flex row-start-2 col-start-2 min-w-0 overflow-hidden border-t border-slate-200 bg-white">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <BottomCards
                selectedVehicle={selectedVehicle}
                resolved={resolvedTelemetry}
                hasActiveAlarm={alarmState[selectedVehicle.id] === true}
              />
            </div>
          </div>
        )}

        {/* Mobile (<lg): vehicle detail panel keeps its existing bottom-sheet presentation */}
        <div className="lg:hidden">
          <AssetPanel
            isOpen={!!selectedVehicle}
            onClose={() => {
              setSelectedVehicleId(null);
              resetZoom();
            }}
            selectedVehicle={selectedVehicle}
            locations={locations}
            vehicles={vehicles}
            onLiveTrack={handleLiveTrack}
            onPlayback={handlePlayback}
            resolved={resolvedTelemetry}
          />
        </div>

        <MobileAssetSheet
          vehicles={vehicles}
          filteredVehicles={filteredVehicles}
          locations={locations}
          alarmState={alarmState}
          selectedVehicleId={selectedVehicleId}
          setSelectedVehicleId={setSelectedVehicleId}
          isLoadingVehicles={isLoadingVehicles}
          statusFilter={statusFilter}
          setStatusFilter={handleStatusFilterChange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isFilterActive={isFilterActive}
          onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
        />
      </div>

      <FilterPanelDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        vehicles={vehicles}
        clusters={clusters}
        geofences={geofences}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={() => setFilters(initialFilterState)}
      />

      <TripPlaybackTimeline
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        data={playbackData}
        currentIndex={playbackIndex}
        onIndexChange={setPlaybackIndex}
        isPlaying={isPlayingPlayback}
        setIsPlaying={setIsPlayingPlayback}
        isLoading={isLoadingPlayback}
        title={playbackType === "trip" ? "TRIP REPLAY" : "HISTORY REPLAY"}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </UpgradeGate>
  );
}
