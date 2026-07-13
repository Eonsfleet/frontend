'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PlaybackMovement } from '@/types'
import {
  findIndexForTime,
  interpolatePlaybackFrame,
  preparePlaybackPoints,
  type PlaybackFrame,
  type PlaybackPreparedPoint,
  type PlaybackSpeed,
} from '@/lib/playback/interpolation'

export interface UsePlaybackEngineParams {
  movements: PlaybackMovement[]
  isPlaying: boolean
  speed: PlaybackSpeed
  onPlaybackEnd?: () => void
}

export interface UsePlaybackEngineResult {
  preparedPoints: PlaybackPreparedPoint[]
  frame: PlaybackFrame | null
  playbackTimeMs: number | null
  currentIndex: number
  progressPercent: number
  seekToIndex: (index: number) => void
  seekToPercent: (percent: number) => void
  seekToTime: (timeMs: number) => void
}

export function usePlaybackEngine({ movements, isPlaying, speed, onPlaybackEnd }: UsePlaybackEngineParams): UsePlaybackEngineResult {
  const preparedPoints = useMemo(() => preparePlaybackPoints(movements), [movements])
  const firstTime = preparedPoints[0]?.timeMs ?? null
  const lastTime = preparedPoints[preparedPoints.length - 1]?.timeMs ?? null
  const routeKey = `${preparedPoints.length}:${firstTime ?? 'none'}:${lastTime ?? 'none'}`
  const [playbackTimeMs, setPlaybackTimeMs] = useState<number | null>(firstTime)
  const timeRef = useRef<number | null>(firstTime)
  const routeKeyRef = useRef(routeKey)
  const rafRef = useRef<number | null>(null)
  const lastFrameAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (routeKeyRef.current === routeKey) return
    routeKeyRef.current = routeKey
    const next = firstTime
    timeRef.current = next
    queueMicrotask(() => setPlaybackTimeMs(next))
  }, [firstTime, routeKey])

  const seekToTime = useCallback((timeMs: number) => {
    if (firstTime == null || lastTime == null) return
    const clamped = Math.max(firstTime, Math.min(lastTime, timeMs))
    timeRef.current = clamped
    setPlaybackTimeMs(clamped)
  }, [firstTime, lastTime])

  const seekToIndex = useCallback((index: number) => {
    const point = preparedPoints[Math.max(0, Math.min(preparedPoints.length - 1, index))]
    if (point) seekToTime(point.timeMs)
  }, [preparedPoints, seekToTime])

  const seekToPercent = useCallback((percent: number) => {
    if (firstTime == null || lastTime == null) return
    const clamped = Math.max(0, Math.min(100, percent))
    seekToTime(firstTime + ((lastTime - firstTime) * clamped) / 100)
  }, [firstTime, lastTime, seekToTime])

  useEffect(() => {
    if (!isPlaying || firstTime == null || lastTime == null || preparedPoints.length < 2) return

    const tick = (now: number) => {
      const previousNow = lastFrameAtRef.current ?? now
      lastFrameAtRef.current = now
      const deltaMs = Math.min(250, Math.max(0, now - previousNow)) * speed
      const current = timeRef.current ?? firstTime
      const next = Math.min(lastTime, current + deltaMs)
      timeRef.current = next
      setPlaybackTimeMs(next)

      if (next >= lastTime) {
        lastFrameAtRef.current = null
        onPlaybackEnd?.()
        return
      }
      rafRef.current = window.requestAnimationFrame(tick)
    }

    rafRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastFrameAtRef.current = null
    }
  }, [firstTime, isPlaying, lastTime, onPlaybackEnd, preparedPoints.length, speed])

  const frame = useMemo(
    () => (playbackTimeMs == null ? null : interpolatePlaybackFrame(preparedPoints, playbackTimeMs)),
    [preparedPoints, playbackTimeMs],
  )
  const currentIndex = playbackTimeMs == null ? 0 : findIndexForTime(preparedPoints, playbackTimeMs)
  const progressPercent = firstTime == null || lastTime == null || lastTime === firstTime || playbackTimeMs == null
    ? 0
    : ((playbackTimeMs - firstTime) / (lastTime - firstTime)) * 100

  return { preparedPoints, frame, playbackTimeMs, currentIndex, progressPercent, seekToIndex, seekToPercent, seekToTime }
}