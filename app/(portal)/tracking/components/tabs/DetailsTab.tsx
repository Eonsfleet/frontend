"use client";

import React from "react";
import { TelemetryRow } from "@/components/shared/TelemetryRow";
import { formatVoltage } from "@/lib/resolveVehicleTelemetry";
import { formatFuelLevel } from "@/lib/fuel-format";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { cn } from "@/lib/utils";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";

interface DetailsTabProps {
  resolved: ResolvedVehicleTelemetry;
  todayKm?: number | null;
  /** Today's distance already formatted in the organisation's unit; takes precedence over todayKm. */
  todayText?: string | null;
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

interface Row {
  label: string;
  value: string | null;
}

/**
 * The rows the device actually reported, in sections. A row with nothing behind it is not drawn as a dash
 * among real values: it is listed once at the end ("Not reported by this device"), so a vehicle that sends
 * little reads as a short, true panel and not as a long empty one.
 */
export function DetailsTab({ resolved, todayKm, todayText }: DetailsTabProps) {
  const fuelLastUpdateRelative = useRelativeTime(resolved.fuelLastUpdate);
  const activeAlerts = ALERT_CHIPS.filter((chip) => isFlagActive(resolved[chip.key]));

  const sections: Array<{ title: string | null; rows: Row[] }> = [
    {
      title: null,
      rows: [
        { label: "Driving State", value: resolved.drivingState ?? null },
        { label: "Movement", value: resolved.movement ?? null },
        { label: "Door Status", value: resolved.doorStatus ?? null },
        { label: "Load Weight", value: fmt(resolved.loadWeight, " kg") },
      ],
    },
    {
      title: "Engine",
      rows: [
        { label: "Engine RPM", value: fmt(resolved.rpm, " rpm") },
        { label: "Engine RPM (OBD)", value: fmt(resolved.rpmObd, " rpm") },
        { label: "Engine Load", value: fmt(resolved.engineLoad, "%") },
        { label: "Throttle", value: fmt(resolved.throttle, "%") },
        { label: "Coolant Temperature", value: fmt(resolved.coolantTemp, "°C") },
        { label: "Oil Level", value: fmt(resolved.oilLevel, "%") },
        { label: "Engine Hours", value: fmt(resolved.engineHours, " hrs") },
      ],
    },
    {
      title: "Odometer & Mileage",
      rows: [
        { label: "Live Odometer", value: fmt(resolved.odometer, " km") },
        { label: "Total Mileage", value: fmt(resolved.mileage, " km") },
        { label: "Odometer Source", value: resolved.odoSource ?? null },
        { label: "Today's Distance", value: todayText ?? fmt(todayKm, " km") },
      ],
    },
    {
      title: "Fuel Detail",
      rows: [
        // The percentage and the litres together, as the list shows them.
        { label: "Fuel Level", value: formatFuelLevel(resolved.fuel, resolved.fuelLiters, resolved.fuelBasis) },
        { label: "Fuel Rate", value: fmt(resolved.fuelRate, " L/h") },
        { label: "Fuel Consumed", value: fmt(resolved.fuelConsumed, " L") },
        { label: "Fuel Used (GPS)", value: fmt(resolved.fuelUsedGps, " L") },
        { label: "Fuel Level (OBD)", value: fmt(resolved.fuelLevelObd, "%") },
        { label: "Fuel Source", value: resolved.fuelSource ?? null },
        { label: "Tank Capacity", value: fmt(resolved.fuelTankCap, " L") },
        { label: "Fuel Data Quality", value: fmt(resolved.fuelQuality) },
        { label: "Fuel Last Updated", value: resolved.fuelLastUpdate ? fuelLastUpdateRelative : null },
        { label: "Has Fuel Sensor", value: yesNo(resolved.deviceHasFuel) },
      ],
    },
    {
      title: "Electrical",
      rows: [
        { label: "External Voltage", value: resolved.extV != null && resolved.extV !== "---" ? formatVoltage(resolved.extV) : null },
        { label: "Battery Level", value: fmt(resolved.batteryLevel, "%") },
        { label: "Battery Current", value: fmt(resolved.batteryCurrent, " A") },
      ],
    },
    {
      title: "GPS & Eco",
      rows: [
        { label: "Eco Score", value: fmt(resolved.ecoScore, "/100") },
        { label: "Altitude", value: fmt(resolved.altitude, " m") },
        { label: "GPS Precision (HDOP)", value: fmt(resolved.hdop) },
        { label: "GPS Precision (PDOP)", value: fmt(resolved.pdop) },
        { label: "GSM Signal", value: resolved.gsmSignal != null ? `${resolved.gsmSignal} of 5` : null },
        { label: "GPS Confidence", value: fmt(resolved.gpsConfidence) },
      ],
    },
    {
      title: "Protocol",
      rows: [
        { label: "Protocol Name", value: resolved.protocol ?? null },
        { label: "Confidence", value: fmt(resolved.confidence) },
      ],
    },
  ];
  const missing = sections.flatMap((section) => section.rows.filter((row) => row.value === null || row.value === "").map((row) => row.label));

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

      {sections.map((section) => {
        const rows = section.rows.filter((row) => row.value !== null && row.value !== "");
        if (rows.length === 0) return null;
        return (
          <React.Fragment key={section.title ?? "status"}>
            {section.title && <SectionLabel>{section.title}</SectionLabel>}
            {rows.map((row) => (
              <TelemetryRow key={row.label} label={row.label} value={row.value} />
            ))}
          </React.Fragment>
        );
      })}

      {missing.length > 0 && (
        <p className="pt-3 text-[10px] leading-relaxed text-slate-400" data-testid="not-reported">
          <span className="font-bold uppercase tracking-widest">Not reported by this device: </span>
          {missing.join(", ")}
        </p>
      )}
    </div>
  );
}
