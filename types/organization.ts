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
