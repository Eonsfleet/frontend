'use client'

import { Play, Pause, Rewind, FastForward, Navigation as NavigationIcon, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { PlaybackMovement } from '@/types'

export interface PlaybackScrubberProps {
  movements: PlaybackMovement[]
  currentIndex: number
  onIndexChange: (index: number) => void
  isPlaying: boolean
  onTogglePlaying: () => void
  speed: 1 | 2 | 4 | 8
  onSpeedChange: (speed: 1 | 2 | 4 | 8) => void
}

export function PlaybackScrubber({ movements, currentIndex, onIndexChange, isPlaying, onTogglePlaying, speed, onSpeedChange }: PlaybackScrubberProps) {
  const currentMovement = movements[currentIndex]
  const progress = movements.length > 1 ? [(currentIndex / (movements.length - 1)) * 100] : [0]

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Step back"
            onClick={() => onIndexChange(Math.max(0, currentIndex - 10))}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600"
          >
            <Rewind className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={onTogglePlaying}
            disabled={movements.length === 0}
            className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
          </button>
          <button
            type="button"
            aria-label="Step forward"
            onClick={() => onIndexChange(Math.min(movements.length - 1, currentIndex + 10))}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600"
          >
            <FastForward className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 ml-2">
            {([1, 2, 4, 8] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={cn(
                  'h-7 w-9 rounded-full text-[10px] font-black transition-colors',
                  speed === s ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900',
                )}
              >
                {s}X
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
          {currentMovement && (
            <>
              <span className="flex items-center gap-1.5">
                <NavigationIcon className="h-3.5 w-3.5" style={{ transform: `rotate(${currentMovement.heading}deg)` }} />
                {Math.round(currentMovement.heading)}°
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <Truck className="h-3.5 w-3.5" /> {Math.round(currentMovement.speed)} km/h
              </span>
              <span>{format(new Date(currentMovement.timestamp), 'hh:mm:ss a')}</span>
            </>
          )}
        </div>
      </div>

      <Slider
        value={progress}
        max={100}
        step={0.1}
        onValueChange={([val]) => {
          if (movements.length === 0) return
          onIndexChange(Math.round((val / 100) * (movements.length - 1)))
        }}
      />
      <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
        <span>{movements[0] ? format(new Date(movements[0].timestamp), 'hh:mm:ss a') : '--'}</span>
        <span>{movements[movements.length - 1] ? format(new Date(movements[movements.length - 1].timestamp), 'hh:mm:ss a') : '--'}</span>
      </div>
    </div>
  )
}
