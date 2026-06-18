"use client";

import { useState, useMemo, useEffect } from "react";
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
import { TelemetryDrawer } from "@/components/live/TelemetryDrawer";
import { TripPlaybackTimeline } from "@/components/live/TripPlaybackTimeline";
import { MAP_LAYERS, getMarkerSVG, getVehicleIcon, deriveVehicleStatus } from "./utils";
import { useVehicleLocations } from "./hooks/useVehicleLocations";
import { usePlaybackData } from "./hooks/usePlaybackData";
import { TrackingSidebar } from "./components/TrackingSidebar";
import { TrackingControlDeck } from "./components/TrackingControlDeck";
import { SelectedVehicleBar } from "./components/SelectedVehicleBar";
import { ClusterFilterModal } from "./components/ClusterFilterModal";
import { StatusFilter } from "./components/StatusFilters";

export default function TrackingPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "focused">("all");
  const [mapStyle, setMapStyle] = useState<"standard" | "satellite" | "hybrid">("standard");
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

  const { locations } = useVehicleLocations({
    vehicles,
    token,
    organization,
    subscribePrivate,
  });

  const selectedVehicle = useMemo(
    () =>
      vehicles.find((v: Vehicle) => String(v.id) === String(selectedVehicleId)) || null,
    [vehicles, selectedVehicleId],
  );

  const filteredVehicles = useMemo(() => {
    let result = vehicles;
    if (selectedClusterIds.length > 0) {
      result = result.filter((v: Vehicle) => {
        const clusterId = String(v.relationships?.cluster?.id || "");
        return selectedClusterIds.includes(clusterId);
      });
    }
    if (searchQuery) {
      result = result.filter((v: Vehicle) =>
        v.attributes.registration_number
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((v: Vehicle) => {
        const loc = locations[v.id];
        if (statusFilter === "moving") return loc?.status === "in_transit";
        if (statusFilter === "idle") return loc?.status === "idle";
        if (statusFilter === "parked") return loc?.status === "parked";
        if (statusFilter === "online") return loc?.is_online === true;
        if (statusFilter === "offline") return loc?.is_online === false || !loc;
        return false;
      });
    }
    return result;
  }, [vehicles, searchQuery, statusFilter, locations, selectedClusterIds]);

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

  return (
    <UpgradeGate
      module="geofence"
      featureName="Live Tracking"
      description="Monitor your fleet in real-time with precise telemetry and location data."
    >
      <div className="h-screen w-full flex overflow-hidden bg-slate-100 relative">
        <div className="absolute inset-0 z-0 h-full w-full">
          <TrackingMap
            filteredVehicles={filteredVehicles}
            locations={locations}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={(v) => setSelectedVehicleId(v?.id)}
            vehicles={vehicles}
            TILE_URL={MAP_LAYERS[mapStyle]}
            getMarkerSVG={getMarkerSVG}
            getVehicleIcon={getVehicleIcon}
            statusFilter={statusFilter}
            zoomResetKey={zoomResetKey}
            showGeofences={showGeofences}
            geofences={geofences}
          />
        </div>

        <TrackingSidebar
          viewMode={viewMode}
          vehicles={vehicles}
          filteredVehicles={filteredVehicles}
          locations={locations}
          selectedVehicleId={selectedVehicleId}
          setSelectedVehicleId={setSelectedVehicleId}
          setIsTelemetryOpen={setIsTelemetryOpen}
          isLoadingVehicles={isLoadingVehicles}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          ongoingTripsCount={ongoingTrips.length}
          ongoingTripsData={ongoingTripsData}
          setIsReplayOpen={setIsReplayOpen}
          isLoadingTrips={isLoadingTrips}
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
        />

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
            onTelemetry={() => setIsTelemetryOpen(true)}
            onClose={() => {
              setSelectedVehicleId(null);
              resetZoom();
            }}
          />
        )}
      </div>

      <TelemetryDrawer
        isOpen={isTelemetryOpen}
        onClose={() => {
          setIsTelemetryOpen(false);
          resetZoom();
        }}
        vehicleId={selectedVehicleId}
        vehicle={
          selectedVehicle
            ? (() => {
                const loc = locations[selectedVehicle.id];
                // New API: current_location is flat (no .attributes wrapper)
                const rel = selectedVehicle.relationships?.current_location;
                return {
                  plate: selectedVehicle.attributes.registration_number,
                  make: selectedVehicle.attributes.make,
                  model: selectedVehicle.attributes.model,
                  device_id: selectedVehicle.attributes.device_id ?? null,
                  imei:
                    selectedVehicle.relationships?.device?.imei ??
                    selectedVehicle.relationships?.device?.data?.imei ??
                    null,
                  altitude: loc?.altitude ?? null,
                  movement: loc?.movement ?? null,
                  speed: loc?.speed ?? rel?.speed ?? 0,
                  fuel: loc?.fuel ?? loc?.fuel_level_percent ?? 0,
                  fuel_liters: loc?.fuel_liters ?? loc?.fuel_level_liters,
                  temp: loc?.engine_temperature ?? 0,
                  status:
                    loc?.status ??
                    deriveVehicleStatus(
                      { speed: rel?.speed },
                      selectedVehicle,
                    ),
                  voltage: loc?.battery_voltage,
                  ext_voltage: loc?.external_voltage,
                  signal:
                    loc?.satellites != null
                      ? `${loc.satellites} Sats`
                      : "---",
                  ignition: loc?.ignition ?? false,
                  odometer:
                    loc?.odometer ??
                    selectedVehicle.attributes?.odometer?.lifetime_km,
                  lat: loc?.lat ?? rel?.latitude,
                  lng: loc?.lng ?? rel?.longitude,
                  lastUpdate:
                    loc?.lastUpdate ??
                    selectedVehicle.attributes?.last_packet_received_at ??
                    rel?.last_packet_received_at ??
                    rel?.created_at,
                  address: loc?.address ?? null,
                  heading: loc?.heading ?? 0,
                  rpm: loc?.engine_rpm,
                  fuel_rate: loc?.fuel_rate,
                  eco_score: loc?.eco_score,
                  idling: loc?.idling ?? false,
                  jamming: loc?.jamming ?? false,
                  immobilizer: loc?.immobilizer ?? false,
                  driving_state: loc?.driving_state,
                  raw: loc?.raw ?? rel,
                };
              })()
            : null
        }
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
