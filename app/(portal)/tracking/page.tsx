"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { subHours } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@/types";
import type { VehicleMapEntry } from "@/lib/api/vehicles";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useTrackingUiStore } from "@/store/trackingUiStore";
import { useEcho } from "@/hooks/useEcho";
import * as tripApi from "@/lib/api/trips";
import { getClusters } from "@/lib/api/settings";
import { getGeofences } from "@/lib/api/geofencing";
import TrackingMap from "./TrackingMap";
import { AssetPanel } from "./components/AssetPanel";
import { getVehicleIcon, type TrackingMapStyle } from "./utils";
import { useVehicleLocations } from "./hooks/useVehicleLocations";
import { useProgressiveVehicles } from "./hooks/useProgressiveVehicles";
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
import { FleetLoadProgressBanner } from "./components/FleetLoadProgressBanner";
import { StreetImageryPanel } from "./components/StreetImageryPanel";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { BottomCards } from "./components/BottomCards";
import { MobileAssetSheet } from "./components/MobileAssetSheet";
import { cn, normalizeTelemetry } from "@/lib/utils";
import { matchesStatusBucket, type StatusBucket } from "@/lib/vehicleStatus";

const TRACKING_FILTERS_STORAGE_KEY = "tracking-filters-v1";

/** Hydrates saved filter selections from a prior session. Falls back to
 * defaults on first visit, a private/blocked storage context, or a stored
 * shape that no longer matches the current FilterState (e.g. after a field
 * was renamed) — a stale value must never crash the page. */
function loadStoredFilters(): FilterState {
  if (typeof window === "undefined") return initialFilterState;
  try {
    const raw = window.localStorage.getItem(TRACKING_FILTERS_STORAGE_KEY);
    if (!raw) return initialFilterState;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return initialFilterState;
    return { ...initialFilterState, ...parsed };
  } catch {
    return initialFilterState;
  }
}

