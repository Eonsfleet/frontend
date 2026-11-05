'use client'

import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/analyticsOverview'
import { getEventCounts, getEventTrend, type ReportFilters } from '@/lib/api/telemetryReports'
import { getReportCatalog } from '@/lib/api/reports'
import { previousDates, type AnalyticsFilters, type RangePreset } from '@/lib/analytics/filters'

/**
 * One hook per Overview widget. Query keys carry every input that changes the
 * request, so a filter change is a new key, never a stale hit. Defaults:
 * five minutes fresh, no refetch on window focus, and no retry of a 402/403
 * (those answers do not change by asking again).
 */

const FIVE_MINUTES = 5 * 60_000

const retryUnlessDenied = (count: number, error: unknown) => api.classifyAnalyticsError(error) === 'unavailable' && count < 1

const base = { staleTime: FIVE_MINUTES, refetchOnWindowFocus: false, retry: retryUnlessDenied } as const

type Legacy = api.LegacyPeriod

export const legacyPeriod = (filters: AnalyticsFilters): Legacy =>
    filters.range.kind === 'preset' && (['7d', '30d', '90d', '1y'] as RangePreset[]).includes(filters.range.preset)
        ? (filters.range.preset as Legacy)
        : '30d'

/** The filters in the shape the telemetry endpoints read, for this period or the one before it. */
export function telemetryFilters(filters: AnalyticsFilters, which: 'current' | 'previous' = 'current', now: Date = new Date()): ReportFilters {
    const out: ReportFilters = {}
    if (which === 'previous') {
        const { start, end } = previousDates(filters.range, now)
        out.start_date = start
        out.end_date = end
    } else if (filters.range.kind === 'custom') {
        out.start_date = filters.range.start
        out.end_date = filters.range.end
    } else {
        out.filter = filters.range.preset as ReportFilters['filter']
    }
    if (filters.vehicleIds.length) out.vehicle_ids = filters.vehicleIds
    if (filters.driverIds.length) out.driver_ids = filters.driverIds
    if (filters.clusterIds.length) out.cluster_ids = filters.clusterIds
    return out
}

// ── Above the fold ───────────────────────────────────────────────────────────

export const useFleetHealth = () =>
    useQuery({ queryKey: ['analytics', 'health'], queryFn: api.getFleetHealthScore, ...base })

export const useVehicleStatus = () =>
    useQuery({ queryKey: ['analytics', 'vehicle-status'], queryFn: api.getVehicleStatus, ...base })

export const useDeviceStatus = () =>
    useQuery({ queryKey: ['analytics', 'device-status'], queryFn: api.getDeviceStatus, ...base })

export const useActiveAlerts = () =>
    useQuery({ queryKey: ['analytics', 'alerts'], queryFn: () => api.getActiveAlerts({ limit: 25 }), ...base })

/** Alarms and events, grouped by category: the total is the sum of the groups. */
export const useAlarmCounts = (filters: AnalyticsFilters, which: 'current' | 'previous', enabled: boolean) => {
    const params = telemetryFilters(filters, which)
    return useQuery({
        queryKey: ['analytics', 'alarms', 'counts', which, params],
        queryFn: () => getEventCounts({ ...params, group_by: 'category' }),
        enabled,
        ...base,
    })
}

export const useReportCatalog = (enabled = true) =>
    useQuery({ queryKey: ['report-catalog'], queryFn: getReportCatalog, staleTime: FIVE_MINUTES, retry: 1, enabled })

// ── Below the fold: started when scrolled near ───────────────────────────────

export const useAlarmTrend = (filters: AnalyticsFilters, enabled: boolean) => {
    const params = telemetryFilters(filters)
    return useQuery({ queryKey: ['analytics', 'alarms', 'trend', params], queryFn: () => getEventTrend(params), enabled, ...base })
}

export const useIncidentTrend = (filters: AnalyticsFilters, enabled: boolean) => {
    const period = legacyPeriod(filters)
    return useQuery({ queryKey: ['analytics', 'incidents', 'trend', period], queryFn: () => api.getIncidentsOverTime(period), enabled, ...base })
}

export const useIncidentSummary = (enabled: boolean) =>
    useQuery({ queryKey: ['analytics', 'incidents', 'summary'], queryFn: api.getIncidentSummary, enabled, ...base })

export const useTripCounts = (filters: AnalyticsFilters, enabled: boolean) => {
    const period = legacyPeriod(filters)
    return useQuery({ queryKey: ['analytics', 'trips', period], queryFn: () => api.getTripCounts(period), enabled, ...base })
}

/**
 * Rule-based anomaly detection runs six queries on the server and returns new
 * ids every call, so it is fetched once, only when the panel is near the
 * viewport, and kept for fifteen minutes. It never refetches by itself.
 */
export const useAnomalies = (enabled: boolean) =>
    useQuery({
        queryKey: ['analytics', 'anomalies', 30],
        queryFn: () => api.detectAnomalies(30),
        enabled,
        staleTime: 15 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: retryUnlessDenied,
    })
