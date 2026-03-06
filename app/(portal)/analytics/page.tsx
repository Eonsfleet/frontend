'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, Truck, Fuel, AlertTriangle } from 'lucide-react'

const fleetTrendData = [
    { name: 'Mon', active: 65, idle: 20 },
    { name: 'Tue', active: 70, idle: 18 },
    { name: 'Wed', active: 85, idle: 10 },
    { name: 'Thu', active: 88, idle: 8 },
    { name: 'Fri', active: 90, idle: 5 },
    { name: 'Sat', active: 45, idle: 45 },
    { name: 'Sun', active: 30, idle: 60 },
]

const costData = [
    { month: 'Jan', fuel: 4000, maintenance: 2400 },
    { month: 'Feb', fuel: 3000, maintenance: 1398 },
    { month: 'Mar', fuel: 2000, maintenance: 9800 },
    { month: 'Apr', fuel: 2780, maintenance: 3908 },
    { month: 'May', fuel: 1890, maintenance: 4800 },
    { month: 'Jun', fuel: 2390, maintenance: 3800 },
]

export default function AnalyticsOverviewPage() {
    return (
        <div className="p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics Overview</h1>
                <p className="text-slate-500 mt-1">High-level metrics and system-wide intelligence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Avg Utilization</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">82.4%</h3>
                            <p className="text-xs text-emerald-600 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +2.1% this week</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600"><Truck className="w-6 h-6" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Fuel Cost / KM</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">₦ 142.50</h3>
                            <p className="text-xs text-rose-600 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +5.4% vs last month</p>
                        </div>
                        <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-sky-600"><Fuel className="w-6 h-6" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Critical Incidents</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">3</h3>
                            <p className="text-xs text-emerald-600 flex items-center mt-1">Down from 8 last week</p>
                        </div>
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600"><AlertTriangle className="w-6 h-6" /></div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">7-Day Fleet Activity</CardTitle>
                        <CardDescription>Active vs Idle vehicles over the past week.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={fleetTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="active" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">OpEx Overview (6 Months)</CardTitle>
                        <CardDescription>Fuel vs Maintenance expenditure trends.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={costData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="fuel" fill="#0ea5e9" radius={[4, 4, 0, 0]} stackId="a" />
                                    <Bar dataKey="maintenance" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
