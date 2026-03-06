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
        role: Role
        joined_date: string | null
    }
    relationships: {
        address: any | null
        organization: Organization | null
    }
}

export interface Organization {
    id: number
    name: string
    identifier?: string
    subdomain?: string
    slug?: string | null
    domain?: string | null
}

export type Role =
    | 'administrator'
    | 'fleet_manager'
    | 'dispatcher'
    | 'driver'
    | 'mechanic'
    | 'finance'
    | 'compliance'
    | 'vendor'

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
    body_type: string
    color: string
    fuel_type: string
    status: 'active' | 'inactive' | 'in_transit' | 'maintenance'
    year: string
    organization: string
    organization_id: number
    in_transit: any | null
    updated_at: string
}

export interface Vehicle {
    id: string
    attributes: VehicleAttributes
    relationships: any[]
}

export interface TripAttributes {
    trip_number: string
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
    start_location: string | { name: string; coords?: any }
    end_location: string | { name: string; coords?: any }
    planned_start_time: string
    planned_end_time: string | null
    eta: string | null
    recurring_type: 'none' | 'daily' | 'weekly' | 'monthly'
    series_id: string | null
    occurrence_number: number
    is_master_trip: boolean
    is_locked: boolean
    is_editable: boolean
    vehicle_id?: string
    driver_id?: string
    updated_at?: string
}

export interface Trip {
    id: string
    attributes: TripAttributes
    relationships: {
        vehicle?: { data: { id: string; type: 'vehicles' } }
        driver?: { data: { id: string; type: 'users' } }
    }
}

export interface MaintenanceSchedule {
    id: string
    attributes: {
        vehicle_id: string
        service_type: string
        last_service_date: string | null
        last_service_odometer: number | null
        next_service_date: string | null
        next_service_odometer: number | null
        status: 'upcoming' | 'overdue' | 'completed'
        notes: string | null
    }
}

export type MaintenanceJobStatus =
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'assigned'
    | 'in_progress'
    | 'completed'
    | 'verified'
    | 'closed'

export interface MaintenanceJob {
    id: string
    attributes: {
        reference_number: string
        status: MaintenanceJobStatus
        priority: 'low' | 'medium' | 'high' | 'urgent'
        description: string
        scheduled_date: string
        completed_date: string | null
        total_cost: number
        labor_cost: number
        parts_cost: number
        odometer_at_service: number | null
    }
    relationships: {
        vehicle?: { data: { id: string; type: 'vehicles' } }
        assignee?: { data: { id: string, type: 'users' } }
    }
}

export interface MaintenanceAlert {
    id: string
    attributes: {
        type: string
        message: string
        severity: 'info' | 'warning' | 'critical'
        status: 'active' | 'acknowledged' | 'snoozed' | 'resolved'
        created_at: string
    }
    relationships: {
        vehicle: { data: { id: string, type: 'vehicles' } }
    }
}
