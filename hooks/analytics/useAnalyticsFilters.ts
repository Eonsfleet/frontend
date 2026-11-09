'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FILTER_KEYS, parseFilters, serializeFilters, type AnalyticsFilters } from '@/lib/analytics/filters'

/**
 * The Analytics global filters, read from and written to the URL. Writes use
 * `replace`, so changing a filter does not fill the back button, and any other
 * params on the page (such as `ui`) are left alone.
 */
export function useAnalyticsFilters() {
    const router = useRouter()
    const pathname = usePathname()
    const search = useSearchParams()
    const query = search.toString()

    const filters = useMemo(() => parseFilters(new URLSearchParams(query)), [query])

    const update = useCallback(
        (patch: Partial<AnalyticsFilters>) => {
            const next = serializeFilters({ ...filters, ...patch })
            const keep = new URLSearchParams(query)
            for (const key of [...FILTER_KEYS, 'vehicle_id']) keep.delete(key)
            next.forEach((value, key) => keep.set(key, value))
            const qs = keep.toString()
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        },
        [filters, query, pathname, router],
    )

    return { filters, update }
}
