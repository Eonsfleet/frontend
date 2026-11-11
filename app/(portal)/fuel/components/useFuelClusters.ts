'use client'

import { useQuery } from '@tanstack/react-query'
import { getClustersBatched } from '@/lib/api/settings'

/** Cluster options for a filter: id and name, every cluster in the organization. */
export function useFuelClusters() {
    const query = useQuery({ queryKey: ['fuel', 'clusters'], queryFn: getClustersBatched, staleTime: 10 * 60_000 })
    return {
        clusters: (query.data ?? []).map((c) => ({ id: Number(c.id), name: c.attributes.name })),
        isLoading: query.isLoading,
    }
}
