'use client'

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import type { DistributionBand } from './useFuelOverview'

interface FuelDistributionCardProps {
    bands: DistributionBand[]
    total: number
}

export function FuelDistributionCard({ bands, total }: FuelDistributionCardProps) {
    const data = bands.map((b) => ({ name: b.label, value: b.count, color: b.color }))
    const hasData = bands.some((b) => b.count > 0)

    return (
        <Card className="rounded-2xl border-0 bg-white p-5 shadow-none">
            <h2 className="text-base font-bold text-slate-900">Fuel Level Distribution</h2>

            <div className="mt-4 flex items-center gap-4">
                <div className="relative h-[132px] w-[132px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={hasData ? data : [{ name: 'none', value: 1, color: '#e2e8f0' }]}
                                dataKey="value"
                                innerRadius={44}
                                outerRadius={64}
                                paddingAngle={hasData ? 2 : 0}
                                startAngle={90}
                                endAngle={-270}
                                stroke="none"
                                isAnimationActive={false}
                            >
                                {(hasData ? data : [{ color: '#e2e8f0' }]).map((d, i) => (
                                    <Cell key={i} fill={d.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-slate-900">{total}</span>
                        <span className="text-[10px] font-medium text-slate-400">Total Vehicles</span>
                    </div>
                </div>

                <ul className="flex-1 space-y-2">
                    {bands.map((b) => (
                        <li key={b.key} className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5 text-slate-500">
                                <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                                {b.label}
                            </span>
                            <span className="font-semibold text-slate-700">
                                {b.count} <span className="font-normal text-slate-400">({b.percent}%)</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    )
}
