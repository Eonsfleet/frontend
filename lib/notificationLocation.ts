import { useEffect, useState } from 'react'
import { reverseGeocode } from '@/lib/gps'

type Bag = Record<string, unknown> | null | undefined

const LAT_KEYS = ['latitude', 'lat']
const LNG_KEYS = ['longitude', 'lng', 'lon', 'long']
const NESTED_KEYS = ['location', 'position', 'last_location', 'last_known_location', 'coordinates', 'gps']

const num = (v: unknown): number | null => {
    const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
    return Number.isFinite(n) ? n : null
}

function pick(bag: Bag, keys: string[]): number | null {
    if (!bag || typeof bag !== 'object') return null
    for (const k of keys) {
        const n = num(bag[k])
        if (n != null) return n
    }
    return null
}

/** Finds a lat/lng pair in a notification payload (top level or nested location objects). */
export function extractCoords(data: Bag): { lat: number; lng: number } | null {
    if (!data || typeof data !== 'object') return null
    const candidates: Bag[] = [data, ...NESTED_KEYS.map((k) => data[k] as Bag)]
    for (const c of candidates) {
        const lat = pick(c, LAT_KEYS)
        const lng = pick(c, LNG_KEYS)
        if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
            return { lat, lng }
        }
    }
    return null
}

/** Resolves the exact address for a notification payload, or null while loading / if it has no coordinates. */
export async function resolveNotificationAddress(data: Bag): Promise<string | null> {
    const coords = extractCoords(data)
    if (!coords) return null
    const address = await reverseGeocode(coords.lat, coords.lng)
    return address && address !== 'Location unavailable' ? address : null
}

export function useNotificationAddress(data: Bag): string | null {
    const [address, setAddress] = useState<string | null>(null)
    const coords = extractCoords(data)
    const key = coords ? `${coords.lat},${coords.lng}` : null

    useEffect(() => {
        if (!coords) return
        let cancelled = false
        resolveNotificationAddress(data).then((a) => {
            if (!cancelled) setAddress(a)
        })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    return address
}

export const withLocation = (body: string, address: string | null) =>
    address && !body.includes(address) ? `${body}\nLocation: ${address}` : body
