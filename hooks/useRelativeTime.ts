"use client";

import { useSyncExternalStore } from "react";

function parseTimestamp(ts: string | number | Date | null | undefined): Date | null {
  if (ts == null) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts);
  const iso = ts.endsWith("Z") || ts.includes("+") ? ts : ts + "Z";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** "Just now" / "5 sec ago" / "12 sec ago" / "1 min ago" / "5 mins ago" style formatting, at the given instant. */
export function formatRelativeTimeAt(ts: string | number | Date | null | undefined, nowMs: number): string {
  const d = parseTimestamp(ts);
  if (!d) return "—";
  const seconds = Math.floor((nowMs - d.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatRelativeTime(ts: string | number | Date | null | undefined): string {
  return formatRelativeTimeAt(ts, Date.now());
}

/**
 * One clock for every relative-time label on the page. Each label used to run its own one-second
 * interval and re-render every second, although most read "12 mins ago" and change once a minute.
 * Here a single interval runs while anything is subscribed, and a label re-renders only when its
 * own text changes (useSyncExternalStore compares the snapshot strings). The clock pauses while the
 * tab is hidden and catches up when it is shown again.
 */
const listeners = new Set<() => void>();
let clockNow = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  clockNow = Date.now();
  listeners.forEach((l) => l());
}

function onVisibility() {
  if (typeof document !== "undefined" && !document.hidden) tick();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    clockNow = Date.now();
    timer = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) tick();
    }, 1000);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

/** The label for a timestamp, kept current by the shared clock. */
export function useRelativeTime(ts: string | number | Date | null | undefined): string {
  // The snapshot is computed from the clock's cached "now", so two reads in one render agree. Before
  // the first subscriber the cache is stale (the clock is not running), so the real time is used.
  const getSnapshot = () => formatRelativeTimeAt(ts, listeners.size === 0 ? Date.now() : clockNow);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
