'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { reverseGeocode } from '@/lib/gps'
import type { PlaybackFrame, PlaybackPreparedPoint } from '@/lib/playback/interpolation'

const addressCache = new Map<string, string>()
const pendingAddressKeys = new Set<string>()
const isTestEnvironment = process.env.NODE_ENV === 'test'

function keyFor(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

export function usePlaybackAddress(frame: PlaybackFrame | null, preparedPoints: PlaybackPreparedPoint[], isPlaying: boolean) {
  const [resolved, setResolved] = useState<{ key: string; address: string } | null>(null)
  const activeRequestRef = useRef(0)
  const key = frame ? keyFor(frame.lat, frame.lng) : null
  const lat = frame ? Number(frame.lat.toFixed(5)) : null
  const lng = frame ? Number(frame.lng.toFixed(5)) : null

  useEffect(() => {
    if (isTestEnvironment || !key || lat == null || lng == null) return
    if (addressCache.has(key) || pendingAddressKeys.has(key)) return

    const requestId = activeRequestRef.current + 1
    activeRequestRef.current = requestId
    const timeout = window.setTimeout(() => {
      pendingAddressKeys.add(key)
      reverseGeocode(lat, lng)
        .then((result) => {
          addressCache.set(key, result)
          if (activeRequestRef.current === requestId) setResolved({ key, address: result })
        })
        .catch(() => {
          if (activeRequestRef.current === requestId) setResolved({ key, address: 'Location unavailable' })
        })
        .finally(() => pendingAddressKeys.delete(key))
    }, isPlaying ? 650 : 150)

    return () => window.clearTimeout(timeout)
  }, [isPlaying, key, lat, lng])

  useEffect(() => {
    if (isTestEnvironment || !isPlaying || !frame || preparedPoints.length === 0) return
    const upcoming = preparedPoints.slice(frame.index + 1, frame.index + 4)
    upcoming.forEach((point, offset) => {
      const upcomingKey = keyFor(point.lat, point.lng)
      if (addressCache.has(upcomingKey) || pendingAddressKeys.has(upcomingKey)) return
      const upcomingLat = Number(point.lat.toFixed(5))
      const upcomingLng = Number(point.lng.toFixed(5))
      window.setTimeout(() => {
        if (addressCache.has(upcomingKey) || pendingAddressKeys.has(upcomingKey)) return
        pendingAddressKeys.add(upcomingKey)
        reverseGeocode(upcomingLat, upcomingLng)
          .then((result) => addressCache.set(upcomingKey, result))
          .catch(() => undefined)
          .finally(() => pendingAddressKeys.delete(upcomingKey))
      }, 1200 + offset * 600)
    })
  }, [frame, isPlaying, preparedPoints])

  return useMemo(() => {
    if (!frame || !key) return 'No location selected'
    if (isTestEnvironment) return `${frame.lat.toFixed(5)}, ${frame.lng.toFixed(5)}`
    const cached = addressCache.get(key)
    if (cached) return cached
    if (resolved?.key === key) return resolved.address
    return `${frame.lat.toFixed(5)}, ${frame.lng.toFixed(5)}`
  }, [frame, key, resolved])
}