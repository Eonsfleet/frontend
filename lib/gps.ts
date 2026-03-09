import axios from 'axios'

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

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
        // Using Nominatim (OpenStreetMap) for free reverse geocoding
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: {
                'User-Agent': 'Eonsfleet-Frontend/1.0'
            }
        })
        return response.data.display_name || 'Unknown Location'
    } catch (error) {
        console.error('Reverse geocoding error:', error)
        return 'Location unavailable'
    }
}
