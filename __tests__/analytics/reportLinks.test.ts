import { describe, expect, it } from 'vitest'
import { buildReportLink, settingsFromSearch } from '@/lib/analytics/reportLinks'
import { parseFilters } from '@/lib/analytics/filters'
import type { CatalogReport } from '@/lib/api/reports'

const report = (over: Partial<CatalogReport>): CatalogReport => ({
    type: 'events.counts', title: 'Alarms and events: counts', category: 'alarms', permission: 'view_gps_analytics', endpoint: '/v1/analytics/events/counts',
    filters: ['start_date', 'end_date', 'filter', 'vehicle_ids', 'driver_ids', 'cluster_ids', 'page', 'per_page'], columns: [], window: '60d', allowed: true, ...over,
})
const f = (qs: string) => parseFilters(new URLSearchParams(qs))
const NOW = new Date('2026-11-03T10:00:00+01:00')

describe('report deep links', () => {
    it('opens the report with the period and vehicles it can take', () => {
        const link = buildReportLink('events.counts', [report({})], f('filter=7d&vehicle_ids=3,4'), NOW)!
        const params = new URLSearchParams(link.href.split('?')[1])
        expect(link.href.startsWith('/reports?')).toBe(true)
        expect(params.get('report')).toBe('events.counts')
        expect(params.get('filter')).toBe('7d')
        expect(params.get('vehicle_ids')).toBe('3,4')
        expect(link.applied).toEqual(['Period', 'Vehicles'])
        expect(link.held).toEqual([])
    })

    it('holds back drivers and clusters, which the Reports page cannot scope by yet, and says so', () => {
        const link = buildReportLink('events.counts', [report({})], f('driver_ids=2&cluster_ids=1'), NOW)!
        expect(link.href).not.toMatch(/driver_ids|cluster_ids/)
        expect(link.held.map((h) => h.filter)).toEqual(['Drivers', 'Clusters'])
        expect(link.held[0].reason).toMatch(/cannot scope a report by drivers/)
    })

    it('holds back a filter the report itself does not list', () => {
        const link = buildReportLink('fleet.utilization-report', [report({ type: 'fleet.utilization-report', filters: ['start_date', 'end_date', 'filter', 'vehicle_ids'] })], f('driver_ids=2'), NOW)!
        expect(link.held[0].reason).toBe('This report does not filter by drivers.')
    })

    it('does not carry a range longer than the 60 days kept, and says so', () => {
        const link = buildReportLink('events.counts', [report({})], f('filter=90d'), NOW)!
        expect(link.href).not.toMatch(/filter=/)
        expect(link.held).toEqual([{ filter: 'Period', reason: expect.stringMatching(/60 days/) }])
    })

    it('sends explicit dates for a custom range', () => {
        const link = buildReportLink('events.counts', [report({})], f('start_date=2026-10-01&end_date=2026-10-09'), NOW)!
        const params = new URLSearchParams(link.href.split('?')[1])
        expect(params.get('start_date')).toBe('2026-10-01')
        expect(params.get('end_date')).toBe('2026-10-09')
    })

    it('gives no link for a report that is unknown or not allowed for this user', () => {
        expect(buildReportLink('nope', [report({})], f(''), NOW)).toBeNull()
        expect(buildReportLink('events.counts', [report({ allowed: false })], f(''), NOW)).toBeNull()
        expect(buildReportLink('events.counts', undefined, f(''), NOW)).toBeNull()
    })
})

describe('reading a report link on the Reports page', () => {
    const read = (qs: string) => settingsFromSearch(new URLSearchParams(qs))

    it('reads the period, dates and vehicles', () => {
        expect(read('report=x&filter=7d&vehicle_ids=3,4')).toEqual({ filter: '7d', vehicle_ids: [3, 4] })
        expect(read('start_date=2026-10-01&end_date=2026-10-09')).toEqual({ start_date: '2026-10-01', end_date: '2026-10-09' })
    })

    it('drops anything malformed, so a hand-edited URL injects nothing', () => {
        expect(read('filter=<script>&vehicle_ids=a,-1,0')).toBeUndefined()
        expect(read('start_date=2026-10-09&end_date=2026-10-01')).toBeUndefined()
        expect(read('')).toBeUndefined()
    })
})
