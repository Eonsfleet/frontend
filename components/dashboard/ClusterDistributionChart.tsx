'use client'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface ClusterDistribution {
    name: string
    total: number
    online: number
    offline: number
}

const ONLINE_COLOR = '#10b981'
const OFFLINE_COLOR = '#ef4444'

function ClusterTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    const row: ClusterDistribution = payload[0]?.payload
    if (!row) return null

    const offlineRate = row.total > 0 ? (row.offline / row.total) * 100 : 0

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-lg text-xs min-w-40">
            <p className="font-black text-slate-900 mb-2 uppercase tracking-tight text-[11px]">{String(label).toUpperCase()}</p>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Total</span>
                    <span className="font-bold text-slate-900 tabular-nums">{row.total}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ONLINE_COLOR }} />
                        Online
                    </span>
                    <span className="font-bold tabular-nums" style={{ color: ONLINE_COLOR }}>{row.online}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: OFFLINE_COLOR }} />
                        Offline
                    </span>
                    <span className="font-bold tabular-nums" style={{ color: OFFLINE_COLOR }}>{row.offline}</span>
                </div>
                {row.offline > 0 && (
                    <div className="pt-1.5 mt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                        {offlineRate.toFixed(0)}% offline
                    </div>
                )}
            </div>
        </div>
    )
}

function ClusterAxisTick({ x, y, payload }: any) {
    return (
        <text x={x} y={y} dy={10} textAnchor="middle" fill="#475569" fontSize={11} fontWeight={700}>
            {String(payload.value).toUpperCase()}
        </text>
    )
}

/** Total value rendered above each stacked bar — the one figure worth labeling directly. */
function TotalLabel(props: any) {
    const { x, y, width, value } = props
    if (value == null) return null
    return (
        <text
            x={x + width / 2}
            y={y - 8}
            textAnchor="middle"
            className="fill-slate-900 text-[11px] font-bold tabular-nums"
        >
            {value}
        </text>
    )
}

export function ClusterDistributionChart({
    data,
    title = "Asset Distribution by Cluster",
    description = "Total, online and offline assets per cluster",
    height = 340,
    isCountPending = false
}: {
    data: ClusterDistribution[]
    title?: string
    description?: string
    height?: number
    isCountPending?: boolean
}) {
    const sorted = [...data].sort((a, b) => b.total - a.total)
    const mostOffline = sorted.length > 0
        ? sorted.reduce((worst, c) => (c.total > 0 && c.offline / c.total > (worst.total > 0 ? worst.offline / worst.total : 0) ? c : worst), sorted[0])
        : null

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 shrink-0">
                <div>
                    <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</CardTitle>
                    <CardDescription className="text-[10px] mt-0.5">
                        {isCountPending ? "Loading counts…" : description}
                    </CardDescription>
                </div>
                {!isCountPending && mostOffline && mostOffline.offline > 0 && (
                    <div className="text-right shrink-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Highest Offline Rate</p>
                        <p className="text-xs font-bold text-blue-600 uppercase">
                            {mostOffline.name} · {((mostOffline.offline / mostOffline.total) * 100).toFixed(0)}%
                        </p>
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {sorted.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                        No cluster data available
                    </div>
                ) : (
                    <div className={cn("h-full overflow-x-auto overflow-y-hidden", isCountPending && "animate-pulse")}>
                        <div style={{ minWidth: '100%', width: Math.max(sorted.length * 90, 100), height }}>
                            <ResponsiveContainer>
                                <BarChart data={sorted} margin={{ top: 24, right: 10, left: 0, bottom: 0 }} barCategoryGap={6} barGap={0}>
                                    <CartesianGrid strokeDasharray="none" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={<ClusterAxisTick />}
                                        interval={0}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} content={<ClusterTooltip />} />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        height={36}
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                    />
                                    <Bar name="Online" dataKey="online" stackId="status" fill={ONLINE_COLOR} radius={[0, 0, 6, 6]} />
                                    <Bar name="Offline" dataKey="offline" stackId="status" fill={OFFLINE_COLOR} radius={[6, 6, 0, 0]}>
                                        <LabelList dataKey="total" content={<TotalLabel />} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
