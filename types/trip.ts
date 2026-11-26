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
    actual_start_time?: string | null
    actual_end_time?: string | null
    started_at?: string | null
    completed_at?: string | null
    eta: string | null
    estimated_time?: string | null
    recurring_type: 'one_time' | 'daily' | 'weekly' | 'monthly'
    recurring_end_date?: string | null
    parent_trip_id?: string | null
    series_id: string | null
    occurrence_number: number
    is_master_trip: boolean
    is_locked: boolean
    is_editable: boolean
    locked_at?: string | null
    vehicle_id?: string
    driver_id?: string
    /** @deprecated Use relationships.vehicle.id instead */
    vehicleId?: string | number
    
    // Additional fields from API
    pod_urls?: string | null
    pod_signature?: string | null
    distance_km?: string | number | null
    note?: string | null
    
    // Trip stats/metrics
    avg_speed?: number
    distance_covered_km?: number
    distance_remaining_km?: number
    current_load?: number
    max_load?: number
    load_category?: string
    
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
        organization?: {
            id: string
            attributes: {
                name: string
                email: string
                fleet_size?: number
                industry?: string
                logo?: string | null
                subdomain?: string
                custom_domain?: string | null
                phone?: string
                joined_date?: string
                identifier?: number
            }
            relationships?: any[]
        }
        /** API returns vehicle fields directly (not JSON:API data-wrapped) */
        vehicle?: { 
            id?: string | number
            // Flat properties (used in trip list)
            registration_number?: string
            make?: string
            model?: string
            // Nested properties (used in trip details)
            attributes?: {
                make?: string
                model?: string
                image?: string
                year?: string | number
                registration_number?: string
                display_number?: string
                chasis_number?: string
                body_type?: string
                type?: string
                color?: string
                device_id?: string
                status?: string | null
                device_status?: string | null
                is_online?: boolean
                device_connected?: boolean
                is_allocated?: boolean
                last_packet_received_at?: string | null
                fuel_type?: string
                fuel_capacity?: number
                fuel_capacity_unit?: string
                fuel_sensor_conversion_factor?: number | null
                odometer?: import('./odometer').VehicleOdometer | null
                tire_psi?: number | null
                gvm?: number | null
                created_at?: string
                updated_at?: string
            }
            relationships?: {
                device?: any
                current_driver?: any[]
            }
        } | null
        driver?: { 
            id?: string | number
            organization_id?: number
            // Flat properties (used in trip list)
            name?: string
            f_name?: string
            l_name?: string
            // Nested properties (used in trip details)
            attributes?: {
                first_name?: string
                last_name?: string
                full_name?: string
                employee_number?: string | null
                email?: string
                date_of_birth?: string | null
                age?: number | null
                phone_number?: string
                avatar?: string
                last_login?: string | null
                status?: string
                role?: string
                joined_date?: string
            }
            relationships?: any[]
        } | null
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
