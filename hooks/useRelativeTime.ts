"use client";

import { useEffect, useState } from "react";

function parseTimestamp(ts: string | number | Date | null | undefined): Date | null {
  if (ts == null) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts);
  const iso = ts.endsWith("Z") || ts.includes("+") ? ts : ts + "Z";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** "Just now" / "5 sec ago" / "12 sec ago" / "1 min ago" / "5 mins ago" style formatting. */
export function formatRelativeTime(ts: string | number | Date | null | undefined): string {
  const d = parseTimestamp(ts);
  if (!d) return "—";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Re-renders the caller roughly once a second so relative-time labels ("5 sec
 * ago") stay live without needing a fresh packet to trigger a re-render.
 */
export function useRelativeTime(ts: string | number | Date | null | undefined): string {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return formatRelativeTime(ts);
}
