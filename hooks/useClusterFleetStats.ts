"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as settingsApi from "@/lib/api/settings";
import * as vehicleApi from "@/lib/api/vehicles";
import { matchesStatusBucket } from "@/lib/vehicleStatus";
import type { Vehicle } from "@/types/vehicle";
import type { Cluster } from "@/types/vehicle";

export interface ClusterFleetStats {
  id: string;
  name: string;
  manager: string | null;
  totalStaff: number;
  total: number;
  online: number;
  offline: number;
  /** True until at least one vehicle page has been read — online/offline counts are not final yet (total comes straight from the cluster record, so it's accurate immediately). */
  isCountPending: boolean;
}

const VEHICLE_PAGE_SIZE = 500;

/**
 * Pages through the org's full vehicle list progressively — each page is
 * revealed as it arrives instead of blocking until the whole fleet has
 * loaded. Shared by every hook in this file so the (relatively slow, several
 * sequential requests for a large org) vehicle page-walk only ever runs once
 * and its result is reused, rather than being re-fetched per consumer.
 */
function useAllVehicles(enabled: boolean) {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      generationRef.current++;
      setAllVehicles([]);
      setIsLoading(false);
      return;
    }

    const generation = ++generationRef.current;
    setIsLoading(true);

    (async () => {
      const seen = new Set<string>();
      let accumulated: Vehicle[] = [];
      let page = 1;
      let lastPage = 1;

      try {
        do {
          const response = await vehicleApi.getVehicles({ page, per_page: VEHICLE_PAGE_SIZE });
          if (generation !== generationRef.current) return;

          for (const vehicle of response.data) {
            const key = String(vehicle.id);
            if (seen.has(key)) continue;
            seen.add(key);
            accumulated.push(vehicle);
          }
          lastPage = response.pagination.last_page ?? response.pagination.lastPage ?? 1;
          page++;

          // Reveal partial progress after every page instead of waiting for
          // the full page-walk to finish.
          setAllVehicles(accumulated.slice());
          setIsLoading(page <= lastPage);
        } while (page <= lastPage);
      } catch {
        if (generation === generationRef.current) setIsLoading(false);
      }
    })();

    return () => {
      generationRef.current++;
    };
  }, [enabled]);

  return { allVehicles, isLoading };
}

function computeClusterStats(
  clusterList: Cluster[],
  vehicles: Vehicle[],
  isCountPending: boolean,
): ClusterFleetStats[] {
  const byCluster = new Map<
    string,
    { name: string; manager: string | null; totalStaff: number; total: number; online: number; offline: number }
  >();
  for (const cluster of clusterList) {
    byCluster.set(String(cluster.id), {
      name: cluster.attributes.name,
      manager: cluster.attributes.manager,
      totalStaff: cluster.attributes.total_users ?? 0,
      // The cluster record already carries its own vehicle count — use it
      // directly instead of waiting on the org-wide vehicle page-walk, so
      // "Total" is correct the instant clusters load.
      total: cluster.attributes.total_vehicles ?? 0,
      online: 0,
      offline: 0,
    });
  }

  for (const v of vehicles) {
    const clusterId = v.relationships?.cluster?.id;
    if (!clusterId) continue;
    const entry = byCluster.get(String(clusterId));
    if (!entry) continue;

    const loc = v.relationships?.current_location;
    const input = {
      status: v.attributes?.status,
      is_online: v.attributes?.is_online ?? false,
      speed: Number(loc?.speed ?? v.attributes?.speed ?? 0) || 0,
    };
    if (matchesStatusBucket("online", input)) entry.online++;
    else entry.offline++;
  }

  return Array.from(byCluster.entries()).map(([id, c]) => ({
    id,
    name: c.name,
    manager: c.manager,
    totalStaff: c.totalStaff,
    total: c.total,
    online: c.online,
    offline: c.offline,
    isCountPending,
  }));
}

/**
 * Single source of truth for per-cluster fleet counts, across EVERY cluster
 * in the org. Used where the full set matters at once (the Dashboard's
 * cluster distribution chart, a single cluster's detail page) — clusters
 * render as soon as getClustersBatched() resolves (fast, small payload);
 * online/offline counts fill in progressively as the vehicle page-walk
 * completes, instead of the whole module blocking on it.
 */
export function useClusterFleetStats(enabled = true) {
  const { data: clusterList, isLoading: isClustersLoading } = useQuery({
    queryKey: ["cluster-fleet-stats-clusters"],
    queryFn: () => settingsApi.getClustersBatched(),
    enabled,
  });

  const { allVehicles, isLoading: isVehiclesLoading } = useAllVehicles(enabled);

  const clusters: ClusterFleetStats[] = useMemo(() => {
    return computeClusterStats(clusterList || [], allVehicles, isVehiclesLoading);
  }, [clusterList, allVehicles, isVehiclesLoading]);

  return {
    clusters,
    allVehicles,
    /** True only while clusters themselves haven't loaded yet — counts fill in afterward without blocking the UI. */
    isLoading: isClustersLoading,
    isCountPending: isVehiclesLoading,
  };
}

/** Vehicles belonging to a single cluster, from the same shared progressive fetch. */
export function useClusterVehicles(clusterId: string | undefined, enabled = true) {
  const { allVehicles, isLoading, isCountPending } = useClusterFleetStats(enabled && !!clusterId);

  const vehicles = useMemo(() => {
    if (!clusterId) return [];
    return allVehicles.filter((v) => String(v.relationships?.cluster?.id) === String(clusterId));
  }, [allVehicles, clusterId]);

  return { vehicles, isLoading, isCountPending };
}

/**
 * Server-paginated cluster list for the Clusters module's own card grid —
 * fetches ONE page of clusters at a time (matching the backend's pagination),
 * rather than the full-org fetch useClusterFleetStats does. Online/offline
 * counts for the current page's clusters are derived from the same shared
 * vehicle page-walk (useAllVehicles) so the vehicle list is never fetched
 * twice — only the (fast, small) cluster page request happens per page turn.
 */
export function usePaginatedClusters(page: number, perPage = 9, enabled = true) {
  const { data: response, isLoading: isClustersLoading } = useQuery({
    queryKey: ["clusters-page", page, perPage],
    queryFn: () => settingsApi.getClusters({ page, per_page: perPage }),
    enabled,
  });

  const { allVehicles, isLoading: isVehiclesLoading } = useAllVehicles(enabled);

  const clusterList = response?.data?.clusters || [];
  const pagination = response?.data?.pagination;

  const clusters: ClusterFleetStats[] = useMemo(
    () => computeClusterStats(clusterList, allVehicles, isVehiclesLoading),
    [clusterList, allVehicles, isVehiclesLoading],
  );

  return {
    clusters,
    isLoading: isClustersLoading,
    isCountPending: isVehiclesLoading,
    currentPage: pagination?.current ?? page,
    lastPage: pagination?.lastPage ?? pagination?.last_page ?? 1,
    total: pagination?.total ?? 0,
  };
}
