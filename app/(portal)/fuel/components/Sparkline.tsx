'use client'

import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { useId } from 'react'

interface SparklineProps {
    data: number[]
    color: string
    height?: number
}

/** Tiny gradient area sparkline for the KPI cards. Purely decorative — no axes. */
export function Sparkline({ data, color, height = 40 }: SparklineProps) {
    const id = useId().replace(/:/g, '')
    const series = data.map((value, i) => ({ i, value }))
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#spark-${id})`}
                    isAnimationActive={false}
                    dot={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
