"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVehiclesMapPage, type VehicleMapEntry } from "@/lib/api/vehicles";

const PAGE_LIMIT = 1000;
const BACKGROUND_REFRESH_MS = 30_000;

interface UseProgressiveVehiclesParams {
  /** Free-text search term — omitted/empty fetches the full unfiltered fleet. */
  q?: string;
  enabled: boolean;
}

interface ProgressiveVehiclesState {
  vehicles: VehicleMapEntry[];
  loadedCount: number;
  total: number | null;
  isLoading: boolean;
  /** True until the very first full page-walk for the current params has completed. */
  isInitialLoad: boolean;
  error: unknown;
  /** Restarts the page-walk from page 1 (e.g. after a WS reconnect, or a manual refresh button). */
  refresh: () => void;
}

const baseState = {
  vehicles: [] as VehicleMapEntry[],
  loadedCount: 0,
  total: null as number | null,
  isLoading: false,
  isInitialLoad: true,
  error: null as unknown,
};

/**
 * Pages through GET /vehicles?view=map, rendering each page into state as it
 * arrives instead of blocking until the whole fleet has loaded (the old
 * getVehiclesBatched behavior). A generation counter discards results from a
 * superseded walk (e.g. the user typed a new search term mid-fetch, or a manual
 * refresh was triggered) so a slow stale page can't clobber newer state.
 *
 * Progressive reveal (each page replacing `vehicles` as it arrives) only
 * happens on the very first load. A background refresh (the 30s interval, or
 * a manual/reconnect-triggered refresh once data already exists) accumulates
 * off to the side and swaps `vehicles` in atomically when the walk completes —
 * otherwise every refresh cycle visibly shrank the fleet back to whatever one
 * page held before growing again, which is what caused the status-count/marker
 * flicker on every 30s tick.
 */
export function useProgressiveVehicles({
  q,
  enabled,
}: UseProgressiveVehiclesParams): ProgressiveVehiclesState {
  const [state, setState] = useState(baseState);
  const generationRef = useRef(0);
  const hasCompletedInitialLoadRef = useRef(false);
  // True while any walk (initial or background-refresh) is between its first
  // and last page. On a fleet large enough that paging takes longer than the
  // 30s background interval, the interval used to fire a second concurrent
  // walk — force=true (manual refresh, reconnect recovery) still preempts an
  // in-flight walk on purpose.
  const isRunningRef = useRef(false);

  const run = useCallback(
    async (force = false) => {
      if (isRunningRef.current && !force) return;
      isRunningRef.current = true;
      const generation = ++generationRef.current;
      const isBackgroundRefresh = hasCompletedInitialLoadRef.current;
      setState((prev) => ({
        ...(isBackgroundRefresh ? prev : baseState),
        isLoading: true,
        error: null,
      }));

      try {
        const seen = new Set<string>();
        const accumulated: VehicleMapEntry[] = [];
        let page = 1;
        let lastPage = 1;
        let total: number | null = null;

        do {
          const response = await getVehiclesMapPage({
            page,
            per_page: PAGE_LIMIT,
            q,
          });
          if (generation !== generationRef.current) return;

          for (const vehicle of response.data) {
            const key = String(vehicle.id);
            if (seen.has(key)) continue;
            seen.add(key);
            accumulated.push(vehicle);
          }
          lastPage =
            response.pagination.last_page ?? response.pagination.lastPage ?? 1;
          total = response.pagination.total ?? total;
          page++;

          // Only reveal partial progress for the very first load — a background
          // refresh keeps showing the last complete fleet until its own walk
          // finishes, so the list/map never visibly shrinks mid-refresh.
          if (!isBackgroundRefresh) {
            const snapshot = accumulated.slice();
            const snapshotTotal = total;
            setState((prev) => ({
              ...prev,
              vehicles: snapshot,
              loadedCount: snapshot.length,
              total: snapshotTotal,
              isLoading: page <= lastPage,
            }));
          }
        } while (page <= lastPage);

        if (generation !== generationRef.current) return;
        hasCompletedInitialLoadRef.current = true;
        setState((prev) => ({
          ...prev,
          vehicles: accumulated,
          loadedCount: accumulated.length,
          total,
          isLoading: false,
          isInitialLoad: false,
        }));
      } catch (error) {
        if (generation !== generationRef.current) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isInitialLoad: false,
          error,
        }));
      } finally {
        if (generation === generationRef.current) isRunningRef.current = false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [q],
  );

  useEffect(() => {
    if (!enabled) {
      generationRef.current++;
      hasCompletedInitialLoadRef.current = false;
      isRunningRef.current = false;
      setState(baseState);
      return;
    }

    hasCompletedInitialLoadRef.current = false;
    isRunningRef.current = false;
    run(true);

    const intervalId = setInterval(() => run(), BACKGROUND_REFRESH_MS);
    return () => {
      clearInterval(intervalId);
      // Bump the generation on unmount so any walk still mid-flight (e.g. a
      // React Strict Mode dev double-mount, or a genuine unmount/remount) sees
      // a generation mismatch on its next page and stops writing into state.
      generationRef.current++;
      isRunningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, q]);

  const refresh = useCallback(() => {
    if (!enabled) return;
    run(true);
  }, [enabled, run]);

  return { ...state, refresh };
}
