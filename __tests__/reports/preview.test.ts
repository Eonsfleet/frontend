import { describe, expect, it, vi } from 'vitest'
import { deriveColumns, formatCell, pickChart, pickKpis } from '@/lib/reports/preview'
import { ALL_REPORTS, periodsFor, getReportLabel } from '@/lib/reports/registry'

describe('report preview', () => {
    it('formats a value by what its key says and shows a dash for a missing one', () => {
        expect(formatCell('distance_km', 12.34)).toBe('12.3 km')
        expect(formatCell('driving_s', 5400)).toBe('1 h 30 min')
        expect(formatCell('utilization_pct', null)).toBe('—')
        expect(formatCell('online', true)).toBe('Yes')
        expect(formatCell('place', { lat: 6.5, lon: 3.3 })).toBe('6.5000, 3.3000')
        expect(formatCell('geofence', { name: 'Depot' })).toBe('Depot')
    })

    it('leads with names and dates and leaves ids out', () => {
        const columns = deriveColumns([{ id: 'trp_1', vehicle_id: 4, distance_km: 3, vehicle: 'ABC123', date: '2026-10-01' }])
        expect(columns.map(c => c.key)).toEqual(['vehicle', 'date', 'distance_km'])
    })

    it('charts a trend over time as a line and a ranking as bars', () => {
        const daily = [
            { date: '2026-10-02', distance_km: 20, vehicle: 'A' },
            { date: '2026-10-01', distance_km: 10, vehicle: 'A' },
        ]
        const line = pickChart(daily)
        expect(line?.kind).toBe('line')
        expect(line?.points.map(p => p.label)).toEqual(['2026-10-01', '2026-10-02'])

        const bars = pickChart([{ vehicle: 'A', total: 2 }, { vehicle: 'B', total: 9 }])
        expect(bars?.kind).toBe('bar')
        expect(bars?.points[0]).toEqual({ label: 'B', value: 9 })
    })

    it('draws no chart where there is nothing to chart', () => {
        expect(pickChart([{ vehicle: 'A', total: 2 }])).toBeNull()
        expect(pickChart([{ note: 'x' }, { note: 'y' }])).toBeNull()
    })

    it('turns the report totals into headline figures', () => {
        expect(pickKpis({ totals: { trips: 4, distance_km: 10, note: 'x' } }).map(k => k.value)).toEqual(['4', '10 km'])
        expect(pickKpis(undefined)).toEqual([])
    })
})

describe('report registry', () => {
    it('lists each report once and offers only the periods a report can answer', () => {
        const types = ALL_REPORTS.map(r => r.type)
        expect(new Set(types).size).toBe(types.length)
        expect(getReportLabel('gps.trips')).toMatch(/Trip/)
        expect(periodsFor('gps.trips').map(p => p.value)).toEqual(['1d', '7d', '30d', '60d'])
        expect(periodsFor('fleet.vehicle-list').map(p => p.value)).toEqual(['7d', '30d', '90d', '1y'])
    })
})

describe('legacy reports', () => {
    it('are hidden from the pickers by default but still resolve titles', async () => {
        vi.resetModules()
        vi.stubEnv('NEXT_PUBLIC_SHOW_LEGACY_REPORTS', '')
        const r = await import('@/lib/reports/registry')
        expect(r.VISIBLE_REPORTS).toHaveLength(9)
        expect(r.VISIBLE_REPORTS.every(x => !x.legacy)).toBe(true)
        expect(r.CATEGORIES).toEqual(['Telemetry'])
        expect(r.VISIBLE_REPORT_GROUPS.map(g => g.group)).toHaveLength(1)
        expect(r.getReportLabel('fleet.utilization-summary')).toMatch(/Utilization Rate/)
        expect(r.getReport('fuel.cost-report')?.legacy).toBe(true)
    })

    it('come back with the flag on', async () => {
        vi.resetModules()
        vi.stubEnv('NEXT_PUBLIC_SHOW_LEGACY_REPORTS', 'true')
        const r = await import('@/lib/reports/registry')
        expect(r.VISIBLE_REPORTS).toHaveLength(r.ALL_REPORTS.length)
        expect(r.CATEGORIES).toContain('Fuel')
        vi.unstubAllEnvs()
    })
})
