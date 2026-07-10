'use client'

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import type { TrendDualPoint } from './useFuelAnalysis'

function DualTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
    if (!active || !payload?.length) return null
    const cur = payload.find((p) => p.dataKey === 'current')?.value
    const prev = payload.find((p) => p.dataKey === 'previous')?.value
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-[11px] font-medium text-slate-400">{label}</p>
            <p className="mt-1 flex items-center justify-between gap-4 text-[12px]">
                <span className="text-slate-500">This Period</span>
                <span className="font-bold text-slate-900">{cur} L</span>
            </p>
            <p className="flex items-center justify-between gap-4 text-[12px]">
                <span className="text-slate-500">Previous Period</span>
                <span className="font-bold text-slate-500">{prev} L</span>
            </p>
        </div>
    )
}

export function ConsumptionTrendCard({ data }: { data: TrendDualPoint[] }) {
    return (
        <Card className="rounded-2xl border-slate-100 p-5 shadow-none">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Fuel Consumption Trend</h2>
                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500" /> This Period
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-0 w-3 border-t-2 border-dashed border-slate-300" /> Previous Period
                    </span>
                </div>
            </div>

            <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                        <defs>
                            <linearGradient id="consumptionCurrent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={1} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={44} />
                        <Tooltip content={<DualTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
                        <Line type="monotone" dataKey="previous" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                        <Area
                            type="monotone"
                            dataKey="current"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            fill="url(#consumptionCurrent)"
                            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}
