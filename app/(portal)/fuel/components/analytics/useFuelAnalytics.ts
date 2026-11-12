'use client'

import { useQuery } from '@tanstack/react-query'
import { getFuelAnalytics, type FuelAnalyticsParams } from '@/lib/api/fuelPage'

/** History does not change by the minute, so there is no poll: a new period or vehicle is a new query. */
export function useFuelAnalytics(params: FuelAnalyticsParams, enabled = true) {
    return useQuery({
        queryKey: ['fuel', 'analytics', params],
        queryFn: () => getFuelAnalytics(params),
        enabled,
        staleTime: 60_000,
        placeholderData: (previous) => previous,
    })
}
