import { hasEntityFilters, previousDates, rangeDays, resolveDates, type AnalyticsFilters, type RangePreset } from './filters'

/**
 * What each Overview widget actually honors. This is the single place that
 * says so, written from the backend code (see the Phase 0 audit): a global
 * filter must never imply that a metric was filtered when the backend answered
 * for the whole organization, and a range a widget cannot serve is reported as
 * unavailable, never silently replaced by another range.
 */

export type WidgetId =
    | 'fleet-status'
    | 'device-status'
    | 'active-alerts'
    | 'anomalies'
    | 'alarms'
    | 'incidents-trend'
    | 'incident-summary'
    | 'health'
    | 'trips'
    | 'fleet-summary'
    | 'fleet-availability'
    | 'fleet-trend'
    | 'fleet-vehicles'
    | 'fleet-trips'
    | 'fleet-trackers'
    | 'fleet-alarms'
    | 'drivers-trips'
    | 'drivers-incidents'
    | 'drivers-telemetry'
    | 'drivers-vehicle-usage'
    | 'drivers-inspections'
    | 'drivers-expiry'
    | 'driver-events-trend'
    | 'driver-timeline'
    | 'drivers-events'

export type EntityFilter = 'vehicles' | 'clusters' | 'drivers'

type Scope =
    /** Current state: no period applies. */
    | { kind: 'snapshot'; note: string }
    /** A window the backend fixes itself, whatever the period says. */
    | { kind: 'fixed'; note: string }
    /** Rolling `filter` of 7d / 30d / 90d / 1y; start_date / end_date are ignored. */
    | { kind: 'legacy' }
    /** The telemetry reporting store: Lagos calendar days, 60 days kept. */
    | { kind: 'telemetry' }

interface Support {
    scope: Scope
    entities: readonly EntityFilter[]
    compare: boolean
}

export const TELEMETRY_RETENTION_DAYS = 60

const WIDGETS: Record<WidgetId, Support> = {
    'fleet-status': { scope: { kind: 'snapshot', note: 'Current status' }, entities: [], compare: false },
    'device-status': { scope: { kind: 'snapshot', note: 'Current status' }, entities: [], compare: false },
    'active-alerts': { scope: { kind: 'snapshot', note: 'Currently active' }, entities: [], compare: false },
    // days is sent as 30; the rules look back that far regardless of the page range.
    anomalies: { scope: { kind: 'fixed', note: 'Last 30 days' }, entities: [], compare: false },
    alarms: { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: true },
    'incidents-trend': { scope: { kind: 'legacy' }, entities: [], compare: false },
    'incident-summary': { scope: { kind: 'fixed', note: 'All time' }, entities: [], compare: false },
    health: { scope: { kind: 'fixed', note: 'Current fleet; incidents and fuel use the last 30 days' }, entities: [], compare: false },
    trips: { scope: { kind: 'legacy' }, entities: [], compare: false },
    'fleet-summary': { scope: { kind: 'legacy' }, entities: [], compare: false },
    'fleet-availability': { scope: { kind: 'snapshot', note: 'Current status' }, entities: [], compare: false },
    'fleet-trend': { scope: { kind: 'legacy' }, entities: [], compare: false },
    'fleet-vehicles': { scope: { kind: 'legacy' }, entities: [], compare: false },
    // Tracker-store figures: trips and alarms filter by vehicle, driver and cluster; the
    // tracker list has no driver, so a driver filter is not applied to it.
    'fleet-trips': { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: false },
    'fleet-trackers': { scope: { kind: 'snapshot', note: 'Current status' }, entities: ['vehicles', 'clusters'], compare: false },
    'fleet-alarms': { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: false },
    'drivers-trips': { scope: { kind: 'legacy' }, entities: [], compare: false },
    'drivers-incidents': { scope: { kind: 'fixed', note: 'Last 90 days' }, entities: [], compare: false },
    'drivers-telemetry': { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: false },
    'drivers-vehicle-usage': { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: false },
    'drivers-inspections': { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: false },
    // Documents have no period. They follow the drivers chosen (and the vehicles those drivers use), not vehicle or cluster filters.
    'drivers-expiry': { scope: { kind: 'fixed', note: 'Expired in the last year, or expiring in the next 30 days' }, entities: ['drivers'], compare: false },
    'driver-events-trend': { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: false },
    'driver-timeline': { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: false },
    'drivers-events': { scope: { kind: 'telemetry' }, entities: ['vehicles', 'clusters', 'drivers'], compare: false },
}

