'use client'

import React from 'react'
import { CheckCircle2, Circle, MapPin, Flag } from 'lucide-react'
import { format } from 'date-fns'

interface Checkpoint {
    name: string
    timestamp?: string
    completed: boolean
}

interface TripProgressTimelineProps {
    checkpoints: Checkpoint[]
}

export function TripProgressTimeline({ checkpoints }: TripProgressTimelineProps) {
    const formatDate = (timestamp?: string) => {
        if (!timestamp) return { date: '', time: '' }
        try {
            const date = new Date(timestamp)
            return {
                date: format(date, 'MMM dd'),
                time: format(date, 'h:mm a')
            }
        } catch {
            return { date: '', time: '' }
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-6">Progress Timeline</h3>
            <div className="relative">
                {/* Horizontal progress line container */}
                <div className="flex items-center justify-between relative pb-2">
                    {/* Background pathway - dashed line */}
                    <div 
                        className="absolute top-5 left-0 right-0 border-t-2 border-dashed border-slate-200" 
                        style={{ left: '20px', right: '20px' }} 
                    />
                    
                    {/* Active progress line - solid pathway */}
                    <div 
                        className="absolute top-5 left-0 border-t-2 border-blue-500 transition-all duration-700 ease-in-out"
                        style={{ 
                            left: '20px',
                            width: `calc(${(checkpoints.filter(c => c.completed).length - 1) / Math.max(checkpoints.length - 1, 1) * 100}% - 20px)`
                        }}
                    />

                    {/* Checkpoints */}
                    {checkpoints.map((checkpoint, index) => {
                        const { date, time } = formatDate(checkpoint.timestamp)
                        const isFirst = index === 0
                        const isLast = index === checkpoints.length - 1
                        
                        return (
                            <div 
                                key={index} 
                                className="flex flex-col items-center relative z-10 transition-all duration-300" 
                                style={{ flex: 1 }}
                            >
                                {/* Checkpoint icon */}
                                <div className={`relative ${checkpoint.completed ? 'animate-in zoom-in duration-300' : ''}`}>
                                    {checkpoint.completed ? (
                                        isFirst ? (
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 ring-4 ring-emerald-50">
                                                <MapPin className="h-5 w-5 text-white" fill="currentColor" />
                                            </div>
                                        ) : isLast ? (
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                                                <Flag className="h-5 w-5 text-white" fill="currentColor" />
                                            </div>
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                                                <CheckCircle2 className="h-5 w-5 text-white" fill="currentColor" />
                                            </div>
                                        )
                                    ) : (
                                        isFirst ? (
                                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center ring-4 ring-slate-50">
                                                <MapPin className="h-5 w-5 text-slate-400" />
                                            </div>
                                        ) : isLast ? (
                                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center ring-4 ring-slate-50">
                                                <Flag className="h-5 w-5 text-slate-400" />
                                            </div>
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center ring-4 ring-slate-50">
                                                <Circle className="h-4 w-4 text-slate-400" />
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Checkpoint name */}
                                <p className={`text-xs font-semibold mt-3 text-center ${checkpoint.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {checkpoint.name}
                                </p>

                                {/* Date and time */}
                                {checkpoint.timestamp && (
                                    <div className="mt-1 text-center">
                                        <p className={`text-xs font-medium ${checkpoint.completed ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {date}
                                        </p>
                                        <p className={`text-[10px] ${checkpoint.completed ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {time}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
