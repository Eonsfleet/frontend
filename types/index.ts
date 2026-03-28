export interface Address {
    street?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
}

export interface UserProfile {
    id: string
    attributes: {
        first_name: string
        last_name: string
        full_name: string
        employee_id: string | null
        email: string
        date_of_birth: string | null
        age: number | null
        phone_number: string | null
        avatar: string | null
        last_login: string | null
        status: string
        role: RoleSlug | RoleSlug[]
        joined_date: string | null
    }
    relationships: {
        address: Address | null
        organization: Organization | null
    }
}

export interface Organization {
    id: number | string
    attributes: {
        name: string
        email?: string
        fleet_size?: number
        industry?: string
        logo?: string
        subdomain?: string
        custom_domain?: string | null
        phone?: string
        joined_date?: string
        identifier?: number
        advanced_capabilities?: {
            notification_delegation?: boolean
            notification_groups?: boolean
            notification_routing?: boolean
            custom_roles?: boolean
            [key: string]: boolean | undefined
        }
    }
}

export type RoleSlug =
    | 'administrator'
    | 'fleet_manager'
    | 'dispatcher'
    | 'driver'
    | 'mechanic'
    | 'finance'
    | 'compliance'
    | 'vendor'

export interface SecurityRole {
    id: string
    attributes: {
        name: string
        summary: {
            total_users: number
        }
    }
    relationships: {
        permissions: {
            [key: string]: string
        }
    }
}

export interface Permission {
    id: string
    attributes: {
        name: string
        type: string
        created_at: string
    }
    relationships: {
        assigned_to: string[]
    }
}

export interface ApiError {
    message: string
    errors: Array<{
        status: string
        code: string
        title: string
        detail: string
        source?: { pointer: string }
    }>
}
export interface Paginated<T> {
    data: T[]
    pagination: {
        current: number
        lastPage: number
        last_page?: number   // API returns snake_case; prefer lastPage, fall back to last_page
        perPage: number
        total: number
        next_page_url: string | null
        prev_page_url: string | null
        from: number
    }
}

export interface Device {
    id: number
    serial_number: string
    imei?: string
    status: 'active' | 'inactive' | 'offline'
}

export interface VehicleAttributes {
    make: string
    model: string
    image: string | null
    total_odometer: number
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
    /** Denormalized online state sometimes included in list responses */
    is_online?: boolean
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
    status: string
    ignition: 'on' | 'off' | null
    movement: 'on' | 'off' | null
    fuel_level_percent: number | null
    fuel_level_liters: number | null
    odometer: number | null
    altitude: number | null
    satellites: number | null
    address: string | null
    gps_datetime: string | null
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
        [key: string]: any
    }
}

/** Device relationship — API returns fields directly (not JSON:API wrapped) */
export interface VehicleDevice {
    id?: string
    imei?: string
    serial_number?: string
    status?: string
    is_online?: boolean
    has_fuel?: boolean
    phone?: string
    country?: string
    last_packet_received_at?: string
    /** Fallback: some responses still use JSON:API data wrapper */
    data?: { id: string; type: 'devices'; imei?: string; serial_number?: string }
}

export interface Vehicle {
    id: string
    attributes: VehicleAttributes
    relationships: {
        driver?: { data: { id: string; type: 'users'; name?: string } }
        cluster?: { data: { id: string; type: 'clusters'; name?: string } }
        device?: VehicleDevice
        /** Current driver(s) embedded in list responses */
        current_driver?: Array<{ id: string; attributes: Record<string, unknown> }>
        /** Current location wrapped in JSON:API attributes envelope */
        current_location?: {
            attributes: VehicleCurrentLocation & {
                state?: string
                coordinates?: { latitude: number; longitude: number }
            }
        }
    }
}

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

