"use client";

import { TelemetryRow } from "@/components/shared/TelemetryRow";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { format } from "date-fns";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";
import type { VehicleDevice } from "@/types";

interface DeviceTabProps {
  device: VehicleDevice | null | undefined;
  resolved: ResolvedVehicleTelemetry;
  /** Response from getDeviceById(id) — GET /devices/{id}, the DeviceResource shape (attributes + relationships.hardware) */
  deviceInfoData?: any;
}

function yesNo(value: boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value ? "Yes" : "No";
}

/**
 * Firmware version has no backing field anywhere in the backend schema (confirmed
 * against the devices table/Device model/DeviceResource) — shown as "—" until the
 * backend adds it, rather than reading a field that doesn't exist. "SIM Number" is
 * approximated from the device's registered phone number, since there's no
 * separate ICCID/SIM field either.
 */
export function DeviceTab({ device, resolved, deviceInfoData }: DeviceTabProps) {
  const attrs = deviceInfoData?.data?.attributes ?? {};
  const hardware = deviceInfoData?.data?.relationships?.hardware;
  const lastPacketRelative = useRelativeTime(attrs.last_packet_received_at);

  return (
    <div className="space-y-1 p-1">
      <TelemetryRow label="IMEI" value={device?.imei ?? device?.data?.imei ?? attrs.device_id} />
      <TelemetryRow label="Device Model" value={hardware?.name} />
      <TelemetryRow label="Firmware" value={null} />
      <TelemetryRow label="SIM Number" value={attrs.phone_number ?? device?.phone} />
      <TelemetryRow label="Country" value={attrs.country} />
      <TelemetryRow label="Status" value={attrs.status} />
      <TelemetryRow label="Last Packet Received" value={lastPacketRelative} />
      <TelemetryRow label="Installed On" value={attrs.created_at ? format(new Date(attrs.created_at), "MMM d, yyyy") : null} />
      <TelemetryRow
        label="Signal Quality"
        value={resolved.rssi != null ? `${resolved.rssi} dBm` : resolved.satellites != null ? `${resolved.satellites} sats` : null}
      />
      <TelemetryRow label="Temperature" value={resolved.engineTemp != null ? `${resolved.engineTemp}°C` : null} />
      <TelemetryRow label="Has Fuel Sensor" value={yesNo(attrs.has_fuel)} />
      {/* The connection state is all this knows; "healthy" would claim more than that. */}
      <TelemetryRow label="Connection" value={resolved.isDeviceOnline ? "Online" : "Offline"} />
    </div>
  );
}
