import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeTelemetry } from "@/lib/utils";
import { Vehicle } from "@/types";
import { isStaleOffline } from "../utils";
import { VehicleInterpolator } from "@/lib/vehicleInterpolation";
import { buildPacketEntry } from "@/lib/packetStream";
import { usePacketStreamStore } from "@/store/packetStreamStore";
import { appendTrailPoint, type TrailPoint } from "@/lib/vehicleTrail";
import { getVehicleLocation } from "@/lib/api/vehicles";

interface UseVehicleLocationsProps {
  vehicles: Vehicle[];
  token: string | null;
  organization: any;
  subscribePrivate: (
    channel: string,
    event: string,
    callback: (data: any) => void,
  ) => (() => void) | undefined;
  /**
   * Currently selected/viewed vehicle id — used only to scope which vehicle's
   * events get pushed into the Live IoT Packet Stream ring buffer. Alarm state
   * and marker positions still update for every vehicle regardless of selection;
   * only the packet-stream buffer is selection-scoped, to avoid retaining a
   * per-vehicle ring buffer for every vehicle in a large fleet at once.
   */
  selectedVehicleId?: string | null;
}

/** How long a fuel-anomaly alarm stays active if nothing else re-triggers or clears it. */
const FUEL_ALARM_AUTO_CLEAR_MS = 10 * 60_000;

