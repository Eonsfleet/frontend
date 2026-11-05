import apiClient from './client'
import type { LegacyPeriod } from './analyticsOverview'
import { reportParams, type ReportFilters } from './telemetryReports'
import type { DocumentExpiry, DriverIncidentRow, DriverTelemetrySummary, DriverTripSummary, DriverVehicleUsage, InspectionSummary } from '@/types/analytics'

/**
 * Typed calls behind the Drivers tab. The scorecard endpoints and the workload
 * distribution are not called here: the scorecard score rests on assumptions and
 * a double-counting join, and the workload buckets are distance from another
 * source. Distance is not requested anywhere on this tab.
 */

const unwrap = <T,>(body: { data?: T } & Partial<T>): T => (body?.data ?? body) as T

const getReport = async <T,>(url: string, filters: object = {}): Promise<T> =>
    unwrap((await apiClient.get(url, { params: reportParams(filters), paramsSerializer: { indexes: null } })).data)

// ── Older driver endpoints (a rolling period, no entity filters) ─────────────

/** Every driver with a dispatched trip in the period. The backend cuts the list at `limit`, longest distance first. */
export const DRIVER_LIST_LIMIT = 500

export const getDriverTrips = async (filter: LegacyPeriod, limit = DRIVER_LIST_LIMIT): Promise<DriverTripSummary> =>
    unwrap((await apiClient.get('/analytics/drivers/trip-summary', { params: { filter, limit } })).data)

/** The backend returns a plain list, most incidents first, cut at `limit`. */
export const getDriverIncidents = async (limit = 100): Promise<DriverIncidentRow[]> => {
    const body = unwrap<DriverIncidentRow[]>((await apiClient.get('/analytics/drivers/incident-history', { params: { limit } })).data)
    return Array.isArray(body) ? body : []
}

// ── Tracker-store driver aggregates (period, vehicle, driver and cluster filters) ──

export const getDriverTelemetry = (filters: ReportFilters) => getReport<DriverTelemetrySummary>('/analytics/drivers/telemetry-summary', filters)

export const getDriverVehicleUsage = (filters: ReportFilters) => getReport<DriverVehicleUsage>('/analytics/drivers/vehicle-usage', filters)

export const getInspections = (filters: ReportFilters) => getReport<InspectionSummary>('/analytics/drivers/inspections', filters)

// ── Documents: no period, only the drivers whose documents (and assigned vehicles') are wanted ──

export const getDocumentExpiry = (params: { days?: number; driver_ids?: number[]; owner?: 'driver' | 'vehicle' | 'all'; limit?: number } = {}) =>
    getReport<DocumentExpiry>('/analytics/drivers/documents-expiry', params)
