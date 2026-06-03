'use client'

import React from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
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
                date: format(date, 'MM/dd/yy'),
                time: format(date, 'h:mm a')
            }
        } catch {
            return { date: '', time: '' }
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="relative">
                {/* Horizontal progress line container */}
                <div className="flex items-center justify-between relative pb-20">
                    {/* Background line */}
                    <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-200" style={{ left: '24px', right: '24px' }} />
                    
                    {/* Active progress line */}
                    <div 
                        className="absolute top-6 left-0 h-0.5 bg-blue-500 transition-all duration-500"
                        style={{ 
                            left: '24px',
                            width: `calc(${(checkpoints.filter(c => c.completed).length - 1) / Math.max(checkpoints.length - 1, 1) * 100}% - 24px)`
                        }}
                    />

                    {/* Checkpoints */}
                    {checkpoints.map((checkpoint, index) => {
                        const { date, time } = formatDate(checkpoint.timestamp)
                        return (
                            <div key={index} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
                                {/* Checkpoint name */}
                                <p className={`text-sm font-semibold mb-3 ${checkpoint.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {checkpoint.name}
                                </p>
                                
                                {/* Checkpoint icon */}
                                <div className="relative">
                                    {checkpoint.completed ? (
                                        <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                                            <CheckCircle2 className="h-7 w-7 text-white" fill="currentColor" />
                                        </div>
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-slate-300 flex items-center justify-center">
                                            <Circle className="h-7 w-7 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Date and time */}
                                {checkpoint.timestamp && (
                                    <div className="mt-3 text-center">
                                        <p className="text-xs text-slate-500">{date}</p>
                                        <p className="text-xs text-slate-500">{time}</p>
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
