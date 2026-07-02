import React from "react";

interface TelemetryRowProps {
  label: string;
  value: React.ReactNode;
}

/** Label/value row that renders an em-dash for null/undefined/empty values, so
 * telemetry panels never show a confusing blank instead of an explicit "no data". */
export function TelemetryRow({ label, value }: TelemetryRowProps) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-800 text-right max-w-[60%]">
        {value === null || value === undefined || value === "" ? (
          <span className="text-slate-300 font-normal italic">—</span>
        ) : (
          String(value)
        )}
      </span>
    </div>
  );
}
