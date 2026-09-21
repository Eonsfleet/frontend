"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as settingsApi from "@/lib/api/settings";
import * as vehicleApi from "@/lib/api/vehicles";
import { STALE_TIME_STATIC } from "@/lib/config";
import type { Cluster } from "@/types/vehicle";

export interface ClusterFleetStats {
  id: string;
  name: string;
  manager: string | null;
  totalStaff: number;
  total: number;
  online: number;
  offline: number;
}

function toClusterFleetStats(clusterList: Cluster[]): ClusterFleetStats[] {
  return clusterList.map((cluster) => ({
    id: String(cluster.id),
    name: cluster.attributes.name,
    manager: cluster.attributes.manager,
    totalStaff: cluster.attributes.total_users ?? 0,
    total: cluster.attributes.total_vehicles ?? 0,
    online: cluster.attributes.active_vehicles ?? 0,
    offline: cluster.attributes.inactive_vehicles ?? 0,
  }));
}

/**
 * Single source of truth for per-cluster fleet counts, across EVERY cluster
 * in the org. Counts come straight from the cluster record (backend now
 * computes active/inactive per cluster), so this is a single fast request
 * with no dependent vehicle fetch.
 */
export function useClusterFleetStats(enabled = true) {
  const { data: clusterList, isLoading } = useQuery({
    queryKey: ["cluster-fleet-stats-clusters"],
    queryFn: () => settingsApi.getClustersBatched(),
    enabled,
    staleTime: STALE_TIME_STATIC,
  });

  const clusters: ClusterFleetStats[] = useMemo(
    () => toClusterFleetStats(clusterList || []),
    [clusterList],
  );

  return { clusters, isLoading };
}

/**
 * Vehicles belonging to a single cluster, for the cluster detail page's
 * asset table. The backend has no cluster filter on GET /vehicles, so this
 * fetches the full org list (cached under a shared key — reused by any
 * other consumer that needs every vehicle) and filters client-side by
 * relationship. This is independent of cluster stats/counts, which come
 * directly from the cluster record and never wait on this fetch.
 */
export function useClusterVehicles(clusterId: string | undefined, enabled = true) {
  const { data: allVehicles, isLoading } = useQuery({
    queryKey: ["vehicles-all-full"],
    queryFn: () => vehicleApi.getVehiclesBatched(),
    enabled: enabled && !!clusterId,
    staleTime: STALE_TIME_STATIC,
  });

  const vehicles = useMemo(() => {
    if (!clusterId || !allVehicles) return [];
    return allVehicles.filter((v) => String(v.relationships?.cluster?.id) === String(clusterId));
  }, [allVehicles, clusterId]);

  return { vehicles, isLoading };
}

/**
 * Server-paginated cluster list for the Clusters module's own card grid —
 * fetches ONE page of clusters at a time (matching the backend's
 * pagination). Online/offline/total all come straight from each cluster's
 * own record, so a page of cards is ready the instant this one request
 * resolves — no second data source, no waiting.
 */
export function usePaginatedClusters(page: number, perPage = 9, enabled = true) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["clusters-page", page, perPage],
    queryFn: () => settingsApi.getClusters({ page, per_page: perPage }),
    enabled,
    staleTime: STALE_TIME_STATIC,
  });

  const pagination = response?.data?.pagination;

  const clusters: ClusterFleetStats[] = useMemo(
    () => toClusterFleetStats(response?.data?.clusters || []),
    [response],
  );

  return {
    clusters,
    isLoading,
    currentPage: pagination?.current ?? page,
    lastPage: pagination?.lastPage ?? pagination?.last_page ?? 1,
    total: pagination?.total ?? 0,
  };
}