export function useVehicleLocations({
  vehicles,
  token,
  organization,
  subscribePrivate,
  selectedVehicleId,
}: UseVehicleLocationsProps) {
  const [locations, setLocations] = useState<Record<string, any>>({});
  const [alarmState, setAlarmState] = useState<Record<string, boolean>>({});
  // Lazy-initialized state (not a ref) so the stable instance can be read during
  // render without tripping the "no ref access during render" rule — the setter
  // is never called again after the initial render, so this never re-renders.
  const [interpolator] = useState(() => new VehicleInterpolator());
  const [trails, setTrails] = useState<Record<string, TrailPoint[]>>({});
  const selectedIdRef = useRef<string | null | undefined>(selectedVehicleId);

  useEffect(() => {
    selectedIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);

  useEffect(() => {
    setTrails({});
  }, [selectedVehicleId]);

  // Fresh, uncached single-vehicle snapshot fired the instant a vehicle is
  // selected — GET /vehicles/{id}/location returns the same flat shape as the
  // WS `.current.recent` packet (both built from
  // TelemetryFormatHelper::fromVehicleLocation on the backend), so it can be
  // normalized identically. This fills in fields the bulk /vehicles list never
  // carries (satellites, battery voltage, GSM operator, engine metadata, ...)
  // instead of leaving them blank until the fleet-wide 30s poll or the first
  // WS packet for this specific vehicle arrives.
  const { data: selectedVehicleSnapshot } = useQuery({
    queryKey: ["vehicle-location-snapshot", selectedVehicleId],
    queryFn: () => getVehicleLocation(selectedVehicleId!),
    enabled: !!selectedVehicleId,
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!selectedVehicleSnapshot || !selectedVehicleId) return;
    const normalized = normalizeTelemetry(selectedVehicleSnapshot);
    if (!normalized) return;

    setLocations((prev) => {
      const prevEntry = prev[selectedVehicleId];
      const prevUpdateMs = prevEntry?.lastUpdate ? new Date(prevEntry.lastUpdate).getTime() : 0;
      const snapshotTs = normalized.timestamp_utc || normalized.gps_datetime;
      const snapshotUpdateMs = snapshotTs ? new Date(snapshotTs).getTime() : 0;
      // A WS packet (or the bulk-list seed) may have already landed and be
      // newer than this one-off snapshot — never let it clobber fresher data.
      if (prevEntry && prevUpdateMs > snapshotUpdateMs) return prev;

      return {
        ...prev,
        [selectedVehicleId]: {
          ...prevEntry,
          ...normalized,
          // This snapshot is "last stored location," not "online right now" —
          // leave connectivity state to the bulk-list seed / WS status stream
          // rather than asserting online/offline from a single REST read.
          status: prevEntry?.status ?? normalized.status,
          statusSinceMs: prevEntry?.statusSinceMs ?? Date.now(),
          is_online: prevEntry?.is_online ?? true,
          lastUpdate: snapshotTs ?? prevEntry?.lastUpdate,
          fuel: normalized.fuel_level_percent ?? prevEntry?.fuel,
          fuel_liters: normalized.fuel_level_liters ?? prevEntry?.fuel_liters,
          ignition:
            normalized.ignition === "on" || normalized.ignition === "1" || normalized.ignition === true
              ? true
              : (prevEntry?.ignition ?? false),
          raw: normalized,
        },
      };
    });
  }, [selectedVehicleSnapshot, selectedVehicleId]);

  const pushIfSelected = (idKey: string, event: string, payload: any) => {
    if (selectedIdRef.current != null && String(selectedIdRef.current) === idKey) {
      usePacketStreamStore.getState().push(buildPacketEntry(idKey, event, payload));
    }
  };

  // Seed locations from /vehicles REST data (new flat format — no .attributes wrapper)
  useEffect(() => {
    if (!vehicles.length) return;
    setLocations((prev) => {
      const next = { ...prev };
      vehicles.forEach((v: Vehicle) => {
        const loc = v.relationships?.current_location ?? null;
        // is_online + last_packet are now on attributes, not on device relationship
        const isOnline = v.attributes?.is_online ?? false;
        const lastPacketTs =
          v.attributes?.last_packet_received_at ??
          loc?.last_packet_received_at ??
          null;
        const lastUpdateTs = loc?.created_at ?? loc?.last_packet_received_at ?? null;
        const staleOffline = isStaleOffline(isOnline, lastPacketTs || lastUpdateTs);

        if (!loc) {
          if (next[v.id]) {
            next[v.id] = {
              ...next[v.id],
              is_online: isOnline,
              status: staleOffline ? "offline" : next[v.id]?.status,
              lastPacket: lastPacketTs ?? next[v.id]?.lastPacket,
            };
          }
          return;
        }

        const lat = loc.latitude;
        const lng = loc.longitude;

        // Derive movement status from speed — new API no longer sends state on REST location
        const derivedStatus = staleOffline || !isOnline
          ? "offline"
          : (loc.speed ?? 0) > 0
            ? "in_transit"
            : "parked";

        const prevEntry = next[v.id];
        const statusSinceMs =
          prevEntry?.status === derivedStatus
            ? (prevEntry?.statusSinceMs ?? Date.now())
            : Date.now();

        const restData = {
          lat: lat ?? 0,
          lng: lng ?? 0,
          speed: loc.speed ?? 0,
          heading: 0,
          status: derivedStatus,
          statusSinceMs,
          is_online: isOnline,
          odometer: v.attributes?.odometer?.lifetime_km ?? null,
          lastUpdate: lastUpdateTs,
          lastPacket: lastPacketTs,
          raw: prevEntry?.raw ?? loc,
        };

        // Only let a WS-updated prev entry keep priority over this REST snapshot
        // when it's actually newer — otherwise a poll after WS goes quiet can
        // never refresh speed/position/lastUpdate, leaving the UI frozen forever
        // on whatever the last WS packet happened to contain.
        const prevLastUpdateMs = prevEntry?.lastUpdate ? new Date(prevEntry.lastUpdate).getTime() : 0;
        const restLastUpdateMs = lastUpdateTs ? new Date(lastUpdateTs).getTime() : 0;
        const restIsFresherOrEqual = restLastUpdateMs >= prevLastUpdateMs;
        const positionalBase = restIsFresherOrEqual
          ? { ...prevEntry, ...restData }
          : { ...restData, ...prevEntry };

        if (!lat || !lng) {
          next[v.id] = {
            ...positionalBase,
            is_online: isOnline,
            status: derivedStatus,
            statusSinceMs,
            raw: prevEntry?.raw ?? loc,
            lastPacket: lastPacketTs,
          };
          return;
        }

        // Seed the interpolator once per vehicle so the marker doesn't animate in
        // from nowhere on first load; subsequent WS packets take over via ingest().
        if (!interpolator.hasVehicle(String(v.id))) {
          interpolator.snap(String(v.id), {
            lat,
            lng,
            heading: 0,
            timestamp: Date.now(),
          });
        }

        // A WS-updated prev entry only keeps positional priority when it's newer
        // than this REST snapshot; REST is always authoritative for is_online/status.
        next[v.id] = {
          ...positionalBase,
          status: derivedStatus,
          statusSinceMs,
          is_online: isOnline,
          raw: prevEntry?.raw ?? loc,
          lastPacket: lastPacketTs,
        };
      });
      return next;
    });
  }, [vehicles]);

  // WebSocket subscriptions: live location, status changes, fuel alerts, geofence alarms
  useEffect(() => {
    const orgIdentifier =
      organization?.attributes?.identifier || organization?.id;
    if (!token || !orgIdentifier) return;

    const locationUnsubscribe = subscribePrivate(
      `location.organization.${orgIdentifier}`,
      ".current.recent",
      (packet: any) => {
        if (packet.vehicle_id) {
          const normalized = normalizeTelemetry(packet);
          const status = normalized.status;
          const idKey = String(packet.vehicle_id);

          if (normalized.lat != null && normalized.lng != null) {
            const isMoving = status === "in_transit" && (normalized.speed ?? 0) > 0;
            if (isMoving) {
              interpolator.ingest(idKey, {
                lat: normalized.lat,
                lng: normalized.lng,
                heading: normalized.heading ?? 0,
                timestamp: Date.now(),
              });
            } else {
              // Stationary vehicles snap directly — no lerp needed, saves CPU.
              interpolator.snap(idKey, {
                lat: normalized.lat,
                lng: normalized.lng,
                heading: normalized.heading ?? 0,
                timestamp: Date.now(),
              });
            }
          }

          if (
            normalized.lat != null &&
            normalized.lng != null &&
            selectedIdRef.current != null &&
            String(selectedIdRef.current) === idKey
          ) {
            setTrails((prev) => ({
              ...prev,
              [idKey]: appendTrailPoint(prev[idKey] ?? [], {
                lat: normalized.lat,
                lng: normalized.lng,
                timestamp: Date.now(),
              }),
            }));
          }

          setLocations((prev) => {
            const prevEntry = prev[packet.vehicle_id];
            const statusSinceMs =
              prevEntry?.status === status
                ? (prevEntry?.statusSinceMs ?? Date.now())
                : Date.now();
            return {
              ...prev,
              [packet.vehicle_id]: {
                ...prevEntry,
                ...normalized,
                status,
                statusSinceMs,
                state: packet.state ?? prevEntry?.state,
                is_online: true,
                // timestamp_utc is the server's ingestion time — always fresh. Device-
                // reported updated_at/gps_datetime can be wrong (GPS cold-start clocks
                // commonly report a bogus fallback date before acquiring a fix), so
                // they're only a fallback, not the primary source.
                lastUpdate:
                  packet.timestamp_utc ||
                  packet.updated_at ||
                  packet.gps_datetime,
                lastPacket:
                  packet.last_packet_received_at ?? packet.timestamp_utc ?? prevEntry?.lastPacket,
                fuel: normalized.fuel_level_percent ?? prevEntry?.fuel,
                fuel_liters:
                  normalized.fuel_level_liters ?? prevEntry?.fuel_liters,
                ignition:
                  normalized.ignition === "on" ||
                  normalized.ignition === "1" ||
                  normalized.ignition === true,
                raw: normalized,
              },
            };
          });

          pushIfSelected(idKey, ".current.recent", packet);
        }
      },
    );

    const statusUnsubscribe = subscribePrivate(
      `vehicle.status.${orgIdentifier}`,
      ".vehicle.status.changed",
      (data: any) => {
        if (data.vehicle_id) {
          const idKey = String(data.vehicle_id);
          setLocations((prev) => ({
            ...prev,
            [data.vehicle_id]: {
              ...prev[data.vehicle_id],
              status: data.new_status,
              statusSinceMs: Date.now(),
            },
          }));
          pushIfSelected(idKey, ".vehicle.status.changed", data);
        }
      },
    );

    const fuelUnsubscribe = subscribePrivate(
      `fuel.alerts.${orgIdentifier}`,
      ".fuel.event",
      (alert: any) => {
        const vehicleId = alert?.vehicle_id ?? alert?.vehicleId;
        if (!vehicleId) return;
        const idKey = String(vehicleId);

        setAlarmState((prev) => ({ ...prev, [idKey]: true }));
        pushIfSelected(idKey, ".fuel.event", alert);

        // Fuel anomalies don't have a distinct "resolved" event from the backend —
        // auto-clear the alarm after a fixed window unless it's re-triggered sooner.
        setTimeout(() => {
          setAlarmState((prev) => (prev[idKey] ? { ...prev, [idKey]: false } : prev));
        }, FUEL_ALARM_AUTO_CLEAR_MS);
      },
    );

    const geofenceUnsubscribe = subscribePrivate(
      `location.organization.${orgIdentifier}`,
      ".geofence.monitor",
      (payload: any) => {
        const vehicleId = payload?.vehicle_id ?? payload?.vehicleId;
        if (!vehicleId) return;
        const idKey = String(vehicleId);

        // Payload shape varies (event_type enter/exit, or a boolean in_geofenced_area/
        // inZone flag) — treat anything that isn't an explicit "exit" as an active breach.
        const isBreach = payload.event_type
          ? payload.event_type !== "exit"
          : (payload.in_geofenced_area ?? payload.inZone ?? true);

        setAlarmState((prev) => ({ ...prev, [idKey]: isBreach }));
        pushIfSelected(idKey, ".geofence.monitor", payload);
      },
    );

    return () => {
      if (locationUnsubscribe) locationUnsubscribe();
      if (statusUnsubscribe) statusUnsubscribe();
      if (fuelUnsubscribe) fuelUnsubscribe();
      if (geofenceUnsubscribe) geofenceUnsubscribe();
    };
  }, [token, organization?.attributes?.identifier, subscribePrivate]);

  // Reconnect-refetch is centralized in page.tsx via useConnectionStatus, so a
  // single source of truth drives both the "Connection Lost" banner and the
  // post-reconnect resync (previously this hook bound its own pusher listener
  // for the same purpose, which risked a duplicate refetch).

  return {
    locations,
    setLocations,
    interpolator,
    alarmState,
    trails,
  };
}
