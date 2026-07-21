'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface PlaybackFeedEntry {
  id: string
  time: string
  title: string
  details: ReactNode[]
  tone: 'blue' | 'green' | 'amber' | 'orange' | 'red'
  badge?: string
  onSelect?: () => void
}

const TONE_CLASSES: Record<PlaybackFeedEntry['tone'], { dot: string; title: string }> = {
  blue: { dot: 'bg-blue-600', title: 'text-slate-900' },
  green: { dot: 'bg-emerald-500', title: 'text-slate-900' },
  amber: { dot: 'bg-amber-500', title: 'text-amber-600' },
  orange: { dot: 'bg-orange-500', title: 'text-orange-600' },
  red: { dot: 'bg-rose-600', title: 'text-rose-600' },
}

export function coordinateLabel(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

export function PlaybackEventFeed({ entries, emptyMessage }: { entries: PlaybackFeedEntry[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-[10px] font-bold text-slate-400">{emptyMessage}</p>
  }

  return (
    <ol className="space-y-0.5">
      {entries.map((entry, index) => {
        const tone = TONE_CLASSES[entry.tone]
        return (
          <li key={entry.id} className="grid grid-cols-[4.5rem_1rem_minmax(0,1fr)] gap-x-2.5">
            <time className="pt-1 text-right text-[9px] font-black tabular-nums text-blue-600">{entry.time}</time>
            <div className="relative flex justify-center">
              {index < entries.length - 1 && <span className="absolute top-3 bottom-0 w-px bg-slate-200" />}
              <span className={cn('relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm', tone.dot)} />
            </div>
            <button
              type="button"
              onClick={entry.onSelect}
              disabled={!entry.onSelect}
              className="mb-3 flex min-w-0 items-start justify-between gap-3 rounded-lg pb-0.5 text-left transition-colors enabled:hover:bg-slate-50 enabled:hover:px-2 enabled:hover:-mx-2 enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-blue-500"
            >
              <span className="min-w-0">
                <span className={cn('block text-[11px] font-black leading-4', tone.title)}>{entry.title}</span>
                {entry.details.map((detail, detailIndex) => (
                  <span key={detailIndex} className="block truncate text-[10px] font-semibold leading-4 text-slate-500">{detail}</span>
                ))}
              </span>
              {entry.badge && <span className="mt-0.5 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[9px] font-black text-slate-500 shadow-sm">{entry.badge}</span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
