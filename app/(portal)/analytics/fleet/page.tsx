'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getFuelConsumptionReport } from '@/lib/api/analytics'
import { getTrackingMetrics } from '@/lib/api/tracking'
import { Loader2 } from 'lucide-react'

export default function FleetAnalyticsPage() {
    const { data: consumptionData, isLoading: isConsLoading } = useQuery({
        queryKey: ['fleet-consumption-top'],
        queryFn: () => getFuelConsumptionReport({ period: 'monthly', sort_by: 'distance', per_page: 5 })
    })

    const { data: trackingMetrics, isLoading: isMetricsLoading } = useQuery({
        queryKey: ['fleet-tracking-metrics'],
        queryFn: () => getTrackingMetrics()
    })

    const metrics = trackingMetrics?.data || {}
    const topVehicles = useMemo(() => {
        return consumptionData?.data?.report_data?.map((r: any) => ({
            name: r.vehicle_registration,
            distance: r.distance_km,
            trips: r.trip_count
        })) || []
    }, [consumptionData])

    const availabilityStatus = useMemo(() => [
        { name: 'Active on Trip', value: metrics.moving_assets || 0, color: '#4f46e5' },
        { name: 'Idle / Available', value: metrics.idle_assets || 0, color: '#10b981' },
        { name: 'Offline', value: metrics.offline_assets || 0, color: '#94a3b8' },
    ], [metrics])

    if (isConsLoading || isMetricsLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fleet Utilization</h1>
                <p className="text-slate-500 mt-1">Deep dive into deployment ratios and vehicle mileage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Top Performing Vehicles</CardTitle>
                        <CardDescription>Measured by total driven distance (KM) this month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topVehicles} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} width={90} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="distance" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Current Fleet Status</CardTitle>
                        <CardDescription>Live deployment ratios.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-0 pb-6">
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={availabilityStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {availabilityStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full px-6 grid grid-cols-2 gap-4 gap-y-2 mt-2">
                            {availabilityStatus.map(status => (
                                <div key={status.name} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }}></div>
                                    <span className="text-xs text-slate-600 truncate">{status.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
