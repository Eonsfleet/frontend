"use client";

import React from "react";
import { TelemetryRow } from "@/components/shared/TelemetryRow";
import { formatVoltage } from "@/lib/resolveVehicleTelemetry";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { cn } from "@/lib/utils";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";

interface DetailsTabProps {
  resolved: ResolvedVehicleTelemetry;
  todayKm?: number | null;
}

function fmt(value: number | string | null | undefined, suffix = ""): string | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (typeof num !== "number" || isNaN(num)) return String(value);
  return `${num}${suffix}`;
}

function isFlagActive(value: boolean | string | null | undefined): boolean {
  return value === true || value === "true" || value === "1" || value === "on";
}

function yesNo(value: boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value ? "Yes" : "No";
}

const ALERT_CHIPS: Array<{
  key: "jamming" | "immobilizer" | "unplug" | "idling" | "sleepMode";
  label: string;
  style: string;
}> = [
  { key: "jamming", label: "Jamming Detected", style: "bg-rose-50 text-rose-700 border-rose-100" },
  { key: "immobilizer", label: "Immobilizer Active", style: "bg-rose-50 text-rose-700 border-rose-100" },
  { key: "unplug", label: "Unplugged", style: "bg-rose-50 text-rose-700 border-rose-100" },
  { key: "idling", label: "Idling", style: "bg-amber-50 text-amber-700 border-amber-100" },
  { key: "sleepMode", label: "Sleep Mode", style: "bg-amber-50 text-amber-700 border-amber-100" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-3 pb-1 first:pt-0">
      {children}
    </p>
  );
}

export function DetailsTab({ resolved, todayKm }: DetailsTabProps) {
  const fuelLastUpdateRelative = useRelativeTime(resolved.fuelLastUpdate);
  const activeAlerts = ALERT_CHIPS.filter((chip) => isFlagActive(resolved[chip.key]));

  return (
    <div className="space-y-1 p-1">
      <SectionLabel>Alerts</SectionLabel>
      {activeAlerts.length === 0 ? (
        <div className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-100 inline-block">
          No active alerts
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {activeAlerts.map((chip) => (
            <span key={chip.key} className={cn("text-[10px] font-bold px-2.5 py-1.5 rounded-lg border", chip.style)}>
              {chip.label}
            </span>
          ))}
        </div>
      )}
      <TelemetryRow label="Driving State" value={resolved.drivingState} />
      <TelemetryRow label="Movement" value={resolved.movement} />
      <TelemetryRow label="Door Status" value={resolved.doorStatus} />
      <TelemetryRow label="Load Weight" value={fmt(resolved.loadWeight, " kg")} />

      <SectionLabel>Engine</SectionLabel>
      <TelemetryRow label="Engine RPM" value={fmt(resolved.rpm, " rpm")} />
      <TelemetryRow label="Engine RPM (OBD)" value={fmt(resolved.rpmObd, " rpm")} />
      <TelemetryRow label="Oil Level" value={fmt(resolved.oilLevel)} />
      <TelemetryRow label="Engine Hours" value={fmt(resolved.engineHours, " hrs")} />

      <SectionLabel>Odometer &amp; Mileage</SectionLabel>
      <TelemetryRow label="Live Odometer" value={fmt(resolved.odometer, " km")} />
      <TelemetryRow label="Total Mileage" value={fmt(resolved.mileage, " km")} />
      <TelemetryRow label="Trip Odometer" value={fmt(resolved.tripOdo, " km")} />
      <TelemetryRow label="Odometer Source" value={resolved.odoSource} />
      <TelemetryRow label="Today's Distance" value={fmt(todayKm, " km")} />

      <SectionLabel>Fuel Detail</SectionLabel>
      <TelemetryRow label="Fuel Rate" value={fmt(resolved.fuelRate, " L/h")} />
      <TelemetryRow label="Fuel Consumed" value={fmt(resolved.fuelConsumed, " L")} />
      <TelemetryRow label="Fuel Used (GPS)" value={fmt(resolved.fuelUsedGps, " L")} />
      <TelemetryRow label="Fuel Level (OBD)" value={fmt(resolved.fuelLevelObd, "%")} />
      <TelemetryRow label="Fuel Source" value={resolved.fuelSource} />
      <TelemetryRow label="Tank Capacity" value={fmt(resolved.fuelTankCap, " L")} />
      <TelemetryRow label="Fuel Data Quality" value={fmt(resolved.fuelQuality)} />
      <TelemetryRow label="Fuel Last Updated" value={fuelLastUpdateRelative} />
      <TelemetryRow label="Has Fuel Sensor" value={yesNo(resolved.deviceHasFuel)} />

      <SectionLabel>Electrical</SectionLabel>
      <TelemetryRow label="External Voltage" value={formatVoltage(resolved.extV)} />
      <TelemetryRow label="Battery Current" value={fmt(resolved.batteryCurrent, " A")} />

      <SectionLabel>GPS &amp; Eco</SectionLabel>
      <TelemetryRow label="Eco Score" value={fmt(resolved.ecoScore, "/100")} />
      <TelemetryRow label="Altitude" value={fmt(resolved.altitude, " m")} />
      <TelemetryRow label="GPS Precision (HDOP)" value={fmt(resolved.hdop)} />
      <TelemetryRow label="GPS Confidence" value={fmt(resolved.gpsConfidence)} />

      <SectionLabel>Protocol</SectionLabel>
      <TelemetryRow label="Protocol Name" value={resolved.protocol} />
      <TelemetryRow label="Confidence" value={fmt(resolved.confidence)} />
    </div>
  );
}
