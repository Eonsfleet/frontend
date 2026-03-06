'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Truck, Navigation, Settings } from 'lucide-react'

const topVehicles = [
    { name: 'KJA-123-AB', distance: 4500, trips: 142 },
    { name: 'EKY-456-CD', distance: 3800, trips: 110 },
    { name: 'APP-789-EF', distance: 3100, trips: 89 },
    { name: 'LSR-321-GH', distance: 2900, trips: 76 },
    { name: 'BDG-654-IJ', distance: 2100, trips: 55 },
]

const availabilityStatus = [
    { name: 'Active on Trip', value: 65, color: '#4f46e5' },
    { name: 'Idle / Available', value: 20, color: '#10b981' },
    { name: 'Maintenance', value: 10, color: '#f59e0b' },
    { name: 'Offline', value: 5, color: '#94a3b8' },
]

export default function FleetAnalyticsPage() {
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
