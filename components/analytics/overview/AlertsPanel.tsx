'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { evaluateWidget } from '@/lib/analytics/applicability'
import type { AnalyticsFilters } from '@/lib/analytics/filters'
import { useActiveAlerts } from '@/hooks/analytics/useOverviewQueries'
import { formatDateTime } from '@/components/analytics/telemetry/format'
import type { DashboardAlert } from '@/types/analytics'

const VISIBLE = 5

/** Where an alert is handled. The id looks like "incident-12"; only an incident has a page of its own. */
export function alertHref(alert: DashboardAlert): string | null {
    const id = alert.id.split('-').slice(1).join('-')
    if (alert.type === 'incident' && /^\d+$/.test(id)) return `/incidents/${id}`
    if (alert.type === 'maintenance_alert') return '/maintenance/alerts'
    if (alert.type === 'fuel_alert') return '/fuel/alerts'
    return null
}

const SOURCE: Record<DashboardAlert['type'], string> = { fuel_alert: 'Fuel', maintenance_alert: 'Maintenance', incident: 'Incident' }

/** Currently active alerts from fuel, maintenance and incidents: one of the two sources behind "Needs attention". */
export function AlertsPanel({ filters }: { filters: AnalyticsFilters }) {
    const evaluation = useMemo(() => evaluateWidget('active-alerts', filters), [filters])
    const query = useActiveAlerts()
    const [all, setAll] = useState(false)
    const alerts = query.data ?? []
    const shown = all ? alerts : alerts.slice(0, VISIBLE)
    const critical = alerts.filter((a) => a.severity === 'critical').length

    return (
        <WidgetFrame
            title="Active alerts"
            evaluation={evaluation}
            query={query}
            isEmpty={!!query.data && alerts.length === 0}
            emptyText="No active alerts. Nothing needs attention from fuel, maintenance or incidents."
            badge={
                alerts.length > 0 ? (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', critical > 0 ? 'bg-an-bad-soft text-an-bad' : 'bg-an-warn-soft text-an-warn')}>
                        {critical > 0 ? `${critical} critical` : `${alerts.length} active`}
                    </span>
                ) : undefined
            }
        >
            <ul className="divide-y divide-an-border">
                {shown.map((alert) => {
                    const href = alertHref(alert)
                    return (
                        <li key={alert.id} className="flex items-start gap-3 py-2.5 first:pt-0">
                            <span
                                className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', alert.severity === 'critical' ? 'bg-an-bad' : 'bg-an-warn')}
                                role="img"
                                aria-label={alert.severity}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-an-text">{alert.title}</p>
                                <p className="truncate text-xs text-an-muted">
                                    {SOURCE[alert.type]}
                                    {alert.vehicle_registration ? ` · ${alert.vehicle_registration}` : ''} · {formatDateTime(alert.created_at)}
                                </p>
                            </div>
                            {href && (
                                <Link href={href} className="shrink-0 text-xs font-medium text-an-accent hover:underline">
                                    Open
                                </Link>
                            )}
                        </li>
                    )
                })}
            </ul>
            {alerts.length > VISIBLE && (
                <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-xs font-medium text-an-accent hover:underline">
                    {all ? 'Show fewer' : `Show all ${alerts.length}`}
                </button>
            )}
        </WidgetFrame>
    )
}
