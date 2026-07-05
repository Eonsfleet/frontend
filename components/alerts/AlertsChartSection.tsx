'use client'

import React from 'react'
import {
    ChevronDown
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

interface AlertsChartSectionProps {
    donutData: { name: string; value: number; color: string }[]
    trendData: { time: string; alerts: number }[]
}

export function AlertsChartSection({
    donutData,
    trendData
}: AlertsChartSectionProps) {
    return (
        <div className="grid grid-cols-2 gap-3 h-[220px] shrink-0">
            {/* Donut Chart */}
            <div className="bg-white rounded-xl p-4 flex flex-col h-full overflow-hidden">
                <span className="text-[13px] font-semibold text-slate-800 mb-2">Alerts by Type</span>
                <div className="flex-grow flex items-center justify-between min-h-0">
                    <div className="h-full w-[42%] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={56}
                                    paddingAngle={2}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {donutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="text-base font-semibold fill-slate-800">
                                    128
                                </text>
                                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-medium fill-slate-400">
                                    Total
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 overflow-y-auto pl-3 space-y-2 scrollbar-none text-[11px] text-slate-500">
                        {donutData.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span style={{ backgroundColor: item.color }} className="w-2 h-2 rounded-full shrink-0" />
                                    <span>{item.name}</span>
                                </div>
                                <span className="text-slate-700 font-medium">{item.value} ({Math.round(item.value / 1.28)}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Trend Line Chart */}
            <div className="bg-white rounded-xl p-4 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-slate-800">Alerts Trend</span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer select-none">
                        <span>Today</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0' }} />
                            <Line
                                type="monotone"
                                dataKey="alerts"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 2.5, stroke: '#3b82f6', strokeWidth: 1.5, fill: '#fff' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="absolute top-[26%] left-[52%] bg-slate-800 text-[10px] text-white px-2 py-1 rounded-md font-medium leading-tight select-none pointer-events-none">
                        <div>10:00 AM</div>
                        <div className="text-blue-300 text-[9px]">18 Alerts</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AlertsChartSection
