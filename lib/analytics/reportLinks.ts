import type { CatalogReport } from '@/lib/api/reports'
import { rangeDays, resolveDates, type AnalyticsFilters } from './filters'
import { TELEMETRY_RETENTION_DAYS } from './applicability'

/**
 * "View full report" links from Analytics to Reports. The report catalog is the
 * authority on which filters a report supports: a filter is passed on only if
 * the report's catalog entry lists it, and everything held back is reported so
 * the UI can say so instead of implying it was applied.
 *
 * A filter must be supported twice over: by the report (its catalog entry) and
 * by the Reports page itself. The page's export dialog today takes a period or
 * dates and a vehicle list only, so driver and cluster filters are held back
 * even for reports that could filter by them.
 *
 * The Reports hub reads these params on arrival: report, filter, start_date,
 * end_date, vehicle_ids.
 */

export interface ReportLink {
    href: string
    /** What the report will open with. */
    applied: string[]
    /** What Analytics has set that the report cannot take, with the reason. */
    held: { filter: string; reason: string }[]
}

/** The params the Reports hub reads on arrival, besides `report`. */
export const HUB_FILTER_PARAMS = ['filter', 'start_date', 'end_date', 'vehicle_ids'] as const

/** What the Reports page can apply when it opens a report. */
const HUB_SUPPORTS = new Set<string>(HUB_FILTER_PARAMS)

export function buildReportLink(
    reportType: string,
    catalog: CatalogReport[] | undefined,
    filters: AnalyticsFilters,
    now: Date = new Date(),
): ReportLink | null {
    const report = catalog?.find((r) => r.type === reportType)
    if (!report || !report.allowed) return null

    const params = new URLSearchParams({ report: report.type })
    const applied: string[] = []
    const held: ReportLink['held'] = []
    const supports = (key: string) => report.filters.includes(key) && HUB_SUPPORTS.has(key)

    // Range. Reports keep 60 days of telemetry, so a longer range is not carried over.
    const days = rangeDays(filters.range)
    if (days > TELEMETRY_RETENTION_DAYS) {
        held.push({ filter: 'Period', reason: `The report keeps ${TELEMETRY_RETENTION_DAYS} days, so it opens on its own default period.` })
    } else if (filters.range.kind === 'preset' && supports('filter')) {
        params.set('filter', filters.range.preset)
        applied.push('Period')
    } else if (supports('start_date') && supports('end_date')) {
        const { start, end } = resolveDates(filters.range, now)
        params.set('start_date', start)
        params.set('end_date', end)
        applied.push('Period')
    }

    const entity = (key: 'vehicle_ids' | 'driver_ids' | 'cluster_ids', ids: number[], label: string) => {
        if (ids.length === 0) return
        if (supports(key)) {
            params.set(key, ids.join(','))
            applied.push(label)
        } else if (!report.filters.includes(key)) {
            held.push({ filter: label, reason: `This report does not filter by ${label.toLowerCase()}.` })
        } else {
            held.push({ filter: label, reason: `The Reports page cannot scope a report by ${label.toLowerCase()} yet.` })
        }
    }
    entity('vehicle_ids', filters.vehicleIds, 'Vehicles')
    entity('driver_ids', filters.driverIds, 'Drivers')
    entity('cluster_ids', filters.clusterIds, 'Clusters')

    return { href: `/reports?${params.toString()}`, applied, held }
}

/**
 * The settings a report opens with, read from the URL the link above built.
 * Anything malformed is dropped, so a hand-edited URL cannot inject values.
 */
export function settingsFromSearch(search: { get(key: string): string | null }): {
    filter?: string
    start_date?: string
    end_date?: string
    vehicle_ids?: number[]
} | undefined {
    const date = /^\d{4}-\d{2}-\d{2}$/
    const start = search.get('start_date')
    const end = search.get('end_date')
    const filter = search.get('filter')
    const vehicles = (search.get('vehicle_ids') ?? '')
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)

    const out: NonNullable<ReturnType<typeof settingsFromSearch>> = {}
    if (start && end && date.test(start) && date.test(end) && start <= end) {
        out.start_date = start
        out.end_date = end
    } else if (filter && /^(1d|7d|30d|60d|90d|1y)$/.test(filter)) {
        out.filter = filter
    }
    if (vehicles.length) out.vehicle_ids = [...new Set(vehicles)]

    return Object.keys(out).length ? out : undefined
}
