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

export interface SubscriptionResponse {
    data: OrganizationSubscription
    status: number
    message: string
}

export const getOrganizationSubscription = async (): Promise<OrganizationSubscription> => {
    const response = await apiClient.get<SubscriptionResponse>('/subscriptions/organization/current')
    return response.data.data
}
