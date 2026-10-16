import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeTelemetry } from "@/lib/utils";
import { isStaleOffline } from "../utils";
import { VehicleInterpolator } from "@/lib/vehicleInterpolation";
import { buildPacketEntry } from "@/lib/packetStream";
import { usePacketStreamStore } from "@/store/packetStreamStore";
import { appendTrailPoint, type TrailPoint } from "@/lib/vehicleTrail";
import { getVehicleById, type VehicleMapEntry } from "@/lib/api/vehicles";

/**
 * The {id, attributes, relationships} envelope (PRD §2: a `view` changes the
 * fields inside the resource, not the outer shape) isn't consumable by
 * normalizeTelemetry(), which expects a flat packet — so flatten attributes +
 * relationships.current_location the same way the bulk REST fleet-seed effect
 * below does per-vehicle, before handing it off.
 */
function flattenTelemetryEnvelope(vehicle: any): any {
  if (!vehicle) return null;
  const attributes = vehicle.attributes ?? {};
  const location = vehicle.relationships?.current_location ?? {};
  return {
    ...attributes,
    ...location,
    vehicle_id: vehicle.id,
  };
}

/** A snapshot position of 0,0 means the field was absent, not that the vehicle is at Null Island. */
const hasFix = (lat: unknown, lng: unknown) =>
  typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0);

/**
 * Fold the one-off ?view=telemetry snapshot into whatever the fleet seed and
 * the WS stream have already put in the map for this vehicle.
 *
 * Freshness decides which side wins a field they BOTH carry. It must not decide
 * whether the snapshot lands at all, because the two sides do not carry the same
 * fields and they do not read the same clock. relationships.current_location is
 * the only source of the extended telemetry — engine, electrical, door, GSM,
 * odometer, satellites, protocol — none of which the view=map feed has at all;
 * and it is stamped with the GPS fix's own time while the map feed's lastUpdate
 * is the device's server-recorded receipt time, which is later essentially
 * always. Gating the whole payload on that comparison discarded every snapshot
 * for any vehicle already in the list, which is every vehicle the panel can open,
 * so the Details tab sat empty below the handful of fields the map feed carries.
 */
export function mergeTelemetrySnapshot(prevEntry: any, normalized: any) {
  const snapshotTs = normalized.timestamp_utc || normalized.gps_datetime || null;
  const prevUpdateMs = prevEntry?.lastUpdate ? new Date(prevEntry.lastUpdate).getTime() : 0;
  const snapshotUpdateMs = snapshotTs ? new Date(snapshotTs).getTime() : 0;
  const snapshotIsFresher = snapshotUpdateMs >= prevUpdateMs;

  // The fresher side wins the overlap; the older side still fills in every
  // field its counterpart never had.
  const merged = snapshotIsFresher
    ? { ...prevEntry, ...normalized }
    : { ...normalized, ...prevEntry };

  const pick = <T,>(fromSnapshot: T, fromPrev: T): T =>
    snapshotIsFresher ? (fromSnapshot ?? fromPrev) : (fromPrev ?? fromSnapshot);

  return {
    ...merged,
    // A known-good position is never traded for an absent one.
    lat: hasFix(normalized.lat, normalized.lng) ? pick(normalized.lat, prevEntry?.lat) : (prevEntry?.lat ?? normalized.lat),
    lng: hasFix(normalized.lat, normalized.lng) ? pick(normalized.lng, prevEntry?.lng) : (prevEntry?.lng ?? normalized.lng),
    // This snapshot is "last stored location," not "online right now" —
    // leave connectivity state to the bulk-list seed / WS status stream
    // rather than asserting online/offline from a single REST read.
    status: prevEntry?.status ?? normalized.status,
    statusSinceMs: prevEntry?.statusSinceMs ?? Date.now(),
    is_online: prevEntry?.is_online ?? true,
    // Never walk the clock backwards.
    lastUpdate: snapshotIsFresher ? (snapshotTs ?? prevEntry?.lastUpdate) : (prevEntry?.lastUpdate ?? snapshotTs),
    fuel: pick(normalized.fuel_level_percent, prevEntry?.fuel),
    fuel_liters: pick(normalized.fuel_level_liters, prevEntry?.fuel_liters),
    ignition: snapshotIsFresher
      ? normalized.ignition === "on" || normalized.ignition === "1" || normalized.ignition === true
      : (prevEntry?.ignition ?? normalized.ignition === "on"),
    // raw is the resolver's last-resort lookup for anything the live payloads
    // omit, so it holds the best known value per field rather than whichever
    // packet landed last.
    raw: snapshotIsFresher ? { ...prevEntry?.raw, ...normalized } : { ...normalized, ...prevEntry?.raw },
  };
}

