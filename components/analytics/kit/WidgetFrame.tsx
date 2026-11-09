'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowUpRight, EyeOff, Info, Lock, MoreHorizontal, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ignoredNote, type Evaluation } from '@/lib/analytics/applicability'
import { classifyAnalyticsError } from '@/lib/api/analyticsOverview'
import type { ReportLink } from '@/lib/analytics/reportLinks'
import type { AnalyticsErrorKind } from '@/types/analytics'

export interface WidgetQuery {
    isPending: boolean
    isError: boolean
    error: unknown
    refetch: () => unknown
}

const ERROR_COPY: Record<Exclude<AnalyticsErrorKind, 'unavailable'>, { icon: typeof Lock; text: string }> = {
    forbidden: { icon: Lock, text: 'Your role does not have access to this analytics category. Ask an administrator if you need it.' },
    not_in_plan: { icon: Lock, text: 'This module is not included in your current plan.' },
    payment_required: { icon: Lock, text: 'Analytics is paused until the outstanding payment is settled.' },
}

/**
 * The frame every Overview widget sits in. It owns the states, so each widget
 * only draws its data: a range the widget cannot serve is "unavailable" (never
 * a different range), an error is never drawn as zero, "no data" is its own
 * state, and a filter the backend did not apply is named on the card.
 */
export function WidgetFrame({
    title,
    evaluation,
    query,
    isEmpty,
    emptyText = 'Nothing recorded for this view.',
    actions,
    link,
    badge,
    children,
    className,
}: {
    title: string
    evaluation: Evaluation
    query?: WidgetQuery
    isEmpty?: boolean
    emptyText?: string
    /** Secondary actions go in the overflow menu, not on the card face. */
    actions?: ReactNode
    link?: ReportLink | null
    badge?: ReactNode
    children: ReactNode
    className?: string
}) {
    const unsupported = evaluation.range === 'unsupported'
    const ignored = ignoredNote(evaluation.ignored)

    let body: ReactNode
    if (unsupported) {
        body = <Message icon={EyeOff} tone="muted" text={evaluation.rangeNote ?? 'Not available for this range.'} />
    } else if (query?.isPending) {
        body = (
            <div className="space-y-3" role="status" aria-label={`Loading ${title}`}>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    } else if (query?.isError) {
        const kind = classifyAnalyticsError(query.error)
        if (kind === 'unavailable') {
            body = (
                <div role="alert" className="flex items-center gap-3 rounded-lg bg-an-bad-soft px-3 py-2.5 text-sm text-an-bad">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1">Could not load this. Nothing is shown rather than a wrong number.</span>
                    <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-an-bad" onClick={() => query.refetch()}>
                        <RefreshCw className="h-3 w-3" aria-hidden /> Retry
                    </Button>
                </div>
            )
        } else {
            body = <Message icon={ERROR_COPY[kind].icon} tone="muted" text={ERROR_COPY[kind].text} />
        }
    } else if (isEmpty) {
        body = <Message icon={Info} tone="muted" text={emptyText} />
    } else {
        body = children
    }

    return (
        <section
            aria-label={title}
            className={cn('flex flex-col gap-3 rounded-2xl border border-an-border bg-an-surface p-4 sm:p-5', className)}
        >
            <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-an-text">{title}</h2>
                    {evaluation.range === 'fixed' && evaluation.rangeNote && <p className="mt-0.5 text-xs text-an-muted">{evaluation.rangeNote}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {badge}
                    {actions && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-an-muted" aria-label={`${title}: more actions`}>
                                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">{actions}</DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>

            {ignored && !unsupported && (
                <p className="rounded-md bg-an-warn-soft px-2.5 py-1.5 text-xs text-an-warn">{ignored}</p>
            )}

            <div className="min-h-[3rem]">{body}</div>

            {link && !unsupported && (
                <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-an-border pt-3 text-xs">
                    <Link href={link.href} className="inline-flex items-center gap-1 font-medium text-an-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent">
                        View full report <ArrowUpRight className="h-3 w-3" aria-hidden />
                    </Link>
                    {link.held.length > 0 && (
                        <span className="text-an-muted" title={link.held.map((h) => `${h.filter}: ${h.reason}`).join('\n')}>
                            Not carried over: {link.held.map((h) => h.filter).join(', ')}
                        </span>
                    )}
                </footer>
            )}
        </section>
    )
}

function Message({ icon: Icon, text, tone }: { icon: typeof Lock; text: string; tone: 'muted' }) {
    return (
        <div className={cn('flex items-start gap-2 text-sm', tone === 'muted' && 'text-an-muted')}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{text}</p>
        </div>
    )
}
