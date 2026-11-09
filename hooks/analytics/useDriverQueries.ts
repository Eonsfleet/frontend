'use client'

import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/analyticsDrivers'
import { classifyAnalyticsError } from '@/lib/api/analyticsOverview'
import { getEventCounts, getTrips } from '@/lib/api/telemetryReports'
import { legacyPeriod, telemetryFilters } from './useOverviewQueries'
import type { AnalyticsFilters } from '@/lib/analytics/filters'

/** Same defaults as the other tabs: five minutes fresh, no refetch on focus, no retry of a 402/403. */
const base = {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (count: number, error: unknown) => classifyAnalyticsError(error) === 'unavailable' && count < 1,
} as const

export const useDriverTrips = (filters: AnalyticsFilters, enabled: boolean) => {
    const period = legacyPeriod(filters)
    return useQuery({ queryKey: ['analytics', 'drivers', 'trips', period], queryFn: () => api.getDriverTrips(period), enabled, ...base })
}

export const useDriverIncidents = (enabled: boolean) =>
    useQuery({ queryKey: ['analytics', 'drivers', 'incidents'], queryFn: () => api.getDriverIncidents(), enabled, ...base })

/** Events per driver from the tracker store, optionally one category (the server filters it). */
export const useDriverEvents = (filters: AnalyticsFilters, category: string | null, enabled: boolean) => {
    const params = { ...telemetryFilters(filters), ...(category ? { categories: [category] } : {}) }
    return useQuery({
        queryKey: ['analytics', 'drivers', 'events', params],
        queryFn: () => getEventCounts({ ...params, group_by: 'driver' }),
        enabled,
        ...base,
    })
}

// ── Tracker-store driver aggregates ──────────────────────────────────────────

export const useDriverTelemetry = (filters: AnalyticsFilters, enabled: boolean) => {
    const params = telemetryFilters(filters)
    return useQuery({ queryKey: ['analytics', 'drivers', 'telemetry', params], queryFn: () => api.getDriverTelemetry(params), enabled, ...base })
}

export const useDriverVehicleUsage = (filters: AnalyticsFilters, enabled: boolean) => {
    const params = telemetryFilters(filters)
    return useQuery({ queryKey: ['analytics', 'drivers', 'vehicle-usage', params], queryFn: () => api.getDriverVehicleUsage(params), enabled, ...base })
}

export const useInspections = (filters: AnalyticsFilters, enabled: boolean) => {
    const params = telemetryFilters(filters)
    return useQuery({ queryKey: ['analytics', 'drivers', 'inspections', params], queryFn: () => api.getInspections(params), enabled, ...base })
}

/** Documents about to expire (30 days) or just expired, for these drivers and their assigned vehicles, or for everyone. */
export const useDocumentExpiry = (driverIds: number[], enabled: boolean) =>
    useQuery({
        queryKey: ['analytics', 'drivers', 'document-expiry', driverIds],
        queryFn: () => api.getDocumentExpiry({ days: 30, ...(driverIds.length ? { driver_ids: driverIds } : {}) }),
        enabled,
        ...base,
    })

/** One driver's trips, newest first, for the timeline. The window is at most 30 days, so 300 rows cover a busy driver. */
export const TIMELINE_TRIP_LIMIT = 300

export const useDriverTripRows = (filters: AnalyticsFilters, enabled: boolean) => {
    const params = { ...telemetryFilters(filters), per_page: TIMELINE_TRIP_LIMIT }
    return useQuery({ queryKey: ['analytics', 'drivers', 'trip-rows', params], queryFn: () => getTrips(params), enabled, ...base })
}
