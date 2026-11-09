import { describe, expect, it } from 'vitest'
import { ANALYTICS_TABS, isTabActive, tabHref } from '@/lib/analytics/navigation'

const tab = (id: string) => ANALYTICS_TABS.find((t) => t.id === id)!

describe('analytics tabs', () => {
    it('has the six tabs, on the routes that already exist, with no Fuel tab and GPS merged into Fleet', () => {
        expect(ANALYTICS_TABS.map((t) => t.href)).toEqual([
            '/analytics', '/analytics/fleet', '/analytics/drivers',
            '/analytics/maintenance', '/analytics/incidents', '/analytics/alarms',
        ])
    })

    it('keeps a tab active on its sub-pages, including working hours under Fleet', () => {
        expect(isTabActive(tab('fleet'), '/analytics/fleet/working-hours')).toBe(true)
        // The GPS pages belong to Fleet now.
        expect(isTabActive(tab('fleet'), '/analytics/gps')).toBe(true)
        expect(isTabActive(tab('fleet'), '/analytics/gps/trips')).toBe(true)
        expect(isTabActive(tab('overview'), '/analytics/fleet')).toBe(false)
        expect(isTabActive(tab('overview'), '/analytics')).toBe(true)
        expect(isTabActive(tab('drivers'), '/analytics/driversX')).toBe(false)
    })

    it('carries every filter to every rebuilt tab, because each understands them', () => {
        const query = 'filter=90d&compare=prev&vehicle_ids=1,2&driver_ids=5&page=4'
        expect(tabHref(tab('overview'), query)).toBe('/analytics?filter=90d&compare=prev&vehicle_ids=1%2C2&driver_ids=5')
        for (const id of ['fleet', 'drivers', 'maintenance', 'incidents']) {
            expect(tabHref(tab(id), 'filter=30d&driver_ids=5&cluster_ids=2')).toBe(`${tab(id).href}?filter=30d&cluster_ids=2&driver_ids=5`)
        }
    })

    it('carries only a period the Alarms page can read, so it never silently becomes its default', () => {
        expect(tabHref(tab('alarms'), 'filter=60d')).toBe('/analytics/alarms?filter=60d')
        expect(tabHref(tab('alarms'), 'filter=1y')).toBe('/analytics/alarms')
    })

    it('carries custom dates and a single vehicle to Alarms only', () => {
        expect(tabHref(tab('alarms'), 'start_date=2026-10-01&end_date=2026-10-05&vehicle_ids=7')).toBe('/analytics/alarms?start_date=2026-10-01&end_date=2026-10-05&vehicle_id=7')
        expect(tabHref(tab('alarms'), 'vehicle_ids=7,8')).toBe('/analytics/alarms')
    })

    it('leaves Alarms on its own default period when the URL has none', () => {
        expect(tabHref(tab('alarms'), '')).toBe('/analytics/alarms')
        expect(tabHref(tab('alarms'), 'driver_ids=3')).toBe('/analytics/alarms')
    })
})
