'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { format, isSameDay } from 'date-fns'

export interface MaintenanceDay {
    date: Date
    count: number
    vehicles: Array<{ id: string; reg: string; service: string }>
}

export function MaintenanceHeatmap({ data = [] }: { data?: MaintenanceDay[] }) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(data.length > 0 ? data[1].date : null)

    const selectedDayData = data.find(d => selectedDate && isSameDay(d.date, selectedDate))

    const getIntensityClass = (count: number) => {
        if (count === 0) return 'bg-slate-50 border-slate-100 text-slate-300'
        if (count <= 1) return 'bg-amber-50 border-amber-100 text-amber-600'
        if (count <= 3) return 'bg-amber-100 border-amber-200 text-amber-700'
        return 'bg-amber-200 border-amber-300 text-amber-900'
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            Maintenance Forecast
                        </CardTitle>
                        <CardDescription className="text-[10px]">7-day operational load</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-1 hover:bg-slate-100 rounded-md text-slate-400 transition-colors">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button className="p-1 hover:bg-slate-100 rounded-md text-slate-400 transition-colors">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
                <div className="grid grid-cols-7 gap-2">
                    {data.map((day, idx) => {
                        const isSelected = selectedDate && isSameDay(day.date, selectedDate);
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(day.date)}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105",
                                    getIntensityClass(day.count),
                                    isSelected ? "ring-2 ring-blue-500 ring-offset-2 scale-105 shadow-md z-10" : "shadow-sm"
                                )}
                            >
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">
                                    {format(day.date, 'EEE')}
                                </span>
                                <span className="text-lg font-black">{day.count}</span>
                                <div className="flex gap-0.5">
                                    {[...Array(Math.min(day.count, 3))].map((_, i) => (
                                        <div key={i} className="h-1 w-1 rounded-full bg-current opacity-50" />
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="pt-6 border-t border-slate-50">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Tasks for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Selected Day'}
                    </h4>

                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
                        {!selectedDayData || selectedDayData.count === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4">No maintenance tasks scheduled for this day.</p>
                        ) : (
                            selectedDayData.vehicles.map((v) => (
                                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:border-blue-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-500 group-hover:text-blue-600 transition-colors">
                                            {v.reg.slice(-3)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{v.reg}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-tight">{v.service}</p>
                                        </div>
                                    </div>
                                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                                        Open
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
