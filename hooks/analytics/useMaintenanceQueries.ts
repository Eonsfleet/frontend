'use client'

import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/analyticsMaintenance'
import { classifyAnalyticsError } from '@/lib/api/analyticsOverview'
import { legacyPeriod } from './useOverviewQueries'
import type { AnalyticsFilters } from '@/lib/analytics/filters'

/** Same defaults as the other tabs: five minutes fresh, no refetch on focus, no retry of a 402/403. */
const base = {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (count: number, error: unknown) => classifyAnalyticsError(error) === 'unavailable' && count < 1,
} as const

export const useScheduleSummary = () =>
    useQuery({ queryKey: ['analytics', 'maintenance', 'schedules'], queryFn: api.getScheduleSummary, ...base })

export const useMaintenanceDue = (enabled = true) =>
    useQuery({ queryKey: ['analytics', 'maintenance', 'due'], queryFn: api.getMaintenanceDue, enabled, ...base })

export const useMaintenanceCost = (filters: AnalyticsFilters, enabled: boolean) => {
    const period = legacyPeriod(filters)
    return useQuery({ queryKey: ['analytics', 'maintenance', 'cost', period], queryFn: () => api.getMaintenanceCost(period), enabled, ...base })
}

export const useMaintenanceWorkflow = (enabled: boolean) =>
    useQuery({ queryKey: ['analytics', 'maintenance', 'workflow'], queryFn: api.getMaintenanceWorkflow, enabled, ...base })

export const useWorkshopSummary = (enabled: boolean) =>
    useQuery({ queryKey: ['analytics', 'maintenance', 'workshop'], queryFn: api.getWorkshopSummary, enabled, ...base })
