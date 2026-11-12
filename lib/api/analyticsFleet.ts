import apiClient from './client'
import type { LegacyPeriod } from './analyticsOverview'
import type { AvailabilitySnapshot, AvailabilityTrend, FleetUtilizationSummary } from '@/types/analytics'

/**
 * Typed calls behind the Fleet tab. The legacy endpoints take a rolling
 * `filter` only. Distance-derived endpoints (top vehicles, asset performance)
 * are not called here until their units are verified.
 */

const unwrap = <T,>(body: { data?: T } & Partial<T>): T => (body?.data ?? body) as T

export const getFleetSummary = async (filter: LegacyPeriod): Promise<FleetUtilizationSummary> =>
    unwrap((await apiClient.get('/analytics/fleet/utilization-summary', { params: { filter } })).data)

export const getAvailabilitySnapshot = async (): Promise<AvailabilitySnapshot> =>
    unwrap((await apiClient.get('/analytics/fleet/availability-snapshot')).data)

export const getAvailabilityTrend = async (filter: LegacyPeriod): Promise<AvailabilityTrend> =>
    unwrap((await apiClient.get('/analytics/fleet/availability-trend', { params: { filter } })).data)
