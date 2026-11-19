'use client'

import { useEffect, useState } from 'react'
import { reverseGeocode } from '@/lib/gps'

const cache = new Map<string, string>()
const key = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`

/** Lazy reverse-geocode for a static point (trip start/end, stops). Falls back to coordinates. */
export function useAddress(point: { lat: number; lng: number } | null | undefined): string {
  const k = point ? key(point.lat, point.lng) : null
  const [resolved, setResolved] = useState<{ k: string; text: string } | null>(null)

  useEffect(() => {
    if (!point || !k || process.env.NODE_ENV === 'test' || cache.has(k)) return
    let cancelled = false
    reverseGeocode(point.lat, point.lng)
      .then((text) => {
        cache.set(k, text)
        if (!cancelled) setResolved({ k, text })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [k, point])

  if (!point || !k) return '—'
  return cache.get(k) ?? (resolved?.k === k ? resolved.text : `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`)
}
