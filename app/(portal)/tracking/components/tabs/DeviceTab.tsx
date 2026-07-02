"use client";

import { TelemetryRow } from "@/components/shared/TelemetryRow";
import { formatVoltage } from "@/lib/resolveVehicleTelemetry";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";
import type { VehicleDevice } from "@/types";

interface DeviceTabProps {
  device: VehicleDevice | null | undefined;
  resolved: ResolvedVehicleTelemetry;
  /** Raw response from getDeviceStatus(imei) — shape varies by device/protocol, read defensively */
  deviceStatusData?: any;
}

export function DeviceTab({ device, resolved, deviceStatusData }: DeviceTabProps) {
  const d = deviceStatusData?.data ?? {};
  const lastHeartbeat = useRelativeTime(resolved.lastUpdate);

  return (
    <div className="space-y-1 p-1">
      <TelemetryRow label="Device Model" value={d.model ?? d.device_model} />
      <TelemetryRow label="IMEI" value={device?.imei ?? device?.data?.imei} />
      <TelemetryRow label="SIM Number" value={d.sim_number ?? d.phone ?? device?.phone} />
      <TelemetryRow label="Firmware" value={d.firmware_version ?? d.firmware} />
      <TelemetryRow
        label="Signal Quality"
        value={resolved.rssi != null ? `${resolved.rssi} dBm` : resolved.satellites != null ? `${resolved.satellites} sats` : null}
      />
      <TelemetryRow label="Satellite Count" value={resolved.satellites} />
      <TelemetryRow label="Voltage" value={formatVoltage(resolved.batteryV)} />
      <TelemetryRow label="Network" value={d.network ?? d.network_type ?? device?.country} />
      <TelemetryRow label="Temperature" value={resolved.engineTemp != null ? `${resolved.engineTemp}°C` : null} />
      <TelemetryRow label="Last Heartbeat" value={lastHeartbeat} />
      <TelemetryRow label="Device Health" value={resolved.isDeviceOnline ? "Healthy" : "Attention needed"} />
    </div>
  );
}
