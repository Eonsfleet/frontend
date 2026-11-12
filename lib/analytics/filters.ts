import { localDate } from '@/components/analytics/telemetry/format'

/**
 * The Analytics global filters. They live in the URL (so a link reproduces the
 * view), and they reuse the keys the existing pages already read, so current
 * bookmarks keep working: `filter` (period), `start_date` / `end_date`, plus
 * `vehicle_ids`, `cluster_ids`, `driver_ids` and `compare`.
 *
 * Whether a widget honors a filter is declared in applicability.ts, not here.
 */

export const RANGE_PRESETS = ['7d', '30d', '60d', '90d', '1y'] as const
export type RangePreset = (typeof RANGE_PRESETS)[number]

export const DEFAULT_PRESET: RangePreset = '30d'

export type DateRange =
    | { kind: 'preset'; preset: RangePreset }
    | { kind: 'custom'; start: string; end: string }

export interface AnalyticsFilters {
    range: DateRange
    /** Compare with the previous period of the same length. */
    compare: boolean
    vehicleIds: number[]
    clusterIds: number[]
    driverIds: number[]
}

export const PRESET_DAYS: Record<RangePreset, number> = { '7d': 7, '30d': 30, '60d': 60, '90d': 90, '1y': 365 }

export const PRESET_LABELS: Record<RangePreset, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '60d': 'Last 60 days',
    '90d': 'Last 90 days',
    '1y': 'Last 12 months',
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

const isRealDate = (value: string): boolean => {
    if (!DATE.test(value)) return false
    const d = new Date(`${value}T12:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value)
}

const ids = (raw: string | null | undefined): number[] => {
    if (!raw) return []
    const seen = new Set<number>()
    for (const part of raw.split(',')) {
        const n = Number(part.trim())
        if (Number.isInteger(n) && n > 0) seen.add(n)
    }
    return [...seen].sort((a, b) => a - b)
}

/** Reads the filters from URL params. Invalid values fall back to the defaults. */
export function parseFilters(search: URLSearchParams | { get(key: string): string | null }): AnalyticsFilters {
    const start = search.get('start_date')
    const end = search.get('end_date') ?? start
    const period = search.get('filter')

    let range: DateRange = { kind: 'preset', preset: DEFAULT_PRESET }
    if (start && end && isRealDate(start) && isRealDate(end) && start <= end) {
        range = { kind: 'custom', start, end }
    } else if (period && (RANGE_PRESETS as readonly string[]).includes(period)) {
        range = { kind: 'preset', preset: period as RangePreset }
    }

    // `vehicle_id` is what the GPS report pages write; accept it as a single vehicle.
    const vehicleIds = ids(search.get('vehicle_ids') ?? search.get('vehicle_id'))

    return {
        range,
        compare: search.get('compare') === 'prev',
        vehicleIds,
        clusterIds: ids(search.get('cluster_ids')),
        driverIds: ids(search.get('driver_ids')),
    }
}

/** The URL params for these filters. Defaults are omitted so URLs stay short and stable. */
export function serializeFilters(filters: AnalyticsFilters): URLSearchParams {
    const out = new URLSearchParams()
    if (filters.range.kind === 'custom') {
        out.set('start_date', filters.range.start)
        out.set('end_date', filters.range.end)
    } else if (filters.range.preset !== DEFAULT_PRESET) {
        out.set('filter', filters.range.preset)
    }
    if (filters.compare) out.set('compare', 'prev')
    if (filters.vehicleIds.length) out.set('vehicle_ids', [...filters.vehicleIds].sort((a, b) => a - b).join(','))
    if (filters.clusterIds.length) out.set('cluster_ids', [...filters.clusterIds].sort((a, b) => a - b).join(','))
    if (filters.driverIds.length) out.set('driver_ids', [...filters.driverIds].sort((a, b) => a - b).join(','))
    return out
}

/**
 * Keeps the filter keys from the current URL and drops the rest, for links to
 * another Analytics tab. (Report-specific keys such as `page` do not carry over.)
 */
export const FILTER_KEYS = ['filter', 'start_date', 'end_date', 'compare', 'vehicle_ids', 'cluster_ids', 'driver_ids'] as const

export function carryFilters(search: { toString(): string }): string {
    const from = new URLSearchParams(search.toString())
    const out = new URLSearchParams()
    for (const key of FILTER_KEYS) {
        const value = from.get(key)
        if (value) out.set(key, value)
    }
    return out.toString()
}

export const hasEntityFilters = (f: AnalyticsFilters): boolean =>
    f.vehicleIds.length + f.clusterIds.length + f.driverIds.length > 0

/** Whole days in the range, inclusive. For a preset it is the preset's length. */
export function rangeDays(range: DateRange): number {
    if (range.kind === 'preset') return PRESET_DAYS[range.preset]
    const ms = new Date(`${range.end}T12:00:00Z`).getTime() - new Date(`${range.start}T12:00:00Z`).getTime()
    return Math.round(ms / 86_400_000) + 1
}

/** The concrete start and end dates (Lagos calendar days) of a range. */
export function resolveDates(range: DateRange, now: Date = new Date()): { start: string; end: string } {
    if (range.kind === 'custom') return { start: range.start, end: range.end }
    const end = localDate(now)
    const startMs = new Date(`${end}T12:00:00Z`).getTime() - (PRESET_DAYS[range.preset] - 1) * 86_400_000
    return { start: new Date(startMs).toISOString().slice(0, 10), end }
}

/** The period of the same length that ends the day before this one starts. */
export function previousDates(range: DateRange, now: Date = new Date()): { start: string; end: string } {
    const { start } = resolveDates(range, now)
    const days = rangeDays(range)
    const endMs = new Date(`${start}T12:00:00Z`).getTime() - 86_400_000
    const startMs = endMs - (days - 1) * 86_400_000
    return { start: new Date(startMs).toISOString().slice(0, 10), end: new Date(endMs).toISOString().slice(0, 10) }
}

export function describeRange(range: DateRange): string {
    return range.kind === 'preset' ? PRESET_LABELS[range.preset] : `${range.start} to ${range.end}`
}
