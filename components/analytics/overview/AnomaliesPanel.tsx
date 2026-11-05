'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { evaluateWidget } from '@/lib/analytics/applicability'
import type { AnalyticsFilters } from '@/lib/analytics/filters'
import { useAnomalies } from '@/hooks/analytics/useOverviewQueries'
import { useInView } from '@/hooks/analytics/useInView'
import { formatDateTime } from '@/components/analytics/telemetry/format'
import type { AnomalySeverity } from '@/types/analytics'

const ORDER: AnomalySeverity[] = ['critical', 'high', 'medium', 'low']
const TONE: Record<AnomalySeverity, string> = {
    critical: 'bg-an-bad-soft text-an-bad',
    high: 'bg-an-warn-soft text-an-warn',
    medium: 'bg-an-surface-muted text-an-muted',
    low: 'bg-an-surface-muted text-an-muted',
}

/**
 * The second source behind "Needs attention": rule-based checks over the last
 * 30 days. The rules and thresholds are fixed on the backend and the ids change
 * on every call, so each finding is a lead to look at, not a verdict, and
 * nothing here can be acknowledged or dismissed.
 */
export function AnomaliesPanel({ filters }: { filters: AnalyticsFilters }) {
    const evaluation = useMemo(() => evaluateWidget('anomalies', filters), [filters])
    const { ref, seen } = useInView<HTMLDivElement>()
    const query = useAnomalies(seen)

    const anomalies = query.data?.anomalies ?? []
    const sorted = [...anomalies].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity))
    const idle = { isPending: false, isError: false, error: null, refetch: () => undefined }

    return (
        <div ref={ref}>
            <WidgetFrame
                title="Detected anomalies"
                evaluation={evaluation}
                query={seen ? query : idle}
                isEmpty={!seen || (!!query.data && anomalies.length === 0)}
                emptyText={seen ? 'No anomalies found by the checks in the last 30 days.' : 'Loads when scrolled into view.'}
                badge={
                    query.data && anomalies.length > 0 ? (
                        <span className="rounded-full bg-an-surface-muted px-2 py-0.5 text-xs text-an-muted">
                            {query.data.critical_count} critical · {query.data.high_count} high
                        </span>
                    ) : undefined
                }
            >
                {/* Every finding is listed; the box scrolls, so a long list does not stretch the page. */}
                <div
                    role="region"
                    aria-label="Detected anomalies list"
                    tabIndex={0}
                    className="max-h-80 overflow-y-auto rounded-lg border border-an-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent"
                >
                    <ul className="divide-y divide-an-border">
                        {sorted.map((a) => (
                            <li key={a.id} className="space-y-1 py-3">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-an-text">{a.title}</p>
                                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize', TONE[a.severity])}>{a.severity}</span>
                                </div>
                                <p className="text-sm text-an-muted">{a.description}</p>
                                {a.suggested_action && <p className="text-xs text-an-muted">Suggested: {a.suggested_action}</p>}
                                {a.vehicle_id ? (
                                    <Link href={`/vehicles/${a.vehicle_id}`} className="inline-block text-xs font-medium text-an-accent hover:underline">
                                        Open {a.vehicle_registration ?? 'vehicle'}
                                    </Link>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
                {query.data && (
                    <p className="mt-3 text-xs text-an-muted">
                        Rule-based checks with fixed thresholds, run {formatDateTime(query.data.detected_at)}. Treat them as leads to look into.
                    </p>
                )}
            </WidgetFrame>
        </div>
    )
}
