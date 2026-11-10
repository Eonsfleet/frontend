'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFuelOverviewSummary, type FuelOverviewParams } from '@/lib/api/fuelPage'
import { useAuthStore } from '@/store/authStore'
import { useEcho } from '@/hooks/useEcho'

/**
 * The Overview's one query. It refreshes on a slow poll, and at once when a new
 * fuel alert arrives on `fuel.alerts.{org}`, so "needs action today" is not a
 * snapshot from when the page was opened.
 */
export function useFuelOverviewSummary(params: FuelOverviewParams, enabled = true) {
    const queryClient = useQueryClient()
    const { token, organization } = useAuthStore()
    const { subscribePrivate } = useEcho()

    const query = useQuery({
        queryKey: ['fuel', 'overview', params],
        queryFn: () => getFuelOverviewSummary(params),
        enabled,
        refetchInterval: 60_000,
        staleTime: 20_000,
    })

    useEffect(() => {
        const org = organization?.attributes?.identifier || organization?.id
        if (!token || !org) return
        return subscribePrivate(`fuel.alerts.${org}`, '.fuel_alert', () => {
            queryClient.invalidateQueries({ queryKey: ['fuel'] })
        })
    }, [token, organization?.attributes?.identifier, organization?.id, subscribePrivate, queryClient])

    return query
}
