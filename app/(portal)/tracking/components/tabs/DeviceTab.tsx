"use client";

import { TelemetryRow } from "@/components/shared/TelemetryRow";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";
import type { VehicleDevice } from "@/types";

interface DeviceTabProps {
  device: VehicleDevice | null | undefined;
  resolved: ResolvedVehicleTelemetry;
  /** Raw response from getDeviceStatus(imei) — shape varies by device/protocol, read defensively */
  deviceStatusData?: any;
}

/**
 * Expanded technical detail behind the Device Status bottom card — every field
 * here is intentionally NOT shown on that card (model, network, battery voltage,
 * fuel, and SIM status live there instead) to avoid repeating the same data.
 */
export function DeviceTab({ device, resolved, deviceStatusData }: DeviceTabProps) {
  const d = deviceStatusData?.data ?? {};

  return (
    <div className="space-y-1 p-1">
      <TelemetryRow label="IMEI" value={device?.imei ?? device?.data?.imei} />
      <TelemetryRow label="Firmware" value={d.firmware_version ?? d.firmware} />
      <TelemetryRow label="SIM Number" value={d.sim_number ?? d.phone ?? device?.phone} />
      <TelemetryRow
        label="Signal Quality"
        value={resolved.rssi != null ? `${resolved.rssi} dBm` : resolved.satellites != null ? `${resolved.satellites} sats` : null}
      />
      <TelemetryRow label="Temperature" value={resolved.engineTemp != null ? `${resolved.engineTemp}°C` : null} />
      <TelemetryRow label="Device Health" value={resolved.isDeviceOnline ? "Healthy" : "Attention needed"} />
    </div>
  );
}