export interface MaintenanceSchedule {
    id: string | number
    attributes: {
        schedule_type: 'time' | 'mileage' | string
        service_type: string
        interval_unit?: string
        interval_value?: number
        due_date: string
        description: string | null
        schedule_date?: string | null
        expected_odometer?: number | null
        status: 'pending' | 'active' | 'overdue' | 'completed' | 'cancelled' | string
        priority?: 'low' | 'medium' | 'high' | string
        turn_on_notification?: boolean
        last_scheduled_at?: string | null
        is_recurring?: boolean
        parent_schedule_id?: number | null
        series_id?: string | null
        occurrence_number?: number
        is_master_schedule?: boolean
        created_at: string
        updated_at?: string
        /** @deprecated Use relationships.vehicle instead */
        vehicle_id?: string | number
        /** @deprecated Use due_date instead */
        last_service_date?: string | null
        last_service_odometer?: number | null
        /** @deprecated Use due_date instead */
        next_service_date?: string | null
        next_service_odometer?: number | null
        /** @deprecated Use description instead */
        notes?: string | null
    }
    relationships?: {
        vehicle?: {
            id: number | string
            make?: string
            model?: string
            registration_number?: string
        }
        vendor?: { id: number | string; name?: string }
    }
}

export type MaintenanceJobStatus =
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'rejected'
    | 'in_progress'
    | 'pending_verification'
    | 'verified'
    | 'closed'
    | 'cancelled'

export interface MaintenanceJobVehicle {
    id: number | string
    make?: string
    model?: string
    registration_number?: string
}

export interface MaintenanceJobPerson {
    id: number | string
    f_name?: string
    l_name?: string
    name?: string
}

export interface MaintenanceJob {
    id: string
    attributes: {
        // PRD primary fields
        reference: string
        title?: string
        fault_category?: string
        status: MaintenanceJobStatus
        priority: 'low' | 'medium' | 'high' | 'urgent'
        description: string
        cost_estimate?: number | null
        actual_cost?: number | null
        currency?: string
        started_at?: string | null
        completed_at?: string | null
        created_at?: string
        /** @deprecated Use reference instead */
        reference_number?: string
        /** @deprecated Use started_at instead */
        scheduled_date?: string
        /** @deprecated Use completed_at instead */
        completed_date?: string | null
        /** @deprecated Use actual_cost instead */
        total_cost?: number
        labor_cost?: number
        parts_cost?: number
        odometer_at_service?: number | null
    }
    relationships: {
        vehicle?: MaintenanceJobVehicle | { data: { id: string; type: 'vehicles' } }
        driver?: MaintenanceJobPerson | { data: { id: string; type: 'users' } }
        vendor?: { id: number | string; name?: string }
        assigned_by?: MaintenanceJobPerson
        assignee?: { data: { id: string; type: 'users' } }
    }
}

export interface MaintenanceAlert {
    id: string
    attributes: {
        alert_type: 'approaching' | 'overdue'
        threshold_type: 'time' | 'mileage'
        status: 'triggered' | 'acknowledged' | 'snoozed' | 'overdue' | 'work_order_created' | 'closed'
        snooze_count?: number
        snooze_expires_at?: string | null
        triggered_at?: string
        acknowledged_at?: string | null
        created_at: string
    }
    relationships: {
        vehicle: {
            id: number | string
            make?: string
            model?: string
            registration_number?: string
        }
        schedule?: {
            id: number | string
            service_type?: string
            schedule_type?: string
            due_date?: string
        }
        maintenance_job?: { id: number | string } | null
    }
}

export interface MaintenanceLog {
    id: string | number
    attributes: {
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'verified'
        progress_percent?: number
        started_at?: string | null
        completed_at?: string | null
        notes?: string | null
        created_at: string
        updated_at: string
    }
    relationships: {
        schedule?: {
            id: number | string
            service_type?: string
            due_date?: string
        }
        vehicle?: {
            id: number | string
            make?: string
            model?: string
            registration_number?: string
        }
        vendor?: { id: number | string; name?: string }
        technician?: { id: number | string; f_name?: string; l_name?: string }
    }
}

export interface MaintenancePart {
    id: string | number
    attributes: {
        name: string
        quantity: number
        unit_price_kobo: number
        supplier?: string | null
        created_at?: string
    }
}

export interface MaintenanceCostSummary {
    cost_estimate: number
    actual_cost: number | null
    parts_cost: number
    labor_cost: number
    variance: number | null
    currency: string
}

export interface ConversationMessage {
    id: number | string
    body: string
    sender_id: number | string
    sender_role?: string
    sender_name?: string
    is_internal: boolean
    created_at: string
}

