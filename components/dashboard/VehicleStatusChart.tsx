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
    description = "Real-time fleet availability overview"
}: {
    data: VehicleStatus[],
    title?: string,
    description?: string
}) {
    const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)

    return (
        <Card className="col-span-1 border-slate-200 shadow-sm flex flex-col h-full">
            <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <div className="h-full w-full mt-4">
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
            </CardContent>
        </Card>

    )
}
