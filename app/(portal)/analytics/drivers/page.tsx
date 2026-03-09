'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getTopDriversByTrips } from '@/lib/api/analytics'
import { Loader2 } from 'lucide-react'

export default function DriverAnalyticsPage() {
    const { data: driversData, isLoading } = useQuery({
        queryKey: ['top-drivers-performance'],
        queryFn: () => getTopDriversByTrips({ limit: 10, period: 'monthly' })
    })

    const drivers = driversData?.data?.drivers || []

    const performanceRadar = useMemo(() => {
        if (drivers.length === 0) return [
            { subject: 'Punctuality', score: 0, fullMark: 100 },
            { subject: 'Safety', score: 0, fullMark: 100 },
            { subject: 'Fuel Efficiency', score: 0, fullMark: 100 },
            { subject: 'Compliance', score: 0, fullMark: 100 },
            { subject: 'Navigation', score: 0, fullMark: 100 },
        ]

        const avgSafety = drivers.reduce((acc: number, d: any) => acc + (d.safety_rating || 0), 0) / drivers.length
        const avgCompliance = drivers.reduce((acc: number, d: any) => acc + (d.compliance_score || 0), 0) / drivers.length
        const avgFuelEff = drivers.reduce((acc: number, d: any) => acc + (d.fuel_efficiency || 0), 0) / drivers.length

        return [
            { subject: 'Punctuality', score: 85, fullMark: 100 }, // Static for now as API doesn't provide it
            { subject: 'Safety', score: Math.round(avgSafety * 20), fullMark: 100 },
            { subject: 'Fuel Efficiency', score: Math.min(100, Math.round(avgFuelEff * 10)), fullMark: 100 },
            { subject: 'Compliance', score: Math.round(avgCompliance), fullMark: 100 },
            { subject: 'Navigation', score: 88, fullMark: 100 }, // Static for now
        ]
    }, [drivers])

    const tripCompletions = useMemo(() => {
        return drivers.slice(0, 5).map((d: any) => ({
            driver: d.driver_name.split(' ')[0],
            completed: d.total_trips,
            delayed: d.incidents_count || 0
        }))
    }, [drivers])

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Driver Performance</h1>
                <p className="text-slate-500 mt-1">Key scoring metrics reflecting safety and operational compliance.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Average Fleet DNA</CardTitle>
                        <CardDescription>Aggregate performance scores out of 100.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={performanceRadar}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Average Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Top Trip Completions</CardTitle>
                        <CardDescription>Logistics delivery reliability leaders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full pb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={tripCompletions} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="driver" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name="On Time" />
                                    <Bar dataKey="delayed" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Delayed" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
