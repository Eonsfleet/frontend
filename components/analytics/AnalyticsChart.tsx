'use client'

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Brush,
    Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AnalyticsChartProps {
    title: string
    description?: string
    data: any[]
    dataKeys: Array<{ key: string; color: string; label: string }>
    xAxisKey?: string
    height?: number
    allowComparison?: boolean
}

export function AnalyticsChart({
    title,
    description,
    data,
    dataKeys,
    xAxisKey = 'name',
    height = 350,
    allowComparison = false
}: AnalyticsChartProps) {
    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</CardTitle>
                    {description && <CardDescription className="text-[10px] mt-0.5">{description}</CardDescription>}
                </div>
                {allowComparison && (
                    <div className="flex items-center gap-2">
                        <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest px-2 py-1 rounded bg-blue-50 transition-colors">
                            Compare +
                        </button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height }}>
                    <ResponsiveContainer>
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                {dataKeys.map((dk, i) => (
                                    <linearGradient key={`grad-${i}`} id={`color-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={dk.color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={dk.color} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey={xAxisKey}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            />
                            {dataKeys.map((dk, i) => (
                                <Area
                                    key={dk.key}
                                    name={dk.label}
                                    type="monotone"
                                    dataKey={dk.key}
                                    stroke={dk.color}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill={`url(#color-${dk.key})`}
                                />
                            ))}
                            <Brush
                                dataKey={xAxisKey}
                                height={30}
                                stroke="#cbd5e1"
                                fill="#f8fafc"
                                travellerWidth={10}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
