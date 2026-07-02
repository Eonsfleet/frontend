"use client";

import { UserProfile } from "@/types";
import { TelemetryRow } from "@/components/shared/TelemetryRow";
import { format } from "date-fns";
import { User, Loader2 } from "lucide-react";

interface DriverTabProps {
  driver: UserProfile | null | undefined;
  isLoading: boolean;
  assignedDate?: string | null;
}

export function DriverTab({ driver, isLoading, assignedDate }: DriverTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
        <User className="h-8 w-8 text-slate-300 mx-auto mb-3" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          No driver assigned
        </p>
      </div>
    );
  }

  const a = driver.attributes;

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="h-12 w-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border-2 border-white shadow-sm">
          {a.avatar ? (
            <img src={a.avatar} alt={a.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-black text-slate-900">{a.full_name}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {Array.isArray(a.role) ? a.role.join(", ") : a.role}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <TelemetryRow label="License" value={null} />
        <TelemetryRow label="Phone" value={a.phone_number} />
        <TelemetryRow label="Organization" value={driver.relationships?.organization?.attributes?.name} />
        <TelemetryRow label="Department" value={null} />
        <TelemetryRow
          label="Assigned Date"
          value={assignedDate ? format(new Date(assignedDate), "MMM d, yyyy") : null}
        />
        <TelemetryRow label="Safety Score" value={null} />
        <TelemetryRow label="Emergency Contact" value={null} />
      </div>
    </div>
  );
}
