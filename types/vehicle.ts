export interface Device {
    id: number
    serial_number: string
    imei?: string
    status: 'active' | 'inactive' | 'offline'
}

export interface VehicleAttributes {
    uuid: string
    make: string
    model: string
    image: string | null
    odometer: {
        at_join_km: number
        lifetime_km: number
        today_km: number
        source: 'device_native' | 'haversine' | null
    } | null
    chasis_number: string
    registration_number: string
    display_number: string
    device_id: string | null
    tracker_id?: string | null
    body_type: string
    color: string
    fuel_type: string
    status: 'active' | 'inactive' | 'in_transit' | 'maintenance'
    year: string | number
    type?: string
    odometer_when_join?: number
    gvm?: number
    fuel_capacity?: number
    fuel_capacity_unit?: string
    fuel_sensor_conversion_factor?: number
    tire_psi?: {
        front_left: number
        front_right: number
        rear_left: number
        rear_right: number
    }
    organization: string
    organization_id: number
    in_transit: Record<string, unknown> | null
    updated_at: string
    /** Online state — now a first-class field on all list responses */
    is_online?: boolean
    device_online?: boolean
    /** Device connectivity status (e.g. "active", "inactive") */
    device_status?: string | null
    device_connected?: boolean
    speed?: number | string | null
    coordinates?: { latitude?: number | string | null; longitude?: number | string | null } | null
    is_assigned_to_driver?: boolean
    /** Timestamp of last telemetry packet — moved from device relationship to attributes */
    last_packet_received_at?: string | null
    deviceStatus?: string
}

export interface Cluster {
    id: string
    attributes: {
        name: string
        description: string | null
        total_vehicles: number
        total_users: number
        manager: string | null
        created_at: string
        updated_at: string
        // For creation/form handling
        manager_id?: string | number
        user_ids?: (string | number)[]
        vehicle_ids?: (string | number)[]
    }
}

export interface VehicleCurrentLocation {
    latitude: number | null
    longitude: number | null
    speed: number | null
    heading: number | null
    angle?: number | null
    status: string
    ignition: 'on' | 'off' | '1' | '0' | boolean | null
    movement: 'on' | 'off' | '1' | '0' | boolean | null
    fuel_level_percent: number | null
    fuel_level_liters: number | null
    odometer: number | null
    altitude: number | null
    satellites: number | null
    address: string | null
    gps_datetime: string | null
    updated_at?: string | null
    engine_temperature?: number | null
    engine_rpm?: number | null
    engine_rpm_obd?: number | null
    battery_voltage?: number | null
    battery_current?: number | null
    external_voltage?: number | null
    fuel_rate?: number | null
    fuel_rate_gps?: number | null
    fuel_consumed?: number | null
    fuel_used_gps?: number | null
    fuel_level_obd?: number | null
    fuel_source?: string | null
    eco_score?: number | null
    idling?: boolean | null
    jamming?: boolean | null
    immobilizer?: boolean | null
    unplug?: boolean | null
    sleep_mode?: boolean | null
    driving_state?: string | null
    odometer_source?: string | null
    protocol_name?: string | null
    total_odometer?: number | null
    total_mileage?: number | null
    trip_odometer?: number | null
    load_weight?: number | null
    oil_level?: number | null
    door_status?: string | null
    confidence?: number | null
    metadata?: {
        engine_temperature?: number
        engine_rpm?: number
        battery_voltage?: number
        external_voltage?: number
        fuel_rate_gps?: number
        eco_score?: number
        idling?: boolean
        jamming?: boolean
        immobilizer?: boolean
        driving_state?: string
        [key: string]: unknown
    }
}

/** Device relationship — API returns fields directly (not JSON:API wrapped) */
export interface VehicleDevice {
    id?: string
    imei?: string
    serial_number?: string
    status?: string
    has_fuel?: boolean
    phone?: string
    country?: string
    /** @deprecated Moved to VehicleAttributes.is_online; may still appear on detail endpoint responses */
    is_online?: boolean
    /** Fallback: some responses still use JSON:API data wrapper */
    data?: { id: string; type: 'devices'; imei?: string; serial_number?: string }
}

