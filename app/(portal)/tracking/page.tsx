"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { subHours } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Vehicle, Trip } from "@/types";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useTrackingUiStore } from "@/store/trackingUiStore";
import { useEcho } from "@/hooks/useEcho";
import * as api from "@/lib/api/vehicles";
import * as tripApi from "@/lib/api/trips";
import { getClusters } from "@/lib/api/settings";
import { getGeofences } from "@/lib/api/geofencing";
import TrackingMap from "./TrackingMap";
import { AssetPanel } from "./components/AssetPanel";
import { getVehicleIcon, type TrackingMapStyle } from "./utils";
import { useVehicleLocations } from "./hooks/useVehicleLocations";
import { useMapProvider } from "./hooks/useMapProvider";
import { MapInstanceProvider } from "./MapInstanceContext";
import { useResolvedVehicleTelemetry } from "@/hooks/useResolvedVehicleTelemetry";
import { buildVehicleSnapshot } from "@/lib/resolveVehicleTelemetry";
import { TrackingSidebar } from "./components/TrackingSidebar";
import { TrackingTopBar } from "./components/TrackingTopBar";
import { MapZoomControl } from "./components/MapZoomControl";
import { MapExtraControls } from "./components/MapExtraControls";
import { MapLegend } from "./components/MapLegend";
import {
  FilterPanelDrawer,
  FilterState,
  initialFilterState,
} from "./components/FilterPanelDrawer";
import { StatusFilter } from "./components/StatusFilters";
import { ConnectionBanner } from "./components/ConnectionBanner";
import { StreetImageryPanel } from "./components/StreetImageryPanel";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { BottomCards } from "./components/BottomCards";
import { MobileAssetSheet } from "./components/MobileAssetSheet";
import { cn, normalizeTelemetry } from "@/lib/utils";
import { matchesStatusBucket, type StatusBucket } from "@/lib/vehicleStatus";