interface UseVehicleLocationsProps {
  vehicles: VehicleMapEntry[];
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

  // The view=map feed keys everything by the vehicle's DB `id`, and the
  // fleet-wide WS channels already broadcast `vehicle_id` as that same DB id
  // — so no id resolution/remapping is needed here, unlike the old uuid-keyed
  // shape. Kept as a named helper for clarity at each WS call site.
  const resolveIdKey = (rawId: unknown) => String(rawId);

  useEffect(() => {
    setTrails({});
  }, [selectedVehicleId]);

  // Full latest normalized telemetry fired the instant a vehicle is selected —
  // GET /vehicles/{id}?view=telemetry (PRD §9/§19/§21/§23). This fills in
  // fields the bulk /vehicles list never carries (satellites, battery voltage,
  // GSM operator, engine metadata, ...) instead of leaving them blank until
  // the fleet-wide 30s poll or the first WS packet for this vehicle arrives.
  //
  // NOTE: VehicleController::show() takes no Request and so ignores `view`
  // entirely — it always eager-loads currentLocation, which is why this works.
  // The backend's VehicleView enum has no `telemetry` case either, so if `view`
  // is ever wired into show() behind that enum's validation, this call starts
  // returning 422 and every field below goes blank.
  const { data: selectedVehicleSnapshot } = useQuery({
    queryKey: ["vehicle", selectedVehicleId, "telemetry"],
    queryFn: () => getVehicleById(selectedVehicleId!, { view: "telemetry" }),
    enabled: !!selectedVehicleId,
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!selectedVehicleSnapshot || !selectedVehicleId) return;
    const flat = flattenTelemetryEnvelope(selectedVehicleSnapshot.data);
    const normalized = normalizeTelemetry(flat);
    if (!normalized) return;

    setLocations((prev) => ({
      ...prev,
      [selectedVehicleId]: mergeTelemetrySnapshot(prev[selectedVehicleId], normalized),
    }));
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
      vehicles.forEach((v: VehicleMapEntry) => {
        const vehicleId = String(v.id);
        const loc = v.attributes.location ?? null;
        // view=map has no boolean is_online field — derive it from device_status.
        const isOnline = v.attributes?.device_status === "active";
        const lastPacketTs = v.attributes?.last_packet_received_at ?? null;
        const lastUpdateTs = lastPacketTs;
        const staleOffline = isStaleOffline(isOnline, lastPacketTs);

        if (!loc) {
          if (next[vehicleId]) {
            next[vehicleId] = {
              ...next[vehicleId],
              is_online: isOnline,
              status: staleOffline ? "offline" : next[vehicleId]?.status,
              lastPacket: lastPacketTs ?? next[vehicleId]?.lastPacket,
            };
          }
          return;
        }

        const lat = loc.latitude;
        const lng = loc.longitude;
        const speed = v.attributes.speed ?? 0;

        // Derive movement status from speed — the map feed carries no explicit state.
        const derivedStatus = staleOffline || !isOnline
          ? "offline"
          : speed > 0
            ? "in_transit"
            : "parked";

        const prevEntry = next[vehicleId];
        const statusSinceMs =
          prevEntry?.status === derivedStatus
            ? (prevEntry?.statusSinceMs ?? Date.now())
            : Date.now();

        const fuelPct = v.attributes.fuel?.level_percent ?? null;
        const fuelL = v.attributes.fuel?.level_liters ?? null;

        const restData = {
          lat: lat ?? 0,
          lng: lng ?? 0,
          speed,
          heading: 0,
          status: derivedStatus,
          statusSinceMs,
          is_online: isOnline,
          lastUpdate: lastUpdateTs,
          lastPacket: lastPacketTs,
          fuel: fuelPct != null ? Number(fuelPct) : (prevEntry?.fuel ?? null),
          fuel_liters: fuelL != null ? Number(fuelL) : (prevEntry?.fuel_liters ?? null),
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

        // status/is_online follow the same freshness rule as position: a
        // WS-derived status that's newer than this REST snapshot wins. REST
        // used to overwrite status/is_online unconditionally here regardless
        // of a fresher WS packet already having set them — every 30s poll
        // briefly stomped a vehicle's live status back to whatever this REST
        // snapshot's speed/device_status implied, which is a large part of
        // what produced the status-count flicker.
        const statusBase = restIsFresherOrEqual
          ? { status: derivedStatus, statusSinceMs, is_online: isOnline }
          : { status: prevEntry?.status ?? derivedStatus, statusSinceMs: prevEntry?.statusSinceMs ?? statusSinceMs, is_online: prevEntry?.is_online ?? isOnline };

        if (!lat || !lng) {
          next[vehicleId] = {
            ...positionalBase,
            ...statusBase,
            raw: prevEntry?.raw ?? loc,
            lastPacket: lastPacketTs,
          };
          return;
        }

        // Seed the interpolator once per vehicle so the marker doesn't animate in
        // from nowhere on first load; subsequent WS packets take over via ingest().
        if (!interpolator.hasVehicle(vehicleId)) {
          interpolator.snap(vehicleId, {
            lat,
            lng,
            heading: 0,
            timestamp: Date.now(),
          });
        }

        next[vehicleId] = {
          ...positionalBase,
          ...statusBase,
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

    // Positions are published by the Go telemetry pipeline on the org-wide
    // tracking channel — the old Laravel broadcaster (location.organization.*
    // / .current.recent, keyed on latitude/longitude) was retired and nothing
    // publishes to it any more. The event carries lat/lng (not latitude/
    // longitude) and, since System 3 started serialising the enriched fields it
    // already held, also ignition, movement, status, is_online, mileage_km and
    // gps_confidence — so status no longer has to be guessed from speed.
    const locationUnsubscribe = subscribePrivate(
      `org.${orgIdentifier}.tracking`,
      ".vehicle.location.updated",
      (packet: any) => {
        // vehicle_id is nullable (a device with no linked vehicle record still
        // broadcasts) — imei is always present, but every other consumer in
        // this hook keys by vehicle_id, so packets without one are dropped
        // rather than introducing a second identity scheme here.
        if (packet.vehicle_id) {
          // is_online is forced true only when the payload omits it: a packet
          // on this channel is by definition a live position, since a device
          // going offline produces no packet. Supplying it as an override
          // instead of ignoring the field lets a real `false` through, and lets
          // normalizeTelemetry's own status derivation run at all — with no
          // truthy is_online it resolves "offline" for every packet.
          const normalized = normalizeTelemetry(packet, {
            is_online: packet.is_online ?? true,
          });
          // The packet carries ignition and movement, so "idle" (engine
          // running, stationary) is distinguishable from "parked". Deriving
          // from speed alone collapsed the two, and every idling vehicle in the
          // fleet reported as parked.
          const status =
            normalized.status ?? ((normalized.speed ?? 0) > 0 ? "in_transit" : "parked");
          const idKey = resolveIdKey(packet.vehicle_id);

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

          // timestamp is the position's device time (ISO-8601 with offset) — the
          // new payload carries no separate server-ingestion timestamp field.
          const packetTs = packet.timestamp;
          const packetUpdateMs = packetTs ? new Date(packetTs).getTime() : 0;

          setLocations((prev) => {
            const prevEntry = prev[idKey];
            // A late-arriving or reordered WS packet must not roll a vehicle's
            // state backward — mirrors the guard already applied to the REST
            // seed and the selected-vehicle snapshot query below.
            const prevUpdateMs = prevEntry?.lastUpdate ? new Date(prevEntry.lastUpdate).getTime() : 0;
            if (prevEntry && packetUpdateMs > 0 && prevUpdateMs > packetUpdateMs) return prev;

            const statusSinceMs =
              prevEntry?.status === status
                ? (prevEntry?.statusSinceMs ?? Date.now())
                : Date.now();
            return {
              ...prev,
              [idKey]: {
                ...prevEntry,
                ...normalized,
                // Coordinates are optional per-packet (e.g. a status-only event) —
                // never let an absent lat/lng in this packet blank out a previously
                // known good position.
                lat: normalized.lat ?? prevEntry?.lat,
                lng: normalized.lng ?? prevEntry?.lng,
                status,
                statusSinceMs,
                state: packet.state ?? prevEntry?.state,
                // Resolved above: the payload's own value, defaulted to true
                // when absent (see the normalizeTelemetry call).
                is_online: normalized.is_online,
                lastUpdate: packetTs || prevEntry?.lastUpdate,
                lastPacket: packetTs || prevEntry?.lastPacket,
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

          pushIfSelected(idKey, ".vehicle.location.updated", packet);
        }
      },
    );

    const statusUnsubscribe = subscribePrivate(
      `vehicle.status.${orgIdentifier}`,
      ".vehicle.status.changed",
      (data: any) => {
        if (data.vehicle_id) {
          const idKey = resolveIdKey(data.vehicle_id);
          setLocations((prev) => ({
            ...prev,
            [idKey]: {
              ...prev[idKey],
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
        const idKey = resolveIdKey(vehicleId);

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
        const idKey = resolveIdKey(vehicleId);

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
    // Full {id, attributes, relationships} envelope for the selected vehicle,
    // from GET /vehicles/{id}?view=telemetry — the panel/bottom-cards read
    // display fields (make, body_type, device/imei, ...) from this rather than
    // the slim view=map list entry, which no longer carries them.
    selectedVehicleDetail: selectedVehicleSnapshot?.data ?? null,
  };
}
