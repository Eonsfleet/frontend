import { Address } from './common'
import { Organization } from './organization'

export type RoleSlug =
    | 'administrator'
    | 'fleet_manager'
    | 'dispatcher'
    | 'driver'
    | 'mechanic'
    | 'finance'
    | 'compliance'
    | 'vendor'

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