export default function TrackingPage() {
  const queryClient = useQueryClient();
  const isAssetListCollapsed = useTrackingUiStore(
    (s) => s.isAssetListCollapsed,
  );
  const [locationSearch, setLocationSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  // The view-mode toggle UI (All Assets / Active Trips) was removed from the map
  // toolbar per design feedback; "focused" is currently unreachable, but the
  // underlying Active Trips code path in TrackingSidebar is left intact in case
  // this is reintroduced elsewhere later.
  const [viewMode] = useState<"all" | "focused">("all");
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("standard");
  const [showTraffic, setShowTraffic] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [showGeofences, setShowGeofences] = useState(false);
  const [zoomResetKey, setZoomResetKey] = useState(0);

  const resetZoom = () => setZoomResetKey((prev) => prev + 1);

  const mapInstance = useMapProvider({
    containerRef: mapContainerRef,
    initialCenter: { lat: 6.5244, lng: 3.3792 },
    initialZoom: 12,
    styleKey: mapStyle,
  });

  const router = useRouter();
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
  const clusters = useMemo(
    () => clustersData?.data?.clusters || [],
    [clustersData],
  );
  const geofences = useMemo(
    () => geofencesData?.data?.geofences || [],
    [geofencesData],
  );

  const { locations, setLocations, interpolator, alarmState, trails } =
    useVehicleLocations({
      vehicles,
      token,
      organization,
      subscribePrivate,
      selectedVehicleId,
    });

  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (v: Vehicle) =>
          String(v.attributes?.uuid) === String(selectedVehicleId),
      ) || null,
    [vehicles, selectedVehicleId],
  );

  const selectedTrail = useMemo(
    () => (selectedVehicleId ? (trails[selectedVehicleId] ?? []) : []),
    [trails, selectedVehicleId],
  );

  // Hoisted here (rather than inside AssetPanel) so it opens exactly one set of
  // per-vehicle WS channels — AssetPanel renders twice simultaneously (desktop +
  // mobile variants, toggled with CSS breakpoints, not conditional mounting), and
  // BottomCards needs the same live-resolved telemetry, so all three consume this
  // single subscription instead of each opening their own.
  const selectedLoc = selectedVehicle
    ? locations[selectedVehicle.attributes.uuid]
    : null;
  const selectedVehicleSnapshot = useMemo(
    () => buildVehicleSnapshot(selectedVehicle, selectedLoc),
    [selectedVehicle, selectedLoc],
  );
  const resolvedTelemetry = useResolvedVehicleTelemetry(
    selectedVehicle?.attributes.uuid ?? null,
    selectedVehicleSnapshot,
    !!selectedVehicle,
  );

  // The selected vehicle has an extra, faster per-vehicle WS channel open
  // (location.vehicle.{id}) that the bottom sheet reads directly — so its speed
  // updated ahead of the sidebar list and map badge, which read the shared
  // locations[] map fed by the slower fleet channel. Fold each per-vehicle packet
  // back into locations[id] so all three surfaces update from the same value at
  // the same (fast) cadence. Guarded so it only writes when the packet is actually
  // newer, and only for the currently-selected vehicle.
  const rawTelemetry = resolvedTelemetry.rawTelemetry;
  useEffect(() => {
    if (!selectedVehicleId || !rawTelemetry) return;
    const normalized = normalizeTelemetry(rawTelemetry);
    if (!normalized) return;
    setLocations((prev) => {
      const prevEntry = prev[selectedVehicleId];
      const prevUpdateMs = prevEntry?.lastUpdate
        ? new Date(prevEntry.lastUpdate).getTime()
        : 0;
      const pktTs = normalized.timestamp_utc || normalized.gps_datetime;
      const pktUpdateMs = pktTs ? new Date(pktTs).getTime() : Date.now();
      // Never let an older per-vehicle packet clobber a fresher fleet-channel one.
      if (prevEntry && prevUpdateMs > pktUpdateMs) return prev;
      return {
        ...prev,
        [selectedVehicleId]: {
          ...prevEntry,
          ...normalized,
          statusSinceMs: prevEntry?.statusSinceMs ?? Date.now(),
          lastUpdate: pktTs ?? prevEntry?.lastUpdate,
          lastPacket:
            normalized.last_packet_received_at ??
            pktTs ??
            prevEntry?.lastPacket,
          fuel: normalized.fuel_level_percent ?? prevEntry?.fuel,
          fuel_liters: normalized.fuel_level_liters ?? prevEntry?.fuel_liters,
          raw: normalized,
        },
      };
    });
  }, [rawTelemetry, selectedVehicleId, setLocations]);

  // Single source of truth for the search text — both the sidebar input and
  // the filter drawer read/write filters.search directly. (Previously this was
  // mirrored into a separate searchQuery state via two useEffects syncing each
  // way, which was fragile and could cascade into a render loop.)
  const setSearchQuery = useCallback((value: string) => {
    setFilters((prev) =>
      prev.search === value ? prev : { ...prev, search: value },
    );
  }, []);

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
      } else if (newStatus === "online") {
        // "Online" = every live vehicle (moving + idle + parked), the complement
        // of offline. Previously this case was missing, so clicking Online left
        // the previous filter in place — the list kept showing offline assets.
        return { ...prev, statuses: ["online"] };
      } else if (newStatus === "alarm") {
        return { ...prev, statuses: ["alarm"] };
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
      else if (s[0] === "online") setStatusFilter("online");
      else if (s[0] === "alarm") setStatusFilter("alarm");
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
  const getDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
    },
    [],
  );

  // Geofence Inclusion Check
  const isVehicleInGeofence = useCallback(
    (lat: number, lng: number, geofence: any) => {
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
        if (
          coordinates.type === "Polygon" &&
          Array.isArray(coordinates.coordinates)
        ) {
          vertices = coordinates.coordinates[0].map(
            ([lg, lt]: [number, number]) => [lt, lg],
          );
        } else if (Array.isArray(coordinates)) {
          vertices = coordinates.map((p: any) => {
            if (Array.isArray(p)) {
              return [p[1], p[0]] as [number, number];
            }
            return [p.lat ?? p.latitude, p.lng ?? p.longitude] as [
              number,
              number,
            ];
          });
        }

        if (vertices.length === 0) return false;

        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const xi = vertices[i][0],
            yi = vertices[i][1];
          const xj = vertices[j][0],
            yj = vertices[j][1];
          const intersect =
            yi > lng !== yj > lng &&
            lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        return inside;
      }
      return false;
    },
    [getDistance],
  );

  // Everything except the search query — shared by the sidebar list (search
  // narrows further, below) and the map (search never hides pins; it only
  // highlights matches, see searchMatchIds), so status/group/etc. filters stay
  // in effect for the map while free-text search doesn't affect what's plotted.
  const applyNonSearchFilters = useCallback(
    (vehiclesToFilter: Vehicle[]) => {
      let result = vehiclesToFilter;

      // 2. Group/Cluster filter
      if (filters.group !== "all") {
        result = result.filter((v: Vehicle) => {
          const clusterId = String(v.relationships?.cluster?.id || "");
          return String(filters.group) === clusterId;
        });
      }

      // 3. Status filter — resolve each vehicle through the SAME canonical status
      // logic the sidebar cards / panels / markers use (matchesStatusBucket →
      // resolveStatusKey), so a vehicle can never fall into a filter bucket whose
      // label disagrees with the status shown on its card. "all" is the full set of
      // buckets, so only actually-narrowed filters run this pass.
      const ALL_STATUS_BUCKETS = ["moving", "idle", "stopped", "offline"];
      const isNarrowed =
        filters.statuses.length > 0 &&
        !ALL_STATUS_BUCKETS.every((b) => filters.statuses.includes(b));
      if (isNarrowed) {
        result = result.filter((v: Vehicle) => {
          const loc = locations[v.attributes.uuid];
          const isOnline = loc?.is_online ?? v.attributes.is_online ?? false;
          const input = {
            status: loc?.status,
            is_online: isOnline,
            speed: loc?.speed,
          };
          const hasAlarm = alarmState[v.attributes.uuid] === true;
          return filters.statuses.some((bucket) =>
            matchesStatusBucket(bucket as StatusBucket, input, hasAlarm),
          );
        });
      }

      // 4. Location & Radius filter
      if (filters.locationType === "radius" && filters.locationCoords) {
        const { latitude: centerLat, longitude: centerLng } =
          filters.locationCoords;
        result = result.filter((v: Vehicle) => {
          const loc = locations[v.attributes.uuid];
          if (!loc?.lat || !loc?.lng) return false;
          const dist = getDistance(loc.lat, loc.lng, centerLat, centerLng);
          return dist <= filters.radiusKm;
        });
      }

      // 5. Geofence filter
      if (filters.geofenceId !== "all") {
        const selectedGeofence = geofences.find(
          (g) => String(g.id) === filters.geofenceId,
        );
        if (selectedGeofence) {
          result = result.filter((v: Vehicle) => {
            const loc = locations[v.attributes.uuid];
            if (!loc?.lat || !loc?.lng) return false;
            return isVehicleInGeofence(loc.lat, loc.lng, selectedGeofence);
          });
        }
      }

      // 6. Vehicle Type
      if (filters.vehicleType !== "all") {
        result = result.filter((v: Vehicle) => {
          const t = (
            v.attributes.body_type ||
            v.attributes.type ||
            ""
          ).toLowerCase();
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
      // 10. Speed Range
      if (filters.speedRange[0] > 0 || filters.speedRange[1] < 120) {
        result = result.filter((v: Vehicle) => {
          const loc = locations[v.attributes.uuid];
          const speed = loc?.speed ?? 0;
          return (
            speed >= filters.speedRange[0] && speed <= filters.speedRange[1]
          );
        });
      }

      // 11. Engine Status
      if (filters.engineStatus !== "all") {
        result = result.filter((v: Vehicle) => {
          const loc = locations[v.attributes.uuid];
          const isIgnitionOn =
            loc?.ignition === "on" ||
            loc?.ignition === "1" ||
            loc?.ignition === true;
          if (filters.engineStatus === "on") return isIgnitionOn;
          if (filters.engineStatus === "off") return !isIgnitionOn;
          return true;
        });
      }

      // 12. Fuel Level
      if (filters.fuelLevel !== "all") {
        result = result.filter((v: Vehicle) => {
          const loc = locations[v.attributes.uuid];
          const fuel = loc?.fuel_level_percent ?? 0;
          if (filters.fuelLevel === "low") return fuel < 20;
          if (filters.fuelLevel === "medium") return fuel >= 20 && fuel <= 70;
          if (filters.fuelLevel === "high") return fuel > 70;
          return true;
        });
      }

      return result;
    },
    [
      filters,
      locations,
      alarmState,
      geofences,
      getDistance,
      isVehicleInGeofence,
    ],
  );

  // Map pins: every filter except search, so typing in the sidebar search box
  // never hides pins — only the sidebar list narrows.
  const mapVehicles = useMemo(
    () => applyNonSearchFilters(vehicles),
    [vehicles, applyNonSearchFilters],
  );

  // Sidebar list: map-filtered set further narrowed by the registration search.
  const filteredVehicles = useMemo(() => {
    if (!filters.search) return mapVehicles;
    const q = filters.search.trim().toLowerCase();
    return mapVehicles.filter((v: Vehicle) =>
      (v.attributes.registration_number ?? "").toLowerCase().includes(q),
    );
  }, [mapVehicles, filters.search]);

  // Vehicles matching the search text, so the map can highlight them without
  // removing the rest of the fleet's pins.
  const searchMatchIds = useMemo(() => {
    if (!filters.search) return null;
    return new Set(filteredVehicles.map((v: Vehicle) => v.attributes.uuid));
  }, [filteredVehicles, filters.search]);

  // Clear selection if the selected vehicle drops out of the map-visible set
  // (status/group/etc. filters) — deliberately NOT keyed on filteredVehicles,
  // since search narrows only the sidebar list and shouldn't deselect a pin
  // that's still plotted on the map.
  useEffect(() => {
    if (
      selectedVehicleId &&
      !mapVehicles.find(
        (v: Vehicle) => String(v.attributes.uuid) === String(selectedVehicleId),
      )
    ) {
      setSelectedVehicleId(null);
    }
  }, [mapVehicles, selectedVehicleId]);

  const ongoingTripsData = useMemo(() => {
    return ongoingTrips.map((trip: Trip) => {
      const relVehicle = trip.relationships?.vehicle;
      const bestVehicleId =
        relVehicle?.id ||
        trip.attributes?.vehicleId ||
        trip.attributes?.vehicle_id;
      const fleetVehicle = bestVehicleId
        ? vehicles.find(
            (v: Vehicle) =>
              String(v.attributes?.uuid) === String(bestVehicleId) ||
              String(v.id) === String(bestVehicleId),
          )
        : null;
      return {
        ...trip,
        vehiclePlate:
          fleetVehicle?.attributes.registration_number ||
          relVehicle?.registration_number ||
          "N/A",
        vehicleId: bestVehicleId ? String(bestVehicleId) : null,
        startTime:
          trip.attributes.planned_start_time || trip.attributes?.created_at,
        endTime: trip.attributes.planned_end_time || new Date().toISOString(),
      };
    });
  }, [ongoingTrips, vehicles]);

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
      const loc = locations[v.attributes.uuid];
      return (
        v.attributes.registration_number?.toLowerCase().includes(q) ||
        (loc?.address ?? "").toLowerCase().includes(q)
      );
    });
    const loc = match ? locations[match.attributes.uuid] : null;
    if (loc?.lat && loc?.lng) {
      mapInstance.provider?.flyTo({ lat: loc.lat, lng: loc.lng }, 16);
    }
  }, [locationSearch, vehicles, locations, mapInstance.provider]);

  const handleLiveTrack = useCallback(() => {
    const loc = selectedVehicle
      ? locations[selectedVehicle.attributes.uuid]
      : null;
    if (loc?.lat && loc?.lng) {
      mapInstance.provider?.flyTo({ lat: loc.lat, lng: loc.lng }, 18);
    }
  }, [selectedVehicle, locations, mapInstance.provider]);

  const navigateToPlayback = useCallback(
    (vehicleId: string, tripId?: string | null) => {
      const params = new URLSearchParams({ vehicleId });
      if (tripId) {
        params.set("tripId", tripId);
      } else {
        const end = new Date();
        const start = subHours(end, 6);
        params.set("start", start.toISOString());
        params.set("end", end.toISOString());
      }
      router.push(`/tracking/playback?${params.toString()}`);
    },
    [router],
  );

  const handlePlayback = useCallback(() => {
    if (!selectedVehicleId) return;
    const trip = ongoingTripsData.find(
      (t) => t.vehicleId === selectedVehicleId,
    );
    navigateToPlayback(selectedVehicleId, trip?.id ?? null);
  }, [ongoingTripsData, selectedVehicleId, navigateToPlayback]);

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
          isAssetListCollapsed
            ? selectedVehicle
              ? "lg:grid-cols-[0px_1fr_400px]"
              : "lg:grid-cols-[0px_1fr_0px]"
            : selectedVehicle
              ? "lg:grid-cols-[320px_1fr_400px]"
              : "lg:grid-cols-[320px_1fr_0px]",
          "transition-[grid-template-columns] duration-300 ease-in-out",
        )}
      >
        <div
          className={cn(
            "hidden lg:block row-start-1 row-span-2",
            isAssetListCollapsed
              ? "overflow-visible"
              : "border-r border-slate-200 overflow-hidden",
          )}
        >
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
            searchQuery={filters.search}
            setSearchQuery={setSearchQuery}
            ongoingTripsCount={ongoingTrips.length}
            ongoingTripsData={ongoingTripsData}
            onReplayVehicle={navigateToPlayback}
            isLoadingTrips={isLoadingTrips}
            alarmState={alarmState}
            isFilterActive={isFilterActive}
            onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
            onRefresh={() =>
              queryClient.invalidateQueries({ queryKey: ["vehicles-tracking"] })
            }
            viewType={filters.viewType}
            clusters={clusters}
          />
        </div>

        <div className="relative row-start-1 overflow-hidden">
          <MapInstanceProvider value={mapInstance}>
            <TrackingMap
              containerRef={mapContainerRef}
              filteredVehicles={mapVehicles}
              searchMatchIds={searchMatchIds}
              locations={locations}
              selectedVehicle={selectedVehicle}
              setSelectedVehicle={(v) =>
                setSelectedVehicleId(v?.attributes.uuid ?? null)
              }
              showTraffic={showTraffic}
              trail={selectedTrail}
              getVehicleIcon={getVehicleIcon}
              statusFilter={statusFilter}
              zoomResetKey={zoomResetKey}
              showGeofences={showGeofences}
              geofences={geofences}
              interpolator={interpolator}
              alarmState={alarmState}
            />

            <div
              className={cn(
                "absolute top-4 right-4 z-30 transition-[left] duration-300 ease-in-out",
                isAssetListCollapsed ? "left-14" : "left-4",
              )}
            >
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
            <StreetImageryPanel locations={locations} />
          </MapInstanceProvider>
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
            hasActiveAlarm={
              selectedVehicle
                ? alarmState[selectedVehicle.attributes.uuid] === true
                : false
            }
          />
        </div>

        {selectedVehicle && (
          <div className="hidden lg:flex row-start-2 col-start-2 min-w-0 overflow-hidden border-t border-slate-200 bg-white">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <BottomCards
                selectedVehicle={selectedVehicle}
                resolved={resolvedTelemetry}
                loc={selectedLoc}
                hasActiveAlarm={
                  alarmState[selectedVehicle.attributes.uuid] === true
                }
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
            hasActiveAlarm={
              selectedVehicle
                ? alarmState[selectedVehicle.attributes.uuid] === true
                : false
            }
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
          searchQuery={filters.search}
          setSearchQuery={setSearchQuery}
          isFilterActive={isFilterActive}
          onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
          viewType={filters.viewType}
          clusters={clusters}
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