export interface WorkflowHistoryEntry {
    id: number | string
    from_status: string
    to_status: string
    actor_id: number | string
    actor_role?: string
    actor_name?: string
    reason: string | null
    created_at: string
}

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

export type IncidentStatus =
    | 'reported'
    | 'under_investigation'
    | 'action_required'
    | 'action_taken'
    | 'pending_resolution'
    | 'resolved'
    | 'closed'
    | 'cancelled'
    | 'escalated'
    | 'dismissed'

export interface IncidentPerson {
    id: number | string
    f_name?: string
    l_name?: string
    name?: string
    avatar?: string | null
}

export interface IncidentVehicle {
    id: number | string
    make?: string
    model?: string
    registration_number?: string
}

export interface Incident {
    id: string
    attributes: {
        reference_number?: string
        // PRD response fields
        victim_name?: string
        type: string
        status: IncidentStatus
        priority: 'low' | 'medium' | 'high' | 'critical'
        description: string
        // Location — PRD sends coords as "lat,lng" string, legacy sends object
        coords?: string
        location?: { lat: number; lng: number; address?: string } | null
        occured_date?: string
        occured_time?: string
        media?: string[]
        witness?: Array<{ name: string; phone: string; statement?: string }>
        action_taken?: string | null
        resolved_notes?: string | null
        reported_at: string
        resolved_at?: string | null
        created_at?: string
    }
    relationships: {
        vehicle?: IncidentVehicle | { data: { id: string; type: 'vehicles' } }
        driver?: IncidentPerson | { data: { id: string; type: 'users' } }
        reported_by?: IncidentPerson | { data: { id: string; type: 'users' } }
        assignee?: IncidentPerson | { data: { id: string; type: 'users' } }
        address?: { street?: string; state?: string; city?: string }
    }
}

// ── Form Payload Types ───────────────────────────────────────────────────────

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

