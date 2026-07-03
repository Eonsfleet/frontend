"use client";

import { TelemetryRow } from "@/components/shared/TelemetryRow";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";
import type { VehicleDevice } from "@/types";

interface DeviceTabProps {
  device: VehicleDevice | null | undefined;
  resolved: ResolvedVehicleTelemetry;
  /** Response from getDeviceById(id) — GET /devices/{id}, the DeviceResource shape (attributes + relationships.hardware) */
  deviceInfoData?: any;
}

/**
 * Expanded technical detail behind the Device Status bottom card — every field
 * here is intentionally NOT shown on that card (model, network, battery voltage,
 * fuel, and SIM status live there instead) to avoid repeating the same data.
 *
 * Firmware version has no backing field anywhere in the backend schema (confirmed
 * against the devices table/Device model/DeviceResource) — shown as "—" until the
 * backend adds it, rather than reading a field that doesn't exist. "SIM Number" is
 * approximated from the device's registered phone number, since there's no
 * separate ICCID/SIM field either.
 */
export function DeviceTab({ device, resolved, deviceInfoData }: DeviceTabProps) {
  const attrs = deviceInfoData?.data?.attributes ?? {};

  return (
    <div className="space-y-1 p-1">
      <TelemetryRow label="IMEI" value={device?.imei ?? device?.data?.imei ?? attrs.device_id} />
      <TelemetryRow label="Firmware" value={null} />
      <TelemetryRow label="SIM Number" value={attrs.phone_number ?? device?.phone} />
      <TelemetryRow
        label="Signal Quality"
        value={resolved.rssi != null ? `${resolved.rssi} dBm` : resolved.satellites != null ? `${resolved.satellites} sats` : null}
      />
      <TelemetryRow label="Temperature" value={resolved.engineTemp != null ? `${resolved.engineTemp}°C` : null} />
      <TelemetryRow label="Device Health" value={resolved.isDeviceOnline ? "Healthy" : "Attention needed"} />
    </div>
  );
}
