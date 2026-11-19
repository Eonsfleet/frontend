'use client'

import { format } from 'date-fns'
import type { PlaybackStop } from '@/types'
import { useAddress } from '../../hooks/useAddress'

function StopRow({ stop, index, onSelect }: { stop: PlaybackStop; index: number; onSelect?: () => void }) {
  const address = useAddress(stop)
  const mins = Math.round(stop.durationMinutes)
  const duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">{index + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-slate-800">
          {format(new Date(stop.startTimestamp), 'hh:mm a')} – {format(new Date(stop.endTimestamp), 'hh:mm a')}
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-500">{address}</span>
      </span>
      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">{duration}</span>
    </button>
  )
}

export function StopsTab({ stops, onJumpToIndex }: { stops: PlaybackStop[]; onJumpToIndex?: (index: number) => void }) {
  if (stops.length === 0) return <p className="py-6 text-center text-xs font-bold text-slate-400">No stops detected for this window.</p>
  return (
    <div className="space-y-2">
      {stops.map((stop, i) => (
        <StopRow key={stop.startIndex} stop={stop} index={i} onSelect={onJumpToIndex ? () => onJumpToIndex(stop.startIndex) : undefined} />
      ))}
    </div>
  )
}
