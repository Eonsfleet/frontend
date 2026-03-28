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
