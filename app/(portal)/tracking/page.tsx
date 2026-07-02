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
import { usePlaybackData } from "./hooks/usePlaybackData";
import { TrackingSidebar } from "./components/TrackingSidebar";
import { TrackingControlDeck } from "./components/TrackingControlDeck";
import { SelectedVehicleBar } from "./components/SelectedVehicleBar";
import { ClusterFilterModal } from "./components/ClusterFilterModal";
import { StatusFilter } from "./components/StatusFilters";
import { ConnectionBanner } from "./components/ConnectionBanner";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useTrackingUiStore } from "@/store/trackingUiStore";
import { BottomCards } from "./components/BottomCards";
import { MobileAssetSheet } from "./components/MobileAssetSheet";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function TrackingPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "focused">("all");
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("standard");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [clusterModalOpen, setClusterModalOpen] = useState(false);
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
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
  const { setActiveTab } = useTrackingUiStore();

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
    enabled: !!token && showGeofences,
  });

  const vehicles = useMemo(() => vehicleData ?? [], [vehicleData]);
  const ongoingTrips = useMemo(() => tripData?.data?.trips || [], [tripData]);
  const clusters = useMemo(() => clustersData?.data?.clusters || [], [clustersData]);
  const geofences = useMemo(() => geofencesData?.data?.geofences || [], [geofencesData]);

  const { locations, interpolator, alarmState } = useVehicleLocations({
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

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  const filteredVehicles = useMemo(() => {
    let result = vehicles;
    if (selectedClusterIds.length > 0) {
      result = result.filter((v: Vehicle) => {
        const clusterId = String(v.relationships?.cluster?.id || "");
        return selectedClusterIds.includes(clusterId);
      });
    }
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
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
    if (statusFilter !== "all") {
      result = result.filter((v: Vehicle) => {
        const loc = locations[v.id];
        if (statusFilter === "moving") return loc?.status === "in_transit";
        if (statusFilter === "idle") return loc?.status === "idle";
        if (statusFilter === "parked") return loc?.status === "parked";
        if (statusFilter === "online") return loc?.is_online === true;
        if (statusFilter === "offline") return loc?.is_online === false || !loc;
        if (statusFilter === "alarm") return alarmState[v.id] === true;
        return false;
      });
    }
    return result;
  }, [vehicles, debouncedSearchQuery, statusFilter, locations, selectedClusterIds, alarmState]);

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

  // Resync fleet data once, right after the WS connection comes back — the
  // single source of truth for reconnect-refetch (drives the same status the
  // ConnectionBanner reads, so there's no duplicate/competing refetch logic).
  const wasDisconnectedRef = useRef(false);
  useEffect(() => {
    if (connectionStatus === "disconnected" || connectionStatus === "failed") {
      wasDisconnectedRef.current = true;
    } else if (connectionStatus === "connected" && wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["vehicles-tracking"] });
    }
  }, [connectionStatus, queryClient]);

  return (
    <UpgradeGate
      module="geofence"
      featureName="Live Tracking"
      description="Monitor your fleet in real-time with precise telemetry and location data."
    >
      <div ref={containerRef} className="h-screen w-full flex overflow-hidden bg-slate-100 relative">
        <div className="absolute inset-0 z-0 h-full w-full">
          <TrackingMap
            filteredVehicles={filteredVehicles}
            locations={locations}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={(v) => setSelectedVehicleId(v?.id)}
            vehicles={vehicles}
            TILE_URL={MAP_LAYERS[mapStyle]}
            mapStyle={mapStyle}
            getMarkerSVG={getMarkerSVG}
            getVehicleIcon={getVehicleIcon}
            statusFilter={statusFilter}
            zoomResetKey={zoomResetKey}
            showGeofences={showGeofences}
            geofences={geofences}
            interpolator={interpolator}
            alarmState={alarmState}
          />
          <ConnectionBanner />
        </div>

        <TrackingSidebar
          viewMode={viewMode}
          vehicles={vehicles}
          filteredVehicles={filteredVehicles}
          locations={locations}
          selectedVehicleId={selectedVehicleId}
          setSelectedVehicleId={setSelectedVehicleId}
          isLoadingVehicles={isLoadingVehicles}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          ongoingTripsCount={ongoingTrips.length}
          ongoingTripsData={ongoingTripsData}
          setIsReplayOpen={setIsReplayOpen}
          isLoadingTrips={isLoadingTrips}
          alarmState={alarmState}
        />

        <TrackingControlDeck
          viewMode={viewMode}
          setViewMode={setViewMode}
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
          showGeofences={showGeofences}
          setShowGeofences={setShowGeofences}
          selectedClusterIds={selectedClusterIds}
          onOpenClusterModal={() => setClusterModalOpen(true)}
          onRefresh={() =>
            queryClient.invalidateQueries({ queryKey: ["vehicles-tracking"] })
          }
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {selectedVehicle && !isReplayOpen && (
          <div className="hidden md:flex absolute bottom-6 left-6 right-105 z-30 flex-col items-center gap-3 pointer-events-none">
            <BottomCards
              selectedVehicle={selectedVehicle}
              loc={locations[selectedVehicle.id]}
              hasActiveAlarm={alarmState[selectedVehicle.id] === true}
            />
          </div>
        )}

        {selectedVehicle && !isReplayOpen && (
          <SelectedVehicleBar
            selectedVehicle={selectedVehicle}
            locations={locations}
            onReplay={() => {
              const hasTrip = ongoingTripsData.some(
                (t) => t.vehicleId === selectedVehicleId,
              );
              setPlaybackType(hasTrip ? "trip" : "history");
              setIsReplayOpen(true);
            }}
            onTelemetry={() => setActiveTab("details")}
            onClose={() => {
              setSelectedVehicleId(null);
              resetZoom();
            }}
          />
        )}

        <MobileAssetSheet
          vehicles={vehicles}
          filteredVehicles={filteredVehicles}
          locations={locations}
          alarmState={alarmState}
          selectedVehicleId={selectedVehicleId}
          setSelectedVehicleId={setSelectedVehicleId}
          isLoadingVehicles={isLoadingVehicles}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      <AssetPanel
        isOpen={!!selectedVehicle}
        onClose={() => {
          setSelectedVehicleId(null);
          resetZoom();
        }}
        selectedVehicle={selectedVehicle}
        locations={locations}
        vehicles={vehicles}
        onLiveTrack={() => {
          const loc = selectedVehicle ? locations[selectedVehicle.id] : null;
          if (loc?.lat && loc?.lng) {
            (window as any).leafletMap?.flyTo([loc.lat, loc.lng], 16);
          }
        }}
        onPlayback={() => {
          const hasTrip = ongoingTripsData.some((t) => t.vehicleId === selectedVehicleId);
          setPlaybackType(hasTrip ? "trip" : "history");
          setIsReplayOpen(true);
        }}
      />

      <ClusterFilterModal
        open={clusterModalOpen}
        onOpenChange={setClusterModalOpen}
        clusters={clusters}
        selectedClusterIds={selectedClusterIds}
        setSelectedClusterIds={setSelectedClusterIds}
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
