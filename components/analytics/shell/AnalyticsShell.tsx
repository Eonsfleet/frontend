'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ANALYTICS_TABS, isTabActive, tabHref } from '@/lib/analytics/navigation'

/**
 * The rebuilt Analytics frame: a header and seven tabs in one scrollable row,
 * so every tab stays reachable on a phone (the old sidebar was hidden below
 * the md breakpoint). The page scrolls as one document; no nested scroll area.
 */
export function AnalyticsShell({ children, switcher }: { children: ReactNode; switcher?: ReactNode }) {
    const pathname = usePathname()
    const search = useSearchParams()
    const activeRef = useRef<HTMLAnchorElement | null>(null)

    // Keep the active tab in view when the row is scrolled (small screens).
    useEffect(() => {
        activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
    }, [pathname])

    return (
        <div className="analytics-v2 min-h-full bg-an-canvas text-an-text">
            <div className="border-b border-an-border bg-an-surface">
                <div className="mx-auto max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Analytics</h1>
                            <p className="mt-0.5 text-sm text-an-muted">How your fleet is doing, what needs attention, and where to look next.</p>
                        </div>
                        {switcher}
                    </div>

                    <nav aria-label="Analytics sections" className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                        <ul className="flex min-w-max gap-1">
                            {ANALYTICS_TABS.map((tab) => {
                                const active = isTabActive(tab, pathname)
                                const Icon = tab.icon
                                return (
                                    <li key={tab.id}>
                                        <Link
                                            href={tabHref(tab, search)}
                                            ref={active ? activeRef : undefined}
                                            aria-current={active ? 'page' : undefined}
                                            className={cn(
                                                'inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors',
                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent focus-visible:ring-offset-1',
                                                active
                                                    ? 'border-an-accent text-an-accent'
                                                    : 'border-transparent text-an-muted hover:border-an-border hover:text-an-text',
                                            )}
                                        >
                                            <Icon className="h-4 w-4" aria-hidden />
                                            {tab.label}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </nav>
                </div>
            </div>

            <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">{children}</div>
        </div>
    )
}
