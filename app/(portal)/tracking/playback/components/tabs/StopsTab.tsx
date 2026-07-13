'use client'

import { format } from 'date-fns'
import { CircleDot } from 'lucide-react'
import type { PlaybackStop } from '@/types'

export function StopsTab({ stops, onJumpToIndex }: { stops: PlaybackStop[]; onJumpToIndex?: (index: number) => void }) {
  if (stops.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 p-4">No stops detected for this window.</p>
  }
  return (
    <div className="divide-y divide-slate-100">
      {stops.map((stop, i) => (
        <button key={i} type="button" onClick={() => onJumpToIndex?.(stop.startIndex)} className="flex w-full items-center gap-3 py-2.5 px-1 text-left hover:bg-slate-50">
          <CircleDot className="h-4 w-4 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900">Stop {i + 1}</p>
            <p className="text-[10px] font-medium text-slate-400">{Math.round(stop.durationMinutes)} min</p>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{format(new Date(stop.startTimestamp), 'hh:mm:ss a')}</span>
        </button>
      ))}
    </div>
  )
}