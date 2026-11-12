import { cn } from "@/lib/utils";
import type { Quality } from "@/lib/fuel-format";

const LABEL: Record<Quality | "unknown", { text: string; title: string; tone: string }> = {
  measured: {
    text: "Measured",
    title: "Read from the vehicle's fuel sensor or a counted consumption.",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  calculated: {
    text: "Calculated",
    title: "A sensor percentage turned into litres using the tank's capacity.",
    tone: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  percent_only: {
    text: "% only",
    title: "The sensor reports a percentage and the tank's capacity is not set or not verified, so there are no litres to show.",
    tone: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  estimated: {
    text: "Estimated",
    title: "From distance, idling time and the vehicle's configured rates, not a reading.",
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  unknown: {
    text: "No data",
    title: "Nothing recorded for this.",
    tone: "bg-slate-100 text-slate-500 ring-slate-200",
  },
};

/** Says where a number came from, so a fleet manager can tell a reading from a guess. */
export function QualityBadge({
  quality,
  className,
}: {
  quality: Quality | null | undefined;
  className?: string;
}) {
  const meta = LABEL[quality ?? "unknown"];
  return (
    <span
      title={meta.title}
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        meta.tone,
        className,
      )}
    >
      {meta.text}
    </span>
  );
}
