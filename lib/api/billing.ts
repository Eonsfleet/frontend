import apiClient from './client'
import type { DunningStage, PlanTier, GatedModule } from '@/store/subscriptionStore'

export interface OrganizationSubscription {
    id: number
    status: 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired'
    dunning_stage: DunningStage
    plan: { id: number; name: string; tier: PlanTier; price: number }
    enabled_modules: GatedModule[]
    vehicle_limit: number
    vehicle_count: number
    starts_at: string
    ends_at: string | null
}

const FEATURE_OVERRIDES: Record<number, GatedModule[]> = {
    // Example: Organization 1001 gets everything regardless of plan
    // 1001: ['maintenance', 'incidents', 'geofencing', 'fuel_management', 'reporting', 'analytics', 'webhooks'],
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
            }
        }
    }
}

export const getOrganizationSubscription = async (): Promise<OrganizationSubscription> => {
    const response = await apiClient.get<SubscriptionApiResponse>('/subscriptions/organization/current')

    const rawData = response.data.data
    const planName = rawData.relationships.plan.name

    let tier: PlanTier = 'starter'
    const lName = planName.toLowerCase()
    if (lName.includes('growth')) tier = 'growth'
    if (lName.includes('enterprise')) tier = 'enterprise'

    let enabled_modules: GatedModule[] = []
    if (tier === 'starter') {
        enabled_modules = ['maintenance', 'incidents']
    } else if (tier === 'growth') {
        enabled_modules = ['maintenance', 'incidents', 'geofencing', 'fuel_management', 'reporting']
    } else {
        enabled_modules = ['maintenance', 'incidents', 'geofencing', 'fuel_management', 'reporting', 'analytics', 'webhooks']
    }

    // Apply Overrides if any
    const overrides = FEATURE_OVERRIDES[rawData.attributes.organization_id]
    if (overrides) {
        enabled_modules = Array.from(new Set([...enabled_modules, ...overrides]))
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
        enabled_modules,
        vehicle_limit: 100,
        vehicle_count: 0,
        starts_at: rawData.attributes.started_at,
        ends_at: rawData.attributes.ended_at
    }
}
