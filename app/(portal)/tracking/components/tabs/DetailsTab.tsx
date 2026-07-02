"use client";

import { TelemetryRow } from "@/components/shared/TelemetryRow";
import { formatVoltage } from "@/lib/resolveVehicleTelemetry";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";

interface DetailsTabProps {
  resolved: ResolvedVehicleTelemetry & { address: string };
  driverName?: string | null;
  driverPhone?: string | null;
  todayKm?: number | null;
}

export function DetailsTab({ resolved, driverName, driverPhone, todayKm }: DetailsTabProps) {
  const lastPacketRelative = useRelativeTime(resolved.lastUpdate);

  return (
    <div className="space-y-1 p-1">
      <TelemetryRow label="Driver" value={driverName} />
      <TelemetryRow
        label="Phone"
        value={
          driverPhone ? (
            <a href={`tel:${driverPhone}`} className="text-blue-600 hover:underline">
              {driverPhone}
            </a>
          ) : null
        }
      />
      <TelemetryRow label="Last Packet Update" value={lastPacketRelative} />
      <TelemetryRow label="Fuel" value={resolved.fuel != null ? `${resolved.fuel}%` : null} />
      <TelemetryRow label="Battery" value={formatVoltage(resolved.batteryV)} />
      <TelemetryRow
        label="GPS Signal"
        value={resolved.satellites != null ? `${resolved.satellites} satellites${resolved.weakGps ? " (weak)" : ""}` : null}
      />
      <TelemetryRow label="Engine Hours" value={resolved.engineHours != null ? `${resolved.engineHours} hrs` : null} />
      <TelemetryRow label="Today's Distance" value={todayKm != null ? `${todayKm} km` : null} />
      <TelemetryRow label="Current Address" value={resolved.address} />
    </div>
  );
}