/**
 * Flat location shape returned by the updated vehicle listing endpoint.
 * Only basic position + timestamp — rich telemetry comes from WebSocket packets.
 */
export interface VehicleRestLocation {
    latitude?: number | null
    longitude?: number | null
    speed?: number | null
    protocol_type?: string | null
    last_packet_received_at?: string | null
    created_at?: string | null
}

export interface Vehicle {
    id: string
    attributes: VehicleAttributes
    relationships: {
        driver?: { data: { id: string; type: 'users'; name?: string } }
        cluster?: { id: string; type: 'clusters'; name?: string  }
        device?: VehicleDevice | null
        /** Assigned driver — object when assigned, empty array when unassigned */
        current_driver?:
            | { id: number | string; name: string; avatar?: string | null; assigned_date?: string }
            | Array<{ id: string; attributes?: Record<string, unknown> }>
            | null
        current_location?: VehicleRestLocation | null
    }
}

/** Shape of `.current.recent` packets from the location WebSocket channel */
export interface VehicleTelemetry {
    vehicle_id: string
    latitude: number
    longitude: number
    speed: number
    heading: number
    status: string
    fuel_level_percent: number
    fuel_level_liters: number
    gps_datetime: string
    /** Server-side packet ingestion time — prefer this over gps_datetime (device clock, can be wrong before GPS fix) for "last update" displays. */
    timestamp_utc?: string
    address: string
    /** Can be "on"/"off"/"1"/"0" or boolean depending on device protocol */
    ignition: string | boolean
    movement: string
    odometer: number
    // Optional fields — presence depends on device capabilities / protocol
    altitude?: number
    satellites?: number
    engine_rpm?: number
    engine_rpm_obd?: number
    oil_level?: number
    fuel_rate?: number
    fuel_consumed?: number
    fuel_used_gps?: number
    fuel_level_obd?: number
    fuel_source?: string
    eco_score?: number
    idling?: boolean
    jamming?: boolean
    immobilizer?: boolean
    unplug?: boolean
    sleep_mode?: string | boolean
    door_status?: string
    load_weight?: number
    driving_state?: string
    battery_voltage?: number
    external_voltage?: number
    battery_current?: number
    engine_temperature?: number
    rssi?: number
    hdop?: number
    total_mileage?: number
    trip_odometer?: number
    odometer_source?: string
    protocol_name?: string
    confidence?: number
    metadata?: {
        engine_rpm?: number
        engine_rpm_obd?: number
        engine_temperature?: number
        battery_voltage?: number
        external_voltage?: number
        battery_current?: number
        oil_level?: number
        fuel_rate?: number
        fuel_rate_gps?: number
        fuel_consumed?: number
        fuel_used_gps?: number
        fuel_level_obd?: number
        fuel_source?: string
        eco_score?: number
        idling?: boolean
        jamming?: boolean
        immobilizer?: boolean
        unplug?: boolean
        sleep_mode?: string | boolean
        door_status?: string
        load_weight?: number
        driving_state?: string
        rssi?: number
        hdop?: number
        mileage?: number
        trip_odometer?: number
        odometer_source?: string
        protocol_name?: string
        confidence?: number
        [key: string]: unknown
    }
}

export interface VehiclePayload {
    make: string
    model: string
    registration_number: string
    chasis_number?: string
    display_number?: string
    body_type: string
    color: string
    fuel_type: string
    year: string | number
    type?: string
    image?: string | null
    device_id?: string | null
    odometer_when_join?: number
    gvm?: number
    fuel_capacity?: number
    fuel_capacity_unit?: string
    fuel_sensor_conversion_factor?: number
    tire_psi?: VehicleAttributes['tire_psi']
}
