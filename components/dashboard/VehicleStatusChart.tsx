'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'

interface VehicleStatus {
    name: string
    value: number
    color: string
}

export function VehicleStatusChart({
    data,
    title = "Vehicle Status",
    description = "Real-time fleet availability overview",
    showSummary = false
}: {
    data: VehicleStatus[],
    title?: string,
    description?: string,
    /** Render an always-visible Total/segment count + percentage row below the chart, independent of hover or legend. */
    showSummary?: boolean
}) {
    const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)

    return (
        <Card className="col-span-1 border-slate-200 shadow-sm flex flex-col h-full">
            <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={85}
                                paddingAngle={2}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                formatter={(value: any) => [`${value || 0} Vehicles`, 'Status']}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                formatter={(name: string, entry: any) => (
                                    <span className="text-slate-600">
                                        {name} <span className="font-semibold text-slate-900">({entry?.payload?.value ?? 0})</span>
                                    </span>
                                )}
                            />
                            <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-slate-900">
                                {String(total)}
                            </text>
                            <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-xs font-medium fill-slate-500">
                                Total
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {showSummary && (
                    <div className="shrink-0 grid grid-cols-2 gap-2 pt-3 mt-1 border-t border-slate-100">
                        {data.map((item) => {
                            const pct = total > 0 ? (item.value / total) * 100 : 0
                            return (
                                <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="flex items-center gap-1.5 text-slate-500">
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                        {item.name}
                                    </span>
                                    <span className="font-semibold text-slate-900 tabular-nums">
                                        {item.value} <span className="text-slate-400 font-medium">({pct.toFixed(1)}%)</span>
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>

    )
}
