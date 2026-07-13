'use client'

import { useQuery } from '@tanstack/react-query'
import { reverseGeocode } from '@/lib/gps'

/**
 * Resolves a lat/lng pair to a human-readable address via the shared Nominatim
 * helper. Cached indefinitely per rounded coordinate (addresses don't change and
 * Nominatim is rate-limited), and disabled when coordinates are missing.
 */
export function useReverseGeocode(lat: number | null, lng: number | null) {
    // Round to ~11m so nearby points share a cache entry and we make fewer calls.
    const key = lat != null && lng != null ? `${lat.toFixed(4)},${lng.toFixed(4)}` : null

    const query = useQuery({
        queryKey: ['reverse-geocode', key],
        queryFn: () => reverseGeocode(lat as number, lng as number),
        enabled: key != null,
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
    })

    return {
        address: query.data ?? null,
        isLoading: query.isLoading && key != null,
    }
}
