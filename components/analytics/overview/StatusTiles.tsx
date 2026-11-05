'use client'

import { useMemo } from 'react'
import { Radio } from 'lucide-react'
import { KpiCard } from '@/components/analytics/kit/KpiCard'
import { WidgetFrame } from '@/components/analytics/kit/WidgetFrame'
import { evaluateWidget } from '@/lib/analytics/applicability'
import type { AnalyticsFilters } from '@/lib/analytics/filters'
import { useDeviceStatus, useVehicleStatus } from '@/hooks/analytics/useOverviewQueries'
import { useVehicleStatusLive, type LiveConnection } from '@/hooks/analytics/useVehicleStatusLive'
import { cn } from '@/lib/utils'
import { formatTime } from '@/components/analytics/telemetry/format'

const pretty = (slug: string) => slug.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

const CONNECTION: Record<LiveConnection, { text: string; dot: string }> = {
    live: { text: 'Live', dot: 'bg-an-good' },
    connecting: { text: 'Connecting', dot: 'bg-an-warn' },
    offline: { text: 'Reconnecting', dot: 'bg-an-warn' },
    unavailable: { text: 'Live updates unavailable', dot: 'bg-an-bad' },
}

export function FleetStatusTile({ filters }: { filters: AnalyticsFilters }) {
    const evaluation = useMemo(() => evaluateWidget('fleet-status', filters), [filters])
    const query = useVehicleStatus()
    const { connection, lastEventAt } = useVehicleStatusLive(() => query.refetch())
    const data = query.data
    const state = CONNECTION[connection]

    const badge = (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-an-surface-muted px-2 py-0.5 text-xs text-an-muted" role="status">
            <span className={cn('h-1.5 w-1.5 rounded-full', state.dot)} aria-hidden />
            {state.text}
        </span>
    )

    return (
        <WidgetFrame
            title="Fleet status"
            evaluation={evaluation}
            query={query}
            isEmpty={!!data && data.total === 0}
            emptyText="No vehicles yet."
            badge={badge}
        >
            {data && (
                <div className="space-y-3">
                    <div className="text-3xl font-semibold tabular-nums tracking-tight">
                        {data.total.toLocaleString('en-GB')} <span className="text-sm font-normal text-an-muted">vehicles</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-an-surface-muted" aria-hidden>
                        {data.distribution.map((item, i) => (
                            <div key={item.status} style={{ width: `${item.percentage}%`, background: `var(--an-chart-${(i % 5) + 1})` }} />
                        ))}
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        {data.distribution.map((item, i) => (
                            <li key={item.status} className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 text-an-muted">
                                    <span className="h-2 w-2 rounded-full" style={{ background: `var(--an-chart-${(i % 5) + 1})` }} aria-hidden />
                                    {pretty(item.status)}
                                </span>
                                <span className="tabular-nums text-an-text">{item.count.toLocaleString('en-GB')}</span>
                            </li>
                        ))}
                    </ul>
                    {lastEventAt && (
                        <p className="flex items-center gap-1 text-xs text-an-muted">
                            <Radio className="h-3 w-3" aria-hidden /> A trip started at {formatTime(new Date(lastEventAt).toISOString())}; counts refreshed.
                        </p>
                    )}
                </div>
            )}
        </WidgetFrame>
    )
}

export function DeviceStatusTile({ filters }: { filters: AnalyticsFilters }) {
    const evaluation = useMemo(() => evaluateWidget('device-status', filters), [filters])
    const query = useDeviceStatus()
    const data = query.data

    return (
        <WidgetFrame title="Tracking devices" evaluation={evaluation} query={query} isEmpty={!!data && data.total_devices === 0} emptyText="No tracking devices yet.">
            {data && (
                <div className="grid grid-cols-3 gap-3">
                    <KpiCard label="Online" value={data.online.toLocaleString('en-GB')} tone={data.online > 0 ? 'good' : 'default'} />
                    <KpiCard label="Offline" value={data.offline.toLocaleString('en-GB')} tone={data.offline > 0 ? 'bad' : 'default'} />
                    <KpiCard label="Total" value={data.total_devices.toLocaleString('en-GB')} note={`${data.connected_to_vehicle} on a vehicle`} />
                </div>
            )}
        </WidgetFrame>
    )
}
