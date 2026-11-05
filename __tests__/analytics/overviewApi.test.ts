import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/lib/api/client', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }))

import * as api from '@/lib/api/analyticsOverview'
import { telemetryFilters } from '@/hooks/analytics/useOverviewQueries'
import { parseFilters } from '@/lib/analytics/filters'

const ok = (data: unknown) => ({ data: { message: 'ok', data } })

describe('Overview API contracts (shapes read from the backend services)', () => {
    beforeEach(() => {
        get.mockReset()
        post.mockReset()
    })

    it('reads the fleet health score as the backend returns it, with the four components', async () => {
        const body = {
            score: 72.5, rating: 'good', total_vehicles: 20, computed_at: '2026-11-03T09:00:00Z',
            components: { vehicle_active_rate: 80, maintenance_compliance: 70, incident_free_rate: 90, fuel_efficiency_score: 100 },
        }
        get.mockResolvedValue(ok(body))
        expect(await api.getFleetHealthScore()).toEqual(body)
        expect(get).toHaveBeenCalledWith('/analytics/insights/fleet-health-score')
    })

    it('asks for fleet status without the trend, whose figures come from vehicle creation dates', async () => {
        get.mockResolvedValue(ok({ distribution: [{ status: 'active', count: 4, percentage: 80 }], total: 5 }))
        await api.getVehicleStatus()
        expect(get).toHaveBeenCalledWith('/dashboard/vehicles/status')
    })

    it('unwraps alerts from their envelope and defaults to none', async () => {
        get.mockResolvedValueOnce(ok({ alerts: [{ id: 'incident-3', type: 'incident', severity: 'critical' }] }))
        expect(await api.getActiveAlerts({ limit: 25 })).toHaveLength(1)
        expect(get).toHaveBeenLastCalledWith('/dashboard/alerts', { params: { limit: 25 } })

        get.mockResolvedValueOnce(ok({}))
        expect(await api.getActiveAlerts()).toEqual([])
    })

    it('runs anomaly detection as a POST with the look-back in days', async () => {
        post.mockResolvedValue(ok({ anomaly_count: 0, anomalies: [] }))
        await api.detectAnomalies(30)
        expect(post).toHaveBeenCalledWith('/analytics/insights/detect-anomalies', { days: 30 })
    })

    it('sends legacy endpoints a rolling filter only', async () => {
        get.mockResolvedValue(ok({ labels: [], data: [] }))
        await api.getIncidentsOverTime('90d')
        await api.getTripCounts('1y')
        expect(get).toHaveBeenNthCalledWith(1, '/analytics/incidents/over-time', { params: { filter: '90d' } })
        expect(get).toHaveBeenNthCalledWith(2, '/analytics/gps/trip-summary', { params: { filter: '1y' } })
    })
})

describe('telemetry filters for the alarm widgets', () => {
    const NOW = new Date('2026-11-03T10:00:00+01:00')
    const f = (qs: string) => parseFilters(new URLSearchParams(qs))

    it('sends a preset as `filter` and a custom range as dates, plus entity filters', () => {
        expect(telemetryFilters(f('filter=7d&vehicle_ids=1,2&driver_ids=5&cluster_ids=9'))).toEqual({ filter: '7d', vehicle_ids: [1, 2], driver_ids: [5], cluster_ids: [9] })
        expect(telemetryFilters(f('start_date=2026-10-01&end_date=2026-10-09'))).toEqual({ start_date: '2026-10-01', end_date: '2026-10-09' })
    })

    it('sends the previous period as explicit dates, keeping the entity filters', () => {
        expect(telemetryFilters(f('filter=7d&vehicle_ids=3'), 'previous', NOW)).toEqual({ start_date: '2026-10-21', end_date: '2026-10-27', vehicle_ids: [3] })
    })
})

describe('classifying a failed analytics call from the backend body', () => {
    const err = (status: number, code?: string) => ({ response: { status, data: { errors: code ? [{ code }] : [] } } })

    it('tells a role denial from a plan denial and a payment block', () => {
        expect(api.classifyAnalyticsError(err(403, 'ANALYTICS_ACCESS_DENIED'))).toBe('forbidden')
        expect(api.classifyAnalyticsError(err(403, 'MODULE_NOT_IN_PLAN'))).toBe('not_in_plan')
        expect(api.classifyAnalyticsError(err(403))).toBe('not_in_plan')
        expect(api.classifyAnalyticsError(err(402))).toBe('payment_required')
        expect(api.classifyAnalyticsError({ isSubscriptionError: true })).toBe('not_in_plan')
    })

    it('treats everything else as a failure to load', () => {
        expect(api.classifyAnalyticsError(err(500))).toBe('unavailable')
        expect(api.classifyAnalyticsError(err(422))).toBe('unavailable')
        expect(api.classifyAnalyticsError(new Error('Network Error'))).toBe('unavailable')
        expect(api.classifyAnalyticsError(undefined)).toBe('unavailable')
    })
})
