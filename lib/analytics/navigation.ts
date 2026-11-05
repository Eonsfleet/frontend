import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, ShieldAlert, Siren, Truck, Users, Wrench } from 'lucide-react'
import { parseFilters } from './filters'

/**
 * The six Analytics tabs (GPS & Routes was merged into Fleet). The URLs are the existing ones, so bookmarks and
 * links keep working; the working-hours page stays at its own URL and is
 * reached through the Fleet tab.
 *
 * What a tab can take from the current filters depends on the page behind it:
 *   v2         understands every filter
 *   telemetry  reads filter (1d/7d/30d/60d), start_date, end_date and one vehicle_id
 *   legacy     reads filter (7d/30d/90d/1y) only
 */
export type TabKind = 'v2' | 'telemetry' | 'legacy'

export interface AnalyticsTab {
    id: string
    label: string
    href: string
    icon: LucideIcon
    kind: TabKind
    /** Paths under this prefix keep the tab active. */
    prefix?: string
    /** Other path prefixes that belong to this tab (pages merged into it). */
    alsoActiveOn?: string[]
}

export const ANALYTICS_TABS: AnalyticsTab[] = [
    { id: 'overview', label: 'Overview', href: '/analytics', icon: LayoutDashboard, kind: 'v2' },
    { id: 'fleet', label: 'Fleet', href: '/analytics/fleet', icon: Truck, kind: 'v2', prefix: '/analytics/fleet', alsoActiveOn: ['/analytics/gps'] },
    { id: 'drivers', label: 'Drivers', href: '/analytics/drivers', icon: Users, kind: 'v2', prefix: '/analytics/drivers' },
    { id: 'maintenance', label: 'Maintenance', href: '/analytics/maintenance', icon: Wrench, kind: 'legacy', prefix: '/analytics/maintenance' },
    { id: 'incidents', label: 'Incidents', href: '/analytics/incidents', icon: ShieldAlert, kind: 'legacy', prefix: '/analytics/incidents' },
    { id: 'alarms', label: 'Alarms & Events', href: '/analytics/alarms', icon: Siren, kind: 'telemetry', prefix: '/analytics/alarms' },
]

export const isTabActive = (tab: AnalyticsTab, pathname: string): boolean => {
    const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    if (tab.alsoActiveOn?.some(under)) return true
    return tab.prefix ? under(tab.prefix) || pathname === tab.href : pathname === tab.href
}

const LEGACY_PERIODS = ['7d', '30d', '90d', '1y']
const TELEMETRY_PERIODS = ['1d', '7d', '30d', '60d']

/**
 * The tab's link, carrying only what the destination can honor. A filter the
 * page cannot read is dropped here, so it never silently becomes that page's
 * default; the page then shows its own period in its own controls.
 */
export function tabHref(tab: AnalyticsTab, search: { toString(): string }): string {
    const from = new URLSearchParams(search.toString())
    const out = new URLSearchParams()

    if (tab.kind === 'v2') {
        for (const key of ['filter', 'start_date', 'end_date', 'compare', 'vehicle_ids', 'cluster_ids', 'driver_ids']) {
            const value = from.get(key)
            if (value) out.set(key, value)
        }
    } else {
        const filters = parseFilters(from)
        const allowed = tab.kind === 'telemetry' ? TELEMETRY_PERIODS : LEGACY_PERIODS
        // Only a period the URL really carries is passed on: an unset one must stay unset,
        // or this page's default would be overridden by the Overview's.
        const explicit = from.has('filter') || from.has('start_date')
        if (!explicit) {
            // nothing to carry
        } else if (filters.range.kind === 'preset' && allowed.includes(filters.range.preset)) {
            out.set('filter', filters.range.preset)
        } else if (filters.range.kind === 'custom' && tab.kind === 'telemetry') {
            out.set('start_date', filters.range.start)
            out.set('end_date', filters.range.end)
        }
        if (tab.kind === 'telemetry' && filters.vehicleIds.length === 1) out.set('vehicle_id', String(filters.vehicleIds[0]))
    }

    const qs = out.toString()
    return qs ? `${tab.href}?${qs}` : tab.href
}

