"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TripListItemProps {
  trip: any;
  isSelected: boolean;
  locations: Record<string, any>;
  onSelect: () => void;
}

export function TripListItem({
  trip,
  isSelected,
  locations,
  onSelect,
}: TripListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
        isSelected
          ? "bg-blue-50 border-blue-200 shadow-sm scale-[1.01]"
          : "bg-white border-slate-100 hover:border-blue-100 shadow-sm",
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4
            className={cn(
              "text-[10px] font-black uppercase tracking-tighter",
              isSelected ? "text-blue-600" : "text-slate-400",
            )}
          >
            {trip.vehiclePlate}
          </h4>
          <Badge
            className={cn(
              "text-[8px] font-black border-none px-2 mt-1",
              isSelected
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-500/10 text-emerald-600",
            )}
          >
            ETA: {trip.attributes.eta || "N/A"}
          </Badge>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-[8px] font-black uppercase tracking-widest",
              isSelected ? "text-blue-400" : "text-slate-400",
            )}
          >
            Mission #
          </p>
          <p
            className={cn(
              "text-[10px] font-black italic",
              isSelected ? "text-blue-700" : "text-slate-900",
            )}
          >
            {trip.attributes.trip_number}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "relative h-1.5 w-full rounded-full overflow-hidden mb-3",
          isSelected ? "bg-blue-200/50" : "bg-slate-100",
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
            isSelected
              ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              : "bg-blue-400",
          )}
          style={{ width: "65%" }}
        />
      </div>
      <div
        className={cn(
          "flex justify-between items-center text-[7px] font-black uppercase tracking-widest mt-1",
          isSelected ? "text-blue-500" : "text-slate-400",
        )}
      >
        <span>{locations[trip.vehicleId!]?.speed || 0} KPH</span>
        <span>TRACKING ACTIVE</span>
      </div>
    </div>
  );
}
