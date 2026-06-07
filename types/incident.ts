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
        location?: string | { lat: number; lng: number; address?: string } | null
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
