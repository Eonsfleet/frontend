'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Users, Award, ShieldAlert, Timer } from 'lucide-react'

const performanceRadar = [
    { subject: 'Punctuality', score: 85, fullMark: 100 },
    { subject: 'Safety', score: 92, fullMark: 100 },
    { subject: 'Fuel Efficiency', score: 78, fullMark: 100 },
    { subject: 'Compliance', score: 95, fullMark: 100 },
    { subject: 'Navigation', score: 88, fullMark: 100 },
]

const tripCompletions = [
    { driver: 'Adeola B.', completed: 45, delayed: 2 },
    { driver: 'Emeka U.', completed: 40, delayed: 1 },
    { driver: 'John O.', completed: 38, delayed: 4 },
    { driver: 'Mustapha S.', completed: 32, delayed: 0 },
    { driver: 'Chioma N.', completed: 28, delayed: 1 },
]

export default function DriverAnalyticsPage() {
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
