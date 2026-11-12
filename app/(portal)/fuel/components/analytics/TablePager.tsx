'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export const PAGE_SIZE = 10
/** The analytics endpoint returns at most this many rows per table. */
export const SERVER_ROW_CAP = 200

/**
 * Client-side paging over an array. The page is stored together with the array it
 * belongs to, so a different array (new filters, period, refetch) falls back to page 1
 * without an effect, and the effective page is always clamped to the last page.
 */
export function usePaged<T>(rows: T[]) {
    const [state, setState] = useState<{ rows: T[]; page: number }>({ rows, page: 1 })
    const total = rows.length
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const requested = state.rows === rows ? state.page : 1
    const page = Math.min(Math.max(1, requested), lastPage)
    const start = (page - 1) * PAGE_SIZE
    return {
        page,
        lastPage,
        total,
        from: total === 0 ? 0 : start + 1,
        to: Math.min(start + PAGE_SIZE, total),
        pageRows: rows.slice(start, start + PAGE_SIZE),
        goTo: (next: number) => setState({ rows, page: Math.min(Math.max(1, next), lastPage) }),
    }
}

type Paged = ReturnType<typeof usePaged>

export function TablePager({ label, paged }: { label: string; paged: Pick<Paged, 'page' | 'lastPage' | 'total' | 'from' | 'to' | 'goTo'> }) {
    const { page, lastPage, total, from, to, goTo } = paged
    const capped = total >= SERVER_ROW_CAP
    if (total <= PAGE_SIZE) return null
    return (
        <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between gap-2 px-2">
                <p className="text-sm text-slate-500" aria-live="polite">Showing {from}-{to} of {total}</p>
                <nav aria-label={`${label} pages`} className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => goTo(page - 1)} aria-label={`Previous ${label.toLowerCase()} page`}>Previous</Button>
                    <span className="text-xs text-slate-500">Page {page} of {lastPage}</span>
                    <Button type="button" size="sm" variant="outline" disabled={page >= lastPage} onClick={() => goTo(page + 1)} aria-label={`Next ${label.toLowerCase()} page`}>Next</Button>
                </nav>
            </div>
            {capped && <p className="px-2 text-xs text-slate-400">Showing the latest {SERVER_ROW_CAP}. Narrow the period or choose a vehicle to see the rest.</p>}
        </div>
    )
}
