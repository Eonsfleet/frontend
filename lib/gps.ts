import axios from 'axios'
import { getGoogleMapsKey } from '@/lib/map/google'

export interface GpsPacket {
    latitude: number
    longitude: number
    speed: number
    course: number
    ignition: boolean
    movement: boolean
    fuel_level_percent: number
    fuel_level_liters: number
    odometer: number
    timestamp: string
    address?: string
    status: string
}

export const normalizeGpsPacket = (data: any): GpsPacket => {
    const location = data.location || {}
    const attributes = data.attributes || {}

    return {
        latitude: Number(location.latitude) || 0,
        longitude: Number(location.longitude) || 0,
        speed: Number(location.speed) || 0,
        course: Number(location.heading) || 0,
        ignition: location.ignition === 'on' || attributes.ignition === 'on',
        movement: location.movement === 'on' || attributes.movement === 'on',
        fuel_level_percent: Number(location.fuel_level_percent) || 0,
        fuel_level_liters: Number(location.fuel_level_liters) || 0,
        odometer: Number(location.odometer) || 0,
        timestamp: location.timestamp_utc || location.gps_datetime || new Date().toISOString(),
        address: location.address || null,
        status: location.status || data.device?.status || 'offline'
    }
}

const geocodeCache = new Map<string, Promise<string>>()

/** ~11 m: nearby fixes share one lookup instead of one request per GPS packet. */
const geocodeKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`

async function googleReverse(lat: number, lng: number, key: string): Promise<string | null> {
    const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { latlng: `${lat},${lng}`, key, language: 'en', result_type: 'street_address|route|premise|neighborhood|locality' },
    })
    // OVER_QUERY_LIMIT / REQUEST_DENIED / ZERO_RESULTS: let the caller fall back to the free service.
    if (res.data?.status !== 'OK') return null
    return res.data.results?.[0]?.formatted_address ?? null
}

async function nominatimReverse(lat: number, lng: number): Promise<string> {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
    return response.data.display_name || 'Unknown Location'
}

/**
 * Coordinates -> address. Google Geocoding when a key is configured, otherwise (or if Google
 * refuses) the free Nominatim service. Results are cached per ~11 m cell for the session.
 */
export const reverseGeocode = (lat: number, lng: number): Promise<string> => {
    const key = geocodeKey(lat, lng)
    const cached = geocodeCache.get(key)
    if (cached) return cached

    const request = (async () => {
        try {
            const googleKey = getGoogleMapsKey()
            if (googleKey) {
                try {
                    const address = await googleReverse(lat, lng, googleKey)
                    if (address) return address
                } catch {
                    /* fall through to Nominatim */
                }
            }
            return await nominatimReverse(lat, lng)
        } catch (error) {
            console.error('Reverse geocoding error:', error)
            geocodeCache.delete(key)
            return 'Location unavailable'
        }
    })()
    geocodeCache.set(key, request)
    return request
}
