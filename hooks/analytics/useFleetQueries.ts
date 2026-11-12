'use client'

import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/analyticsFleet'
import { classifyAnalyticsError } from '@/lib/api/analyticsOverview'
import { getEventCounts, getTrackers, getTrips } from '@/lib/api/telemetryReports'
import { legacyPeriod, telemetryFilters } from './useOverviewQueries'
import type { AnalyticsFilters } from '@/lib/analytics/filters'

/** Same defaults as the Overview: five minutes fresh, no refetch on focus, no retry of a 402/403. */
const base = {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (count: number, error: unknown) => classifyAnalyticsError(error) === 'unavailable' && count < 1,
} as const

export const useFleetSummary = (filters: AnalyticsFilters, enabled = true) => {
    const period = legacyPeriod(filters)
    return useQuery({ queryKey: ['analytics', 'fleet', 'summary', period], queryFn: () => api.getFleetSummary(period), enabled, ...base })
}

export const useAvailabilitySnapshot = () =>
    useQuery({ queryKey: ['analytics', 'fleet', 'availability-snapshot'], queryFn: api.getAvailabilitySnapshot, ...base })

export const useAvailabilityTrend = (filters: AnalyticsFilters, enabled: boolean) => {
    const period = legacyPeriod(filters)
    return useQuery({ queryKey: ['analytics', 'fleet', 'availability-trend', period], queryFn: () => api.getAvailabilityTrend(period), enabled, ...base })
}

// ── Tracker-store figures (the telemetry endpoints), filtered by vehicle, driver and cluster ──

/**
 * One request carries the whole period: `extra.totals` for the fleet and
 * `extra.vehicles` for every vehicle, both grouped on the server. Only one row
 * is asked for, since the rows themselves are not used here.
 */
export const useFleetTrips = (filters: AnalyticsFilters, enabled: boolean) => {
    const params = { ...telemetryFilters(filters), per_page: 1 }
    return useQuery({ queryKey: ['analytics', 'fleet', 'trips', params], queryFn: () => getTrips(params), enabled, ...base })
}

export const useTrackerHealth = (filters: AnalyticsFilters, enabled: boolean) => {
    const params = { ...telemetryFilters(filters), per_page: 1 }
    return useQuery({ queryKey: ['analytics', 'fleet', 'trackers', params], queryFn: () => getTrackers(params), enabled, ...base })
}

export const useVehicleAlarms = (filters: AnalyticsFilters, enabled: boolean) => {
    const params = telemetryFilters(filters)
    return useQuery({
        queryKey: ['analytics', 'fleet', 'alarms-by-vehicle', params],
        queryFn: () => getEventCounts({ ...params, group_by: 'vehicle' }),
        enabled,
        ...base,
    })
}
