import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeTelemetry } from "@/lib/utils";
import { getEcho } from "@/lib/echo";
import { Vehicle } from "@/types";
import { deriveVehicleStatus, isStaleOffline } from "../utils";

interface UseVehicleLocationsProps {
  vehicles: Vehicle[];
  token: string | null;
  organization: any;
  subscribePrivate: (
    channel: string,
    event: string,
    callback: (data: any) => void,
  ) => (() => void) | undefined;
}

export function useVehicleLocations({
  vehicles,
  token,
  organization,
  subscribePrivate,
}: UseVehicleLocationsProps) {
  const queryClient = useQueryClient();
  const [locations, setLocations] = useState<Record<string, any>>({});

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

        const restData = {
          lat: lat ?? 0,
          lng: lng ?? 0,
          speed: loc.speed ?? 0,
          heading: 0,
          status: derivedStatus,
          is_online: isOnline,
          odometer: v.attributes?.total_odometer ?? null,
          lastUpdate: lastUpdateTs,
          lastPacket: lastPacketTs,
          raw: loc,
        };

        if (!lat || !lng) {
          next[v.id] = {
            ...restData,
            ...next[v.id],
            is_online: isOnline,
            status: derivedStatus,
            raw: loc,
            lastPacket: lastPacketTs,
          };
          return;
        }

        // WS live data takes priority for positional fields; REST is authoritative for is_online
        next[v.id] = {
          ...restData,
          ...next[v.id],
          status: derivedStatus,
          is_online: isOnline,
          raw: loc,
          lastPacket: lastPacketTs,
        };
      });
      return next;
    });
  }, [vehicles]);

  // WebSocket subscriptions: live location, status changes, fuel alerts
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
          const status =
            deriveVehicleStatus(
              { state: packet.state, speed: packet.speed },
              null,
            ) ?? normalized.status;
          setLocations((prev) => ({
            ...prev,
            [packet.vehicle_id]: {
              ...prev[packet.vehicle_id],
              ...normalized,
              status,
              state: packet.state ?? prev[packet.vehicle_id]?.state,
              is_online: true,
              lastUpdate:
                packet.updated_at ||
                packet.gps_datetime ||
                packet.timestamp_utc,
              lastPacket:
                packet.last_packet_received_at ??
                prev[packet.vehicle_id]?.lastPacket,
              fuel:
                packet.fuel_level_percent ??
                packet.fuel ??
                prev[packet.vehicle_id]?.fuel,
              fuel_liters:
                packet.fuel_level_liters ??
                packet.fuel_liters ??
                prev[packet.vehicle_id]?.fuel_liters,
              ignition:
                normalized.ignition === "on" ||
                normalized.ignition === "1" ||
                normalized.ignition === true,
              raw: prev[packet.vehicle_id]?.raw,
            },
          }));
        }
      },
    );

    const statusUnsubscribe = subscribePrivate(
      `vehicle.status.${orgIdentifier}`,
      ".vehicle.status.changed",
      (data: any) => {
        if (data.vehicle_id) {
          setLocations((prev) => ({
            ...prev,
            [data.vehicle_id]: {
              ...prev[data.vehicle_id],
              status: data.new_status,
            },
          }));
        }
      },
    );

    const fuelUnsubscribe = subscribePrivate(
      `fuel.alerts.${orgIdentifier}`,
      ".fuel.event",
      (_alert: any) => {},
    );

    return () => {
      if (locationUnsubscribe) locationUnsubscribe();
      if (statusUnsubscribe) statusUnsubscribe();
      if (fuelUnsubscribe) fuelUnsubscribe();
    };
  }, [token, organization?.attributes?.identifier, subscribePrivate]);

  // Refetch vehicle locations when WS reconnects
  useEffect(() => {
    if (!token || !organization?.attributes?.identifier) return;
    const echo = getEcho();
    if (!echo?.connector?.pusher) return;

    const pusher = echo.connector.pusher;
    const handleReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles-tracking"] });
    };
    pusher.connection.bind("connected", handleReconnect);
    return () => {
      pusher.connection.unbind("connected", handleReconnect);
    };
  }, [token, organization?.attributes?.identifier, queryClient]);

  return { locations, setLocations };
}
