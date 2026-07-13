"use client";

import { Truck, X, Droplets, Power, Gauge, CircleGauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VehicleDetail } from "./useFuelRealtime";
import type { VehicleMovement } from "./useFuelOverview";

interface VehicleDetailPanelProps {
  detail: VehicleDetail | null;
  onClose?: () => void;
}

const STATUS_BADGE: Record<VehicleMovement, string> = {
  moving: "bg-emerald-50 text-emerald-600",
  idle: "bg-amber-50 text-amber-600",
  offline: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<VehicleMovement, string> = {
  moving: "Moving",
  idle: "Idle",
  offline: "Offline",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 text-[12px]">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function IndicatorCard({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: typeof Droplets;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-2">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-lg",
          iconClass,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-1.5 text-[10px] font-medium text-slate-400">{label}</p>
      <p className="text-[13px] font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function VehicleDetailPanel({
  detail,
  onClose,
}: VehicleDetailPanelProps) {
  if (!detail) {
    return (
      <Card className="flex h-full items-center justify-center rounded-2xl border-slate-100 p-6 text-center text-sm text-slate-400 shadow-none">
        Select a vehicle to see live details.
      </Card>
    );
  }

  const pctColor =
    detail.fuelPercent <= 20
      ? "bg-rose-500"
      : detail.fuelPercent <= 40
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl border-slate-100 p-4 shadow-none">
      {/* Header: thumb + chassis + status + close */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Truck className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">
            {detail.registration}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              STATUS_BADGE[detail.status],
            )}
          >
            {STATUS_LABEL[detail.status]}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Big image + 2-col details */}
      <div className="mt-2.5 flex gap-3">
        <div className="flex h-17 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Truck className="h-8 w-8" />
        </div>
        <dl className="flex-1 space-y-0.5">
          <DetailRow label="Vehicle" value={detail.model} />
          <DetailRow label="Driver" value={detail.driver} />
          <DetailRow label="Group" value={detail.group} />
          <DetailRow label="Location" value={detail.location} />
          <DetailRow label="Last Updated" value={detail.lastUpdated} />
        </dl>
      </div>

      {/* Fuel level card */}
      <div className="mt-2.5 rounded-xl border border-slate-100 p-2.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>Fuel Level</span>
          <span>
            {detail.fuelLiters} / {detail.tankCapacity} L
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-xl font-bold text-slate-900">
            {detail.fuelPercent}%
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                pctColor,
              )}
              style={{ width: `${detail.fuelPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Indicator cards */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <IndicatorCard
          icon={Droplets}
          iconClass="bg-emerald-50 text-emerald-500"
          label="Fuel Status"
          value={detail.fuelStatus}
        />
        <IndicatorCard
          icon={Power}
          iconClass="bg-purple-50 text-purple-500"
          label="Engine Status"
          value={detail.engineOn ? "On" : "Off"}
        />
        <IndicatorCard
          icon={Gauge}
          iconClass="bg-blue-50 text-blue-500"
          label="Speed"
          value={`${detail.speedKmh} km/h`}
        />
        <IndicatorCard
          icon={CircleGauge}
          iconClass="bg-amber-50 text-amber-500"
          label="Odometer"
          value={`${detail.odometerKm.toLocaleString()} km`}
        />
      </div>

      {/* Live Fuel Data */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Live Fuel Data</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{" "}
            Live
          </span>
        </div>
        <ul className="mt-1.5 space-y-0.5">
          {detail.liveFuel.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between text-[12px]"
            >
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-1 w-1 rounded-full bg-slate-300" />{" "}
                {row.label}
              </span>
              <span className="font-semibold text-slate-700">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
