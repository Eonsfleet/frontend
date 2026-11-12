import apiClient from './client'
import type {
    AnalyticsErrorKind,
    AnomalyReport,
    DashboardAlert,
    DeviceStatusSummary,
    FleetHealthScore,
    IncidentSummary,
    LabelledSeries,
    TripCounts,
    VehicleStatusDistribution,
} from '@/types/analytics'

/**
 * Typed calls behind the Analytics Overview. Only the endpoints the Overview
 * uses live here; the telemetry events and the report catalog are typed in
 * telemetryReports.ts and reports.ts and are reused from there.
 *
 * Legacy endpoints (health score, incidents, trips) take a rolling `filter` of
 * 7d / 30d / 90d / 1y and silently ignore start_date / end_date, so these
 * functions accept `filter` only.
 */

export type LegacyPeriod = '7d' | '30d' | '90d' | '1y'

const unwrap = <T,>(body: { data?: T } & Partial<T>): T => (body?.data ?? body) as T

export const getFleetHealthScore = async (): Promise<FleetHealthScore> =>
    unwrap((await apiClient.get('/analytics/insights/fleet-health-score')).data)

/** Not requested with include=trend: that trend is computed from vehicle creation dates. */
export const getVehicleStatus = async (): Promise<VehicleStatusDistribution> =>
    unwrap((await apiClient.get('/dashboard/vehicles/status')).data)

export const getDeviceStatus = async (): Promise<DeviceStatusSummary> =>
    unwrap((await apiClient.get('/analytics/gps/device-status')).data)

export const getActiveAlerts = async (params: { severity?: 'critical' | 'warning'; limit?: number } = {}): Promise<DashboardAlert[]> => {
    const body = unwrap<{ alerts: DashboardAlert[] }>((await apiClient.get('/dashboard/alerts', { params })).data)
    return body.alerts ?? []
}

/** A POST that only reads. It runs six queries, so call it once and on demand. */
export const detectAnomalies = async (days = 30): Promise<AnomalyReport> =>
    unwrap((await apiClient.post('/analytics/insights/detect-anomalies', { days })).data)

export const getIncidentSummary = async (): Promise<IncidentSummary> =>
    unwrap((await apiClient.get('/analytics/incidents/summary')).data)

export const getIncidentsOverTime = async (filter: LegacyPeriod): Promise<LabelledSeries> =>
    unwrap((await apiClient.get('/analytics/incidents/over-time', { params: { filter } })).data)

export const getTripCounts = async (filter: LegacyPeriod): Promise<TripCounts> =>
    unwrap((await apiClient.get('/analytics/gps/trip-summary', { params: { filter } })).data)

/**
 * Classifies a failed call from the backend's own error body. The 403 code
 * ANALYTICS_ACCESS_DENIED means the role lacks this analytics category; the
 * frontend does not mirror the backend's permission list.
 */
export const classifyAnalyticsError = (error: unknown): AnalyticsErrorKind => {
    const response = (error as { response?: { status?: number; data?: { errors?: { code?: string }[] } } })?.response
    const status = response?.status
    if (status === 402) return 'payment_required'
    if (status === 403) {
        const code = response?.data?.errors?.[0]?.code
        return code === 'ANALYTICS_ACCESS_DENIED' ? 'forbidden' : 'not_in_plan'
    }
    if ((error as { isSubscriptionError?: boolean })?.isSubscriptionError) return 'not_in_plan'
    return 'unavailable'
}