export interface DriverPayload {
    f_name: string
    l_name: string
    email: string
    phone_number?: string | null
    date_of_birth?: string | null
    employee_id?: string | null
    avatar?: string | null
    role?: RoleSlug
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

// ── Real-time WebSocket Packet Types ─────────────────────────────────────────

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

// ── Fuel Management ─────────────────────────────────────────────────────────

export type FuelExpenseStatus = 'pending_approval' | 'approved' | 'rejected' | 'reimbursed'
export type FuelSource = 'manual' | 'card'

export interface FuelExpense {
    id: string | number
    attributes: {
        entry_date: string
        volume: number
        cost_per_volume: number
        amount: number
        currency: string
        purchase_from: string | null
        reference_number: string | null
        status: FuelExpenseStatus
        source?: FuelSource
        approved_at: string | null
        rejection_reason?: string | null
    }
    relationships: {
        vehicle: { id: number; registration_number: string; make: string; model: string }
        driver: { id: number; name: string; email: string }
    }
}

export interface FuelExpenseMetrics {
    total_volume: number
    total_cost: number
    average_cost_per_liter: number
    pending_count: number
    approved_count: number
}

export interface FuelCardProviderType {
    slug: 'ovh' | 'total' | 'generic_csv'
    label: string
}

export interface FuelCardVehicle {
    id: number
    registration_number: string
    make: string
    model: string
    card_status: 'requested' | 'issued' | 'blocked'
    card_number_last4: string | null
    assigned_at: string
}

export interface FuelCardAccount {
    id: number
    provider_type: 'ovh' | 'total' | 'generic_csv'
    account_name: string
    virtual_account_number: string | null
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    vehicle_count_requested: number
    status: 'pending' | 'active' | 'suspended' | 'rejected'
    activated_at: string | null
    rejection_reason: string | null
    requested_at: string
    requester: { id: number; name: string }
    vehicles: FuelCardVehicle[]
    metadata: Record<string, unknown> | null
}

export interface FuelCardProvider {
    id: string
    attributes: {
        name: string
        provider_type: 'ovh' | 'total' | 'generic_csv'
        api_key_configured: boolean
        last_sync_at: string | null
        auto_sync_enabled: boolean
        status: 'active' | 'inactive' | 'error'
    }
}

export interface FuelCardTransaction {
    id: string
    attributes: {
        external_id: string
        card_number_last4: string
        merchant_name: string
        amount: number
        volume_liters: number
        currency: string
        transaction_date: string
        jurisdiction_code: string | null
        vehicle_id: number | null
        fuel_expense_id: number | null
        status: 'unmatched' | 'matched' | 'linked'
        provider: string
    }
    relationships: Record<string, unknown>
}

export interface FuelReconciliationDiscrepancy {
    id: string
    attributes: {
        merchant_name: string
        volume_liters: number
        amount: number
        transaction_date: string
        vehicle_id: number | null
        fuel_expense_id: number | null
        status: 'needs_review' | 'disputed' | 'resolved'
        provider: string
    }
}

export interface FuelReconciliationReport {
    period: { start: string; end: string }
    summary: {
        matched_count: number
        unmatched_transactions_count: number
        unmatched_expenses_count: number
        variance_flagged_count: number
    }
    matched: Array<{
        id: number
        attributes: { type: string; amount_liters: number; occurred_at: string; fuel_expense_id: number }
        relationships: { vehicle: { id: number; registration_number: string } }
    }>
    unmatched_transactions: FuelCardTransaction[]
    unmatched_expenses: FuelExpense[]
    variance_flagged: Array<{
        transaction: { id: number; attributes: { amount_liters: number } }
        expense: { id: number; attributes: { volume: number } }
        variance_percent: number
        device_liters: number
        manual_liters: number
    }>
}

export interface FuelVehicle {
    id: number
    attributes: {
        registration_number: string
        make: string
        model: string
        fuel_type: string
        fuel_capacity: number
        device_imei: string | null
        device_online: boolean
    }
    fuel_level: {
        fuel_level_liters: number
        fuel_level_percent: number
        last_updated: string
        tank_capacity: number
        data_quality_score: number
    } | null
}

export interface FuelAbnormality {
    id: number
    attributes: {
        fuel_transaction_id: number | null
        alert_time: string
        type: 'theft' | 'sudden_drop' | 'low_fuel' | 'refuel' | 'sensor_malfunction'
        previous_fuel_level: number
        current_fuel_level: number
        difference: number
        unit: string
        location: { lat: number; lng: number; address: string } | null
        confidence: number
        status: 'active' | 'acknowledged' | 'resolved' | 'false_positive'
        acknowledged_by: number | null
        acknowledged_at: string | null
        resolved_by: number | null
        resolved_at: string | null
        resolution_notes: string | null
    }
    relationships: {
        vehicle: { id: number; name: string | null; registration_number: string }
    }
}

export interface FuelSettings {
    low_fuel_threshold_percent: number
    low_fuel_alert_enabled: boolean
    sensor_malfunction_alert_enabled: boolean
    sensor_malfunction_invalid_count: number
    alert_deduplication_hours: number
}

export interface Webhook {
    id: string | number
    url: string
    description: string | null
    events: string[]
    status: 'active' | 'inactive'
    secret_key?: string
    failure_count: number
    last_failure_at: string | null
    created_at: string
    updated_at?: string
}

export interface WebhookDelivery {
    id: string | number
    event_type: string
    response_code: number
    response_body: string | null
    payload: Record<string, unknown>
    duration_ms: number
    created_at: string
}

export interface NotificationGroup {
    id: string | number
    name: string
    description: string | null
    created_at: string
    relationships?: {
        users?: { data: { id: string; type: 'users'; name?: string }[] }
    }
}

export interface NotificationRule {
    id: string | number
    event_type: string
    channel_types: ('email' | 'sms' | 'push' | 'in_app')[]
    is_active: boolean
    condition?: string
    created_at: string
    relationships?: {
        recipient_groups?: { data: { id: string; type: 'notification_groups'; name?: string }[] }
    }
}

export interface NotificationDelegation {
    id: string | number
    event_types: string[]
    expires_at: string
    created_at: string
    relationships?: {
        delegated_to: { data: { id: string; type: 'users'; name?: string } }
        delegated_by: { data: { id: string; type: 'users'; name?: string } }
    }
}


