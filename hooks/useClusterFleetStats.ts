"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as settingsApi from "@/lib/api/settings";
import * as vehicleApi from "@/lib/api/vehicles";
import { matchesStatusBucket } from "@/lib/vehicleStatus";
import { STALE_TIME_REALTIME } from "@/lib/config";
import type { Vehicle } from "@/types/vehicle";

export interface ClusterFleetStats {
  id: string;
  name: string;
  manager: string | null;
  totalStaff: number;
  total: number;
  online: number;
  offline: number;
}

/**
 * Single source of truth for per-cluster fleet counts. Groups the full org
 * vehicle list by relationships.cluster.id and buckets each vehicle as
 * online/offline via lib/vehicleStatus.ts, so Dashboard, the Cluster list,
 * and a Cluster's detail page can never disagree on these numbers.
 */
export function useClusterFleetStats(enabled = true) {
  const { data: clustersData, isLoading: isClustersLoading } = useQuery({
    queryKey: ["cluster-fleet-stats-clusters"],
    queryFn: () => settingsApi.getClusters(),
    enabled,
  });

  const { data: allVehicles, isLoading: isVehiclesLoading } = useQuery({
    queryKey: ["cluster-fleet-stats-vehicles"],
    queryFn: () => vehicleApi.getVehiclesBatched({}),
    enabled,
    staleTime: STALE_TIME_REALTIME,
  });

  const clusters: ClusterFleetStats[] = useMemo(() => {
    const clusterList = clustersData?.data?.clusters || [];
    const vehicles: Vehicle[] = allVehicles || [];

    const byCluster = new Map<
      string,
      { name: string; manager: string | null; totalStaff: number; online: number; offline: number }
    >();
    for (const cluster of clusterList) {
      byCluster.set(String(cluster.id), {
        name: cluster.attributes.name,
        manager: cluster.attributes.manager,
        totalStaff: cluster.attributes.total_users ?? 0,
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
      total: c.online + c.offline,
      online: c.online,
      offline: c.offline,
    }));
  }, [clustersData, allVehicles]);

  return {
    clusters,
    allVehicles: allVehicles || [],
    isLoading: isClustersLoading || isVehiclesLoading,
  };
}

/** Vehicles belonging to a single cluster, from the same shared fetch. */
export function useClusterVehicles(clusterId: string | undefined, enabled = true) {
  const { allVehicles, isLoading } = useClusterFleetStats(enabled && !!clusterId);

  const vehicles = useMemo(() => {
    if (!clusterId) return [];
    return allVehicles.filter((v) => String(v.relationships?.cluster?.id) === String(clusterId));
  }, [allVehicles, clusterId]);

  return { vehicles, isLoading };
}
