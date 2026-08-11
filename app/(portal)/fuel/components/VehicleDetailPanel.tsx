"use client";

import { Truck, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VehicleDetail } from "./useFuelRealtime";
import type { VehicleMovement } from "./useFuelOverview";
import { useReverseGeocode } from "./useReverseGeocode";

interface VehicleDetailPanelProps {
  detail: VehicleDetail | null;
  onClose?: () => void;
}

const STATUS_BADGE: Record<VehicleMovement, string> = {
  moving: "bg-emerald-50 text-emerald-600",
  parked: "bg-slate-100 text-slate-500",
  idle: "bg-amber-50 text-amber-600",
  offline: "bg-rose-50 text-rose-600",
};
const STATUS_LABEL: Record<VehicleMovement, string> = {
  moving: "Moving",
  parked: "Parked",
  idle: "Idle",
  offline: "Offline",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 text-[12px]">
      <dt className="text-slate-400">{label}</dt>
      <dd className="break-words text-right font-medium text-slate-700">
        {value}
      </dd>
    </div>
  );
}

export function VehicleDetailPanel({
  detail,
  onClose,
}: VehicleDetailPanelProps) {
  // Called before the early return so hook order stays stable; the hook is a
  // no-op when coordinates are null (e.g. no vehicle selected).
  const { address, isLoading: isAddressLoading } = useReverseGeocode(
    detail?.lat ?? null,
    detail?.lng ?? null,
  );

  if (!detail) {
    return (
      <Card className="flex h-full items-center justify-center rounded-2xl border-0 bg-white p-6 text-center text-sm text-slate-400 shadow-none">
        Select a vehicle to see live details.
      </Card>
    );
  }

  const locationValue = isAddressLoading
    ? "Resolving…"
    : (address ?? detail.coordinates);

  const pct = detail.fuelPercent;
  const pctColor =
    pct == null
      ? "bg-slate-300"
      : pct <= 20
        ? "bg-rose-500"
        : pct <= 40
          ? "bg-amber-500"
          : "bg-emerald-500";

  return (
    <Card className="fuel-record-scroll flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl border-0 bg-white p-4 shadow-none">
      {/* Header: thumb + chassis + status + close */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0055FF]">
            <Truck className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">
            {detail.registration}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-semibold",
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

      {/* Big image + 2-col details — only fields the API returns */}
      <div className="mt-3 flex gap-3 rounded-xl bg-slate-50 p-3">
        <dl className="flex-1 space-y-0.5">
          <DetailRow label="Vehicle" value={detail.model} />
          {detail.fuelType && (
            <DetailRow label="Fuel Type" value={detail.fuelType} />
          )}
          {locationValue && (
            <DetailRow label="Location" value={locationValue} />
          )}
          {detail.lastUpdated && (
            <DetailRow label="Last Updated" value={detail.lastUpdated} />
          )}
        </dl>
      </div>

      {/* Fuel level card — only when the device reports a level reading */}
      {detail.hasLevelReading && detail.fuelPercent != null ? (
        <div className="mt-2.5 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Fuel Level</span>
            {detail.fuelLiters != null && detail.tankCapacity != null && (
              <span>
                {detail.fuelLiters} / {detail.tankCapacity} L
              </span>
            )}
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
      ) : (
        <div className="mt-2.5 rounded-xl bg-slate-50 p-3 text-center text-[12px] text-slate-400">
          No fuel level reading for this device.
        </div>
      )}

      {/* Live Fuel Data — rows built strictly from returned metrics */}
      {detail.liveFuel.length > 0 && (
        <div className="mt-2.5 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Fuel Data</h3>
            {detail.status !== "offline" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{" "}
                Live
              </span>
            )}
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {detail.liveFuel.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="flex items-center gap-1.5 capitalize text-slate-500">
                  <span className="h-1 w-1 rounded-full bg-slate-300" />{" "}
                  {row.label}
                </span>
                <span className="font-semibold capitalize text-slate-700">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
