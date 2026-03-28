export interface TripAttributes {
    trip_number: string
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'pending'
    start_location: {
        name: string
        coords: { latitude: number; longitude: number }
    }
    end_location: {
        name: string
        coords: { latitude: number; longitude: number }
    }
    planned_start_time: string
    planned_end_time: string | null
    eta: string | null
    recurring_type: 'one_time' | 'daily' | 'weekly' | 'monthly'
    series_id: string | null
    occurrence_number: number
    is_master_trip: boolean
    is_locked: boolean
    is_editable: boolean
    vehicle_id?: string
    driver_id?: string
    /** @deprecated Use relationships.vehicle.id instead */
    vehicleId?: string | number
    created_at?: string
    routes?: Array<{
        route_order: number
        location_name: string
        coordinates: {
            latitude: number
            longitude: number
        }
        expected_arrival_time: string
        is_checkpoint: boolean
        is_stop_point: boolean
    }>
    updated_at?: string
}

export interface Trip {
    id: string
    attributes: TripAttributes
    relationships: {
        /** API returns vehicle fields directly (not JSON:API data-wrapped) */
        vehicle?: { id: string; type?: string; registration_number?: string }
        driver?: { data: { id: string; type: 'users' } }
    }
}

export interface CreateTripPayload {
    vehicle_id?: string
    driver_id?: string
    start_location: {
        name: string
        coords: { latitude: number; longitude: number }
    }
    end_location: {
        name: string
        coords: { latitude: number; longitude: number }
    }
    planned_start_time: string
    planned_end_time?: string | null
    eta?: string | null
    recurring_type?: 'one_time' | 'daily' | 'weekly' | 'monthly'
    routes?: TripAttributes['routes']
}
