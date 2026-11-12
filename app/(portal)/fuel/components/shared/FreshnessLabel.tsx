import { cn } from "@/lib/utils";
import { formatAge } from "@/lib/fuel-format";

/** A dot and an age: green while the reading is recent, amber once it is stale. */
export function FreshnessLabel({
  freshness,
  ageMinutes,
  className,
}: {
  freshness: "live" | "stale";
  ageMinutes: number;
  className?: string;
}) {
  const live = freshness === "live";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", live ? "text-emerald-700" : "text-amber-700", className)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-emerald-500" : "bg-amber-500")} />
      <span>{live ? "Live" : "Stale"}</span>
      <span className="text-slate-400">· {formatAge(ageMinutes)}</span>
    </span>
  );
}
