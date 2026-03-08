import apiClient from './client'
import type { DunningStage, PlanTier, Capability } from '@/store/subscriptionStore'

export interface OrganizationSubscription {
    id: number
    status: 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired'
    dunning_stage: DunningStage
    plan: { id: number; name: string; tier: PlanTier; price: number }
    capabilities: Capability[]
    vehicle_limit: number
    vehicle_count: number
    starts_at: string
    ends_at: string | null
}

const FEATURE_OVERRIDES: Record<number, Capability[]> = {
    // Example: Organization 1001 gets everything regardless of plan
    // 1001: ['maintenance', 'incidents', 'geofence', 'fuel', 'reporting', 'analytics', 'webhooks'],
}

export interface SubscriptionApiResponse {
    message: string
    data: {
        id: number
        attributes: {
            started_at: string
            ended_at: string | null
            organization_id: number
            status: 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired'
        }
        relationships: {
            plan: {
                id: number
                name: string
                core_modules?: { name: string; slug: string }[]
                advanced_capabilities?: { name: string; slug: string }[]
            }
        }
    }
}

export const getOrganizationSubscription = async (): Promise<OrganizationSubscription> => {
    const response = await apiClient.get<SubscriptionApiResponse>('/subscriptions/organization/current')

    const rawData = response.data.data
    const planName = rawData.relationships.plan.name

    const lName = planName.toLowerCase()
    let tier: PlanTier = 'starter'
    if (lName.includes('growth')) tier = 'growth'
    if (lName.includes('enterprise')) tier = 'enterprise'

    // Extract capabilities from API if available
    const planCaps = rawData.relationships.plan
    let capabilities: Capability[] = []

    if (planCaps.core_modules || planCaps.advanced_capabilities) {
        const caps = [
            ...(planCaps.core_modules || []),
            ...(planCaps.advanced_capabilities || [])
        ].map(m => m.slug as Capability)
        capabilities = Array.from(new Set(caps))
    } else {
        // Fallback for older API or hardcoded logic
        if (tier === 'starter') {
            capabilities = ['maintenance', 'incidents', 'vehicles', 'drivers', 'trips']
        } else if (tier === 'growth') {
            capabilities = [
                'maintenance', 'incidents', 'geofence', 'fuel', 'reporting',
                'vehicles', 'drivers', 'trips', 'analytics'
            ]
        } else {
            capabilities = [
                'maintenance', 'incidents', 'geofence', 'fuel', 'reporting',
                'analytics', 'webhooks', 'vehicles', 'drivers', 'trips',
                'custom_roles', 'fuel_card_va', 'notification_delegation'
            ]
        }
    }

    // Apply Overrides if any
    const overrides = FEATURE_OVERRIDES[rawData.attributes.organization_id]
    if (overrides) {
        capabilities = Array.from(new Set([...capabilities, ...overrides]))
    }

    return {
        id: rawData.id,
        status: rawData.attributes.status,
        dunning_stage: null,
        plan: {
            id: rawData.relationships.plan.id,
            name: planName,
            tier: tier,
            price: 0,
        },
        capabilities,
        vehicle_limit: 100,
        vehicle_count: 0,
        starts_at: rawData.attributes.started_at,
        ends_at: rawData.attributes.ended_at
    }
}