const LEGACY_PRESETS: readonly RangePreset[] = ['7d', '30d', '90d', '1y']
const TELEMETRY_PRESETS: readonly RangePreset[] = ['7d', '30d', '60d']

export interface Evaluation {
    /** `applied`: the page range is used. `fixed`: the widget has its own window. `unsupported`: the page range cannot be served. */
    range: 'applied' | 'fixed' | 'unsupported'
    /** The window the widget really shows, or why it cannot show the requested one. */
    rangeNote: string | null
    /** Active entity filters this widget does NOT apply: it shows the whole fleet. */
    ignored: EntityFilter[]
    compare: 'off' | 'applied' | 'unavailable'
    compareReason: string | null
}

const ACTIVE_ENTITY = (f: AnalyticsFilters): EntityFilter[] => [
    ...(f.vehicleIds.length ? (['vehicles'] as const) : []),
    ...(f.clusterIds.length ? (['clusters'] as const) : []),
    ...(f.driverIds.length ? (['drivers'] as const) : []),
]

const ENTITY_WORD: Record<EntityFilter, string> = { vehicles: 'vehicle', clusters: 'cluster', drivers: 'driver' }

/** "Showing the whole fleet: the vehicle and driver filters are not applied", or null. */
export function ignoredNote(ignored: EntityFilter[]): string | null {
    if (ignored.length === 0) return null
    const words = ignored.map((e) => ENTITY_WORD[e])
    const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
    return `Whole fleet: the ${list} ${words.length === 1 ? 'filter is' : 'filters are'} not applied`
}

export function evaluateWidget(id: WidgetId, filters: AnalyticsFilters, now: Date = new Date()): Evaluation {
    const support = WIDGETS[id]
    const ignored = ACTIVE_ENTITY(filters).filter((e) => !support.entities.includes(e))
    const { scope } = support

    let range: Evaluation['range']
    let rangeNote: string | null = null

    if (scope.kind === 'snapshot' || scope.kind === 'fixed') {
        range = 'fixed'
        rangeNote = scope.note
    } else if (scope.kind === 'legacy') {
        const ok = filters.range.kind === 'preset' && LEGACY_PRESETS.includes(filters.range.preset)
        range = ok ? 'applied' : 'unsupported'
        if (!ok) rangeNote = 'This metric is available for 7 days, 30 days, 90 days or 12 months. Custom ranges and 60 days are not supported.'
    } else {
        const days = rangeDays(filters.range)
        const ok = filters.range.kind === 'preset' ? TELEMETRY_PRESETS.includes(filters.range.preset) : days <= TELEMETRY_RETENTION_DAYS
        range = ok ? 'applied' : 'unsupported'
        if (!ok) rangeNote = `This metric is only kept for ${TELEMETRY_RETENTION_DAYS} days, so it cannot show ${days} days.`
    }

    let compare: Evaluation['compare'] = 'off'
    let compareReason: string | null = null
    if (filters.compare) {
        if (!support.compare) {
            compare = 'unavailable'
            compareReason = 'The backend cannot return this metric for a previous period.'
        } else if (range !== 'applied') {
            compare = 'unavailable'
        } else {
            // The previous period must still be inside the reporting store.
            const floor = new Date(resolveDates({ kind: 'preset', preset: '60d' }, now).start + 'T12:00:00Z').getTime()
            const prev = previousDates(filters.range, now)
            if (new Date(prev.start + 'T12:00:00Z').getTime() < floor) {
                compare = 'unavailable'
                compareReason = `The previous period starts before the ${TELEMETRY_RETENTION_DAYS}-day window that is kept.`
            } else {
                compare = 'applied'
            }
        }
    }

    return { range, rangeNote, ignored, compare, compareReason }
}

/** True when any entity filter is active, for the filter bar's own hint. */
export const anyEntityFilter = hasEntityFilters
