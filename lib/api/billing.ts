import apiClient from './client'
import type { DunningStage, PlanTier, Capability } from '@/store/subscriptionStore'

export interface OrganizationSubscription {
    id: number
    status: 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired'
    dunning_stage: DunningStage
    plan: { id: number; name: string; tier: PlanTier; price: number }
    capabilities: Capability[]
    vehicle_limit: number | null
    user_limit?: number | null
    admin_limit?: number | null
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
                vehicle_limit?: number | null
                user_limit?: number | null
                admin_limit?: number | null
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
        vehicle_limit: rawData.relationships.plan.vehicle_limit ?? null,
        user_limit: rawData.relationships.plan.user_limit ?? null,
        admin_limit: rawData.relationships.plan.admin_limit ?? null,
        vehicle_count: 0,
        starts_at: rawData.attributes.started_at,
        ends_at: rawData.attributes.ended_at
    }
}

export interface SubscriptionPlan {
    id: number
    attributes: {
        name: string
        description: string
        price_monthly: number
        price_yearly: number
        vehicle_limit: number | null
        user_limit: number | null
        admin_limit: number | null
    }
    relationships: {
        core_modules: { name: string; slug: string }[]
        advanced_capabilities: { name: string; slug: string }[]
    }
}

export const getSubscriptionPlans = async (): Promise<{ data: SubscriptionPlan[] }> => {
    const response = await apiClient.get<{ data: SubscriptionPlan[] }>('/subscriptions/plans')
    return response.data
}

export interface Invoice {
    id: number
    invoice_number: string
    total: number
    currency: string
    status: 'paid' | 'pending' | 'failed'
    issued_at: string
    pdf_available: boolean
}

export const getInvoices = async (params?: { page?: number }): Promise<{ data: { data: Invoice[]; meta: { current_page: number; last_page: number } } }> => {
    const response = await apiClient.get<{ data: { data: Invoice[]; meta: { current_page: number; last_page: number } } }>('/subscriptions/invoices', { params })
    return response.data
}

export const getInvoicePdfUrl = (id: number): string => {
    return `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/subscriptions/invoices/${id}/pdf`
}

export interface ChangePlanPayload {
    subscription_id: number
    plan_id: number
    billing_cycle: 'monthly' | 'yearly'
    redirect_url: string
}

export interface ChangePlanResponse {
    message: string
    data: {
        payment_url: string
        reference: string
        public_key: string
    }
}

export const changePlan = async (data: ChangePlanPayload): Promise<ChangePlanResponse> => {
    const response = await apiClient.post<ChangePlanResponse>('/subscriptions/change-plan', data)
    return response.data
}

export const getSubscriptionHistory = async (params?: { page?: number }): Promise<{ data: { subscriptions: any[]; paginate: any } }> => {
    const response = await apiClient.get<{ data: { subscriptions: any[]; paginate: any } }>('/subscriptions/organization/', { params })
    return response.data
}

export const getSubscriptionAddons = async (): Promise<{ data: any[] }> => {
    const response = await apiClient.get<{ data: any[] }>('/subscriptions/addons')
    return response.data
}