export default function TrackingPage() {
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
  const [filters, setFilters] = useState<FilterState>(() => loadStoredFilters());
  const [showGeofences, setShowGeofences] = useState(false);
  const [zoomResetKey, setZoomResetKey] = useState(0);

  const resetZoom = () => setZoomResetKey((prev) => prev + 1);

  const mapInstance = useMapProvider({
    containerRef: mapContainerRef,
    initialCenter: { lat: 6.5244, lng: 3.3792 },
    initialZoom: 12,
    styleKey: mapStyle,
    preferredProviderKind: "leaflet",
    tileSource: "google",
  });

  const router = useRouter();
  const { token, organization } = useAuthStore();
  const { setSidebarCollapsed } = useUIStore();
  const { subscribePrivate } = useEcho();
  const { status: connectionStatus } = useConnectionStatus();

  // Debounced so typing doesn't fire a request per keystroke — the sidebar
  // list swaps to server search results once this settles; the map keeps
  // showing the always-on `fleet` feed the whole time (see searchMatchIds).
  const debouncedSearch = useDebouncedValue(filters.search.trim(), 300);

  const fleet = useProgressiveVehicles({ enabled: !!token });
  const searchResult = useProgressiveVehicles({
    q: debouncedSearch || undefined,
    enabled: !!token && !!debouncedSearch,
  });
  // Skeleton rows only while nothing has landed yet — once the first page
  // resolves, the sidebar renders those rows immediately and grows as further
  // pages arrive, same as the map's markers. fleet.isInitialLoad stays true
  // for the whole multi-page walk, so it's only used to gate the load banner.
  const isLoadingVehicles = fleet.vehicles.length === 0 && fleet.isLoading;

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

  const vehicles = fleet.vehicles;
  const ongoingTrips = useMemo(() => tripData?.data?.trips || [], [tripData]);
  const clusters = useMemo(
    () => clustersData?.data?.clusters || [],
    [clustersData],
  );
  const geofences = useMemo(
    () => geofencesData?.data?.geofences || [],
    [geofencesData],
  );

  const { locations, setLocations, interpolator, alarmState, trails, selectedVehicleDetail } =
    useVehicleLocations({
      vehicles,
      token,
      organization,
      subscribePrivate,
      selectedVehicleId,
    });

  // The panel/bottom-cards need richer fields (make, body_type, device/imei)
  // than the slim view=map list entry carries — selectedVehicleDetail (from
  // GET /vehicles/{id}?view=telemetry) is the source of truth once it resolves.
  // Until then, fall back to a minimal envelope built from the map-list entry
  // so the panel can open immediately with at least registration/model/status.
  const selectedMapEntry = useMemo(
    () => vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null,
    [vehicles, selectedVehicleId],
  );
  const selectedVehicle = useMemo(() => {
    if (selectedVehicleDetail && String(selectedVehicleDetail.id) === String(selectedVehicleId)) {
      return selectedVehicleDetail;
    }
    if (!selectedMapEntry) return null;
    return {
      id: selectedMapEntry.id,
      attributes: { registration_number: selectedMapEntry.attributes.registration_number, model: selectedMapEntry.attributes.model },
      relationships: {},
    };
  }, [selectedVehicleDetail, selectedVehicleId, selectedMapEntry]);

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
    ? locations[selectedVehicle.id]
    : null;
  const selectedVehicleSnapshot = useMemo(
    () => buildVehicleSnapshot(selectedVehicle, selectedLoc),
    [selectedVehicle, selectedLoc],
  );
  const resolvedTelemetry = useResolvedVehicleTelemetry(
    selectedVehicle?.id ?? null,
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

  // Persist filter selections so returning to Live Tracking restores the
  // same view instead of resetting to "All" every time.
  useEffect(() => {
    try {
      window.localStorage.setItem(TRACKING_FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Storage can be unavailable (private browsing, quota) — filters just
      // won't persist this session, which is a safe degradation.
    }
  }, [filters]);

  const isFilterActive = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.clusterIds.length > 0 ||
      filters.statuses.length < 4 ||
      filters.locationType === "radius" ||
      filters.geofenceId !== "all" ||
      filters.vehicleModel !== "all" ||
      filters.speedRange[0] > 0 ||
      filters.speedRange[1] < 120 ||
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
  // highlights matches, see searchMatchIds), so status/cluster/etc. filters
  // stay in effect for the map while free-text search doesn't affect what's
  // plotted. Vehicle type, make, and year filters stay dropped: GET
  // /vehicles?view=map (the panel/map feed) carries none of body_type/type,
  // make, or year — there's no data left to filter on for this page. Cluster
  // filtering now works too, since view=map's attributes.cluster_id is real.
  const applyNonSearchFilters = useCallback(
    (vehiclesToFilter: VehicleMapEntry[], options?: { skipStatus?: boolean }) => {
      let result = vehiclesToFilter;

      // Status filter — resolve each vehicle through the SAME canonical status
      // logic the sidebar cards / panels / markers use (matchesStatusBucket →
      // resolveStatusKey), so a vehicle can never fall into a filter bucket whose
      // label disagrees with the status shown on its card. "all" is the full set of
      // buckets, so only actually-narrowed filters run this pass. skipStatus lets
      // the summary cards compute against every OTHER active filter while still
      // comparing all statuses against each other, instead of collapsing to the
      // single bucket a status card click just selected.
      const ALL_STATUS_BUCKETS = ["moving", "idle", "stopped", "offline"];
      const isNarrowed =
        filters.statuses.length > 0 &&
        !ALL_STATUS_BUCKETS.every((b) => filters.statuses.includes(b));
      if (isNarrowed && !options?.skipStatus) {
        result = result.filter((v: VehicleMapEntry) => {
          const loc = locations[v.id];
          const isOnline = loc?.is_online ?? false;
          const input = {
            status: loc?.status,
            is_online: isOnline,
            speed: loc?.speed,
          };
          const hasAlarm = alarmState[v.id] === true;
          return filters.statuses.some((bucket) =>
            matchesStatusBucket(bucket as StatusBucket, input, hasAlarm),
          );
        });
      }

      // Cluster filter — OR within the selected clusters, ANDed with every
      // other filter group. Vehicles with no cluster assignment never match a
      // narrowed cluster filter (they only show up when "All Clusters" is set).
      if (filters.clusterIds.length > 0) {
        result = result.filter((v: VehicleMapEntry) =>
          filters.clusterIds.includes(String(v.attributes.cluster_id)),
        );
      }

      // Location & Radius filter
      if (filters.locationType === "radius" && filters.locationCoords) {
        const { latitude: centerLat, longitude: centerLng } =
          filters.locationCoords;
        result = result.filter((v: VehicleMapEntry) => {
          const loc = locations[v.id];
          if (!loc?.lat || !loc?.lng) return false;
          const dist = getDistance(loc.lat, loc.lng, centerLat, centerLng);
          return dist <= filters.radiusKm;
        });
      }

      // Geofence filter
      if (filters.geofenceId !== "all") {
        const selectedGeofence = geofences.find(
          (g) => String(g.id) === filters.geofenceId,
        );
        if (selectedGeofence) {
          result = result.filter((v: VehicleMapEntry) => {
            const loc = locations[v.id];
            if (!loc?.lat || !loc?.lng) return false;
            return isVehicleInGeofence(loc.lat, loc.lng, selectedGeofence);
          });
        }
      }

      // Vehicle Model
      if (filters.vehicleModel !== "all") {
        result = result.filter((v: VehicleMapEntry) => {
          const md = (v.attributes.model || "").toLowerCase();
          return md === filters.vehicleModel.toLowerCase();
        });
      }

      // Speed Range
      if (filters.speedRange[0] > 0 || filters.speedRange[1] < 120) {
        result = result.filter((v: VehicleMapEntry) => {
          const loc = locations[v.id];
          const speed = loc?.speed ?? 0;
          return (
            speed >= filters.speedRange[0] && speed <= filters.speedRange[1]
          );
        });
      }

      // Fuel Level — vehicles with no fuel reading are excluded from every
      // band rather than defaulting to 0%, so "no data" is never
      // misread as "Low".
      if (filters.fuelLevel !== "all") {
        result = result.filter((v: VehicleMapEntry) => {
          const loc = locations[v.id];
          const fuel = loc?.fuel_level_percent;
          if (fuel == null) return false;
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

  // Map pins: every filter except search, always sourced from the always-on
  // full-fleet feed — search never shrinks the map's pin set, only the
  // sidebar list (below) narrows via the server-searched result.
  const mapVehicles = useMemo(
    () => applyNonSearchFilters(vehicles),
    [vehicles, applyNonSearchFilters],
  );

  // Summary-card totals: every active filter EXCEPT status, so clicking a
  // status card (Moving/Stopped/etc.) narrows the list below without also
  // collapsing the other cards to zero — they stay comparable at all times.
  const cardScopedVehicles = useMemo(
    () => applyNonSearchFilters(vehicles, { skipStatus: true }),
    [vehicles, applyNonSearchFilters],
  );

  // Sidebar list: while a search is active, this is the server-searched result
  // (still passed through the same non-search filters for consistency with the
  // status pills / filter drawer); otherwise it's the map-filtered full fleet.
  const filteredVehicles = useMemo(() => {
    if (!debouncedSearch) return mapVehicles;
    return applyNonSearchFilters(searchResult.vehicles);
  }, [debouncedSearch, mapVehicles, searchResult.vehicles, applyNonSearchFilters]);

  // Vehicles matching the active search, so the map can highlight them without
  // removing the rest of the fleet's pins (map pins always come from mapVehicles).
  const searchMatchIds = useMemo(() => {
    if (!debouncedSearch) return null;
    return new Set(filteredVehicles.map((v: VehicleMapEntry) => v.id));
  }, [filteredVehicles, debouncedSearch]);

  // Clear selection if the selected vehicle drops out of the map-visible set
  // (status/group/etc. filters) — deliberately NOT keyed on filteredVehicles,
  // since search narrows only the sidebar list and shouldn't deselect a pin
  // that's still plotted on the map.
  useEffect(() => {
    if (
      selectedVehicleId &&
      !mapVehicles.find(
        (v: VehicleMapEntry) => String(v.id) === String(selectedVehicleId),
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
            (v: VehicleMapEntry) => String(v.id) === String(bestVehicleId),
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

  // A flapping WS connection (repeated disconnect/reconnect within seconds,
  // e.g. a socket host issue) fires "connected" on every brief blip — refreshing
  // the fleet on each one restarts the whole view=map page-walk mid-flight,
  // which is what produced the "loads, stops partway, starts over" symptom.
  // Only refresh once the connection has genuinely stayed up for a few
  // seconds, and cancel the pending refresh if it drops again before then.
  const wasDisconnectedRef = useRef(false);
  useEffect(() => {
    if (connectionStatus === "disconnected" || connectionStatus === "failed") {
      wasDisconnectedRef.current = true;
      return;
    }
    if (connectionStatus !== "connected" || !wasDisconnectedRef.current) return;

    const timeoutId = setTimeout(() => {
      wasDisconnectedRef.current = false;
      fleet.refresh();
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, [connectionStatus, fleet.refresh]);

  // Was previously a vehicle-registration/last-known-address lookup mislabeled
  // as "search location" — most vehicles never have an address (it's only
  // populated by reverse-geocoding the currently-selected vehicle), so it
  // worked only when searching a plate number. Now a real place search via
  // LocationAutocomplete's place suggestions — it hands back the selected
  // place's coordinates directly, no vehicle lookup involved.
  const handleLocationSelect = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      mapInstance.provider?.flyTo({ lat: coords.latitude, lng: coords.longitude }, 16);
    },
    [mapInstance.provider],
  );

  const handleLiveTrack = useCallback(() => {
    const loc = selectedVehicle
      ? locations[selectedVehicle.id]
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
      {fleet.error != null && (
        // The fleet list failed to load or refresh. Without this the map is empty or quietly out of date,
        // which looks like "no vehicles" or "nothing has moved".
        <div
          role="alert"
          className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 shadow"
        >
          {fleet.vehicles.length === 0 ? "Vehicles could not be loaded." : "Vehicles could not be refreshed; the positions shown may be out of date."}
          <button type="button" onClick={() => fleet.refresh()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}
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
            cardScopedVehicles={cardScopedVehicles}
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
            onRefresh={() => fleet.refresh()}
            viewType={filters.viewType}
            clusters={clusters}
            geofences={geofences}
            filters={filters}
            onApplyFilters={setFilters}
            onResetFilters={() => setFilters(initialFilterState)}
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
                setSelectedVehicleId(v?.id ?? null)
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
                onLocationSelect={handleLocationSelect}
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
            {fleet.isInitialLoad && fleet.total != null && (
              <FleetLoadProgressBanner loaded={fleet.loadedCount} total={fleet.total} />
            )}
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
                ? alarmState[selectedVehicle.id] === true
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
                  alarmState[selectedVehicle.id] === true
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
                ? alarmState[selectedVehicle.id] === true
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
