/** Coordinate payload — shape depends on geofence type */
export type GeofenceCoordinates =
    | { lat: number; lng: number }                  // circle center
    | { type: string; coordinates: number[][][] }   // GeoJSON polygon geometry
    | number[][]                                    // legacy raw [lng, lat] pairs

export interface GeofenceSchedule {
    start_time?: string   // HH:mm
    end_time?: string     // HH:mm
    days?: number[]       // 0=Sun … 6=Sat
}

export interface GeofenceAlert {
    vehicle_id: string
    geofence_id?: string
    geofence_name?: string
    event_type: 'enter' | 'exit'
    timestamp: string
    latitude?: number
    longitude?: number
}

export interface Geofence {
    id: string
    attributes: {
        name: string
        description: string | null
        type: 'polygon' | 'circle'
        trigger_type: 'enter' | 'exit' | 'both'
        location?: string | null
        coordinates: GeofenceCoordinates
        radius?: number // Required if type is circle
        speed: number   // Speed limit threshold (km/h); 0 means no limit
        is_active: boolean
        schedule: GeofenceSchedule | null
    }
    relationships: {
        vehicles?: { data: { id: string; type: 'vehicles' }[] }
    }
}
