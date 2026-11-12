'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReportFilters, ReportPeriod } from '@/lib/api/telemetryReports'

const PERIODS: ReportPeriod[] = ['1d', '7d', '30d', '60d']

/**
 * The report filters, kept in the URL so a report can be shared and survives
 * a reload: period (1d/7d/30d/60d) or start/end dates, vehicle, page, and any
 * report-specific keys (category, severity, group_by…).
 */
export function useReportFilters(defaultPeriod: ReportPeriod = '7d') {
    const router = useRouter()
    const pathname = usePathname()
    const search = useSearchParams()

    const filters = useMemo<ReportFilters>(() => {
        const start = search.get('start_date') ?? undefined
        const end = search.get('end_date') ?? undefined
        const period = search.get('filter') as ReportPeriod | null
        const vehicle = Number(search.get('vehicle_id') ?? 0)
        const list = (key: string) => (search.get(key) ? search.get(key)!.split(',').filter(Boolean) : undefined)

        return {
            ...(start ? { start_date: start, end_date: end ?? start } : { filter: period && PERIODS.includes(period) ? period : defaultPeriod }),
            vehicle_ids: vehicle > 0 ? [vehicle] : undefined,
            categories: list('categories'),
            severities: list('severities'),
            page: Math.max(1, Number(search.get('page') ?? 1)),
            per_page: 50,
        }
    }, [search, defaultPeriod])

    /** Sets keys (null removes one); any change but the page returns to page 1. */
    const set = useCallback((changes: Record<string, string | number | null>) => {
        const next = new URLSearchParams(search.toString())
        for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key)
            else next.set(key, String(value))
        }
        if (!('page' in changes)) next.delete('page')
        router.push(`${pathname}?${next.toString()}`, { scroll: false })
    }, [router, pathname, search])

    const value = (key: string) => search.get(key)

    return { filters, set, value }
}
