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

    it('carries every filter to the Overview', () => {
        expect(tabHref(tab('overview'), 'filter=90d&compare=prev&vehicle_ids=1,2&page=4')).toBe('/analytics?filter=90d&compare=prev&vehicle_ids=1%2C2')
    })

    it('carries only a period the destination can read, so it never silently becomes its default', () => {
        expect(tabHref(tab('incidents'), 'filter=90d')).toBe('/analytics/incidents?filter=90d')
        expect(tabHref(tab('incidents'), 'filter=60d')).toBe('/analytics/incidents')
        expect(tabHref(tab('alarms'), 'filter=60d')).toBe('/analytics/alarms?filter=60d')
        expect(tabHref(tab('alarms'), 'filter=1y')).toBe('/analytics/alarms')
    })

    it('carries custom dates and a single vehicle to telemetry tabs only', () => {
        expect(tabHref(tab('alarms'), 'start_date=2026-10-01&end_date=2026-10-05&vehicle_ids=7')).toBe('/analytics/alarms?start_date=2026-10-01&end_date=2026-10-05&vehicle_id=7')
        expect(tabHref(tab('alarms'), 'vehicle_ids=7,8')).toBe('/analytics/alarms')
        expect(tabHref(tab('incidents'), 'start_date=2026-10-01&end_date=2026-10-05&vehicle_ids=7')).toBe('/analytics/incidents')
    })

    it('carries every filter to Fleet and Drivers, which understand them all', () => {
        expect(tabHref(tab('fleet'), 'filter=7d&vehicle_ids=1,2&driver_ids=5&page=3')).toBe('/analytics/fleet?filter=7d&vehicle_ids=1%2C2&driver_ids=5')
        expect(tabHref(tab('drivers'), 'filter=30d&driver_ids=5&cluster_ids=2')).toBe('/analytics/drivers?filter=30d&cluster_ids=2&driver_ids=5')
    })
})

describe('analytics tabs without a period in the URL', () => {
    it('leave the destination on its own default instead of imposing one', () => {
        expect(tabHref(ANALYTICS_TABS.find((t) => t.id === 'alarms')!, '')).toBe('/analytics/alarms')
        expect(tabHref(ANALYTICS_TABS.find((t) => t.id === 'incidents')!, 'vehicle_ids=3')).toBe('/analytics/incidents')
    })
})
