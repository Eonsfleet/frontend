"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const FAVORITES = "reports:favorites";
const RECENT = "reports:recent";
const RECENT_MAX = 6;
const CHANGED = "reports:lists-changed";

const raw = (key: string): string => {
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
};

const parse = (text: string): string[] => {
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

const write = (key: string, value: string[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private window or blocked storage: the lists just don't persist */
  }
  window.dispatchEvent(new Event(CHANGED));
};

const subscribe = (notify: () => void) => {
  window.addEventListener(CHANGED, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGED, notify);
    window.removeEventListener("storage", notify);
  };
};

const useList = (key: string) => {
  const text = useSyncExternalStore(subscribe, () => raw(key), () => "[]");
  return useMemo(() => parse(text), [text]);
};

/** A customer's favorite and recently run reports, kept in this browser. */
export function useReportLists() {
  const favorites = useList(FAVORITES);
  const recent = useList(RECENT);

  const toggleFavorite = useCallback((type: string) => {
    const current = parse(raw(FAVORITES));
    write(FAVORITES, current.includes(type) ? current.filter((t) => t !== type) : [type, ...current]);
  }, []);

  const markRecent = useCallback((type: string) => {
    const current = parse(raw(RECENT));
    write(RECENT, [type, ...current.filter((t) => t !== type)].slice(0, RECENT_MAX));
  }, []);

  return { favorites, recent, toggleFavorite, markRecent };
}
