'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
    { href: '/analytics/gps', label: 'Overview' },
    { href: '/analytics/gps/trips', label: 'Trips' },
    { href: '/analytics/gps/daily', label: 'Daily driving' },
    { href: '/analytics/gps/stops', label: 'Stops' },
    { href: '/analytics/gps/trackers', label: 'Trackers' },
    { href: '/analytics/gps/route-history', label: 'Route history' },
    { href: '/analytics/gps/scheduled-trips', label: 'Scheduled vs actual' },
]

/** The GPS & Routes reports; the period carries over between them. */
export function GpsReportTabs() {
    const pathname = usePathname()
    const search = useSearchParams()
    const keep = new URLSearchParams()
    for (const key of ['filter', 'start_date', 'end_date', 'vehicle_id']) {
        const v = search.get(key)
        if (v) keep.set(key, v)
    }
    const query = keep.toString() ? `?${keep.toString()}` : ''

    return (
        <nav className="flex flex-wrap gap-1 border-b border-slate-200">
            {TABS.map(t => (
                <Link
                    key={t.href}
                    href={`${t.href}${query}`}
                    className={cn(
                        'px-3 py-2 text-xs font-bold border-b-2 -mb-px transition-colors',
                        pathname === t.href ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800',
                    )}
                >
                    {t.label}
                </Link>
            ))}
        </nav>
    )
}
