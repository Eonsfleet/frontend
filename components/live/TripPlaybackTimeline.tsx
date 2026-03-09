'use client'

import React, { useState, useEffect } from 'react'
import {
    Play,
    Pause,
    RotateCcw,
    FastForward,
    AlertTriangle,
    MapPin,
    Clock,
    ChevronUp,
    ChevronDown,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function TripPlaybackTimeline({
    isOpen,
    onClose,
    data = [],
    currentIndex = 0,
    onIndexChange,
    isPlaying,
    setIsPlaying,
    isLoading
}: {
    isOpen: boolean
    onClose: () => void
    data?: any[]
    currentIndex?: number
    onIndexChange?: (index: number) => void
    isPlaying?: boolean
    setIsPlaying?: (playing: boolean) => void
    isLoading?: boolean
}) {
    const [speed, setSpeed] = useState(1)
    const [isExpanded, setIsExpanded] = useState(true)

    // Playback Interval Logic
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isPlaying && onIndexChange && currentIndex < data.length - 1) {
            interval = setInterval(() => {
                onIndexChange(currentIndex + 1)
            }, 1000 / speed)
        } else if (currentIndex >= data.length - 1) {
            setIsPlaying?.(false)
        }
        return () => clearInterval(interval)
    }, [isPlaying, currentIndex, data.length, speed, onIndexChange, setIsPlaying])

    if (!isOpen) return null

    const currentPoint = data[currentIndex]
    const progress = data.length > 0 ? (currentIndex / (data.length - 1)) * 100 : 0

    return (
        <div className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 w-full max-w-4xl px-4",
            isOpen ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        )}>
            <div className="bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-xl">
                {/* Expand/Collapse Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full h-6 flex items-center justify-center text-white/20 hover:text-white/40 transition-colors"
                >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>

                <div className={cn("p-6 space-y-6 transition-all", isExpanded ? "block" : "hidden")}>
                    {/* Top Row: Info & Speed */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase italic tracking-tight">TRIP REPLAY: {currentPoint ? 'MISSION IN PROGRESS' : 'FETCHING TELEMETRY...'}</h3>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                                    {currentPoint ? `TIMESTAMP: ${new Date(currentPoint.timestamp).toLocaleTimeString()}` : 'SYNCING WITH TRACKER...'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10">
                            {[1, 2, 4, 8].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSpeed(s)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        speed === s ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    {s}X
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Slider */}
                    <div className="relative pt-4">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
                            <div
                                className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <input
                            type="range"
                            className="absolute top-4 w-full h-1.5 opacity-0 cursor-pointer z-10"
                            min={0}
                            max={data.length - 1}
                            value={currentIndex}
                            onChange={(e) => onIndexChange?.(parseInt(e.target.value))}
                        />
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Current Speed</p>
                                <p className="text-lg font-black text-white italic">{currentPoint?.speed || 0}<span className="text-[10px] font-bold text-slate-500 ml-1">KPH</span></p>
                            </div>
                            <div className="text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Heading</p>
                                <p className="text-lg font-black text-white italic">{currentPoint?.heading || 0}<span className="text-[10px] font-bold text-slate-500 ml-1">DEG</span></p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => onIndexChange?.(0)}
                                className="p-3 text-slate-400 hover:text-white transition-colors"
                            >
                                <RotateCcw className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setIsPlaying?.(!isPlaying)}
                                className="h-14 w-14 bg-white rounded-full flex items-center justify-center text-slate-900 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10"
                            >
                                {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
                            </button>
                            <button
                                onClick={() => onIndexChange?.(Math.min(data.length - 1, currentIndex + 10))}
                                className="p-3 text-slate-400 hover:text-white transition-colors"
                            >
                                <FastForward className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/5 transition-all"
                            >
                                EXIT REPLAY
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
