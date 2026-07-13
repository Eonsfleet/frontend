import apiClient from './client'
import type { DunningStage, PlanTier, Capability } from '@/store/subscriptionStore'

export interface OrganizationSubscription {
    id: number
    status: 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired'
    dunning_stage: DunningStage
    billing_cycle: 'monthly' | 'yearly'
    plan: { id: number; name: string; tier: PlanTier; price: number }
    capabilities: Capability[]
    vehicle_limit: number | null
    user_limit?: number | null
    admin_limit?: number | null
    vehicle_count: number
    starts_at: string
    ends_at: string | null
    currency: string
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
        billing_cycle?: 'monthly' | 'yearly'
    }
}

export const getOrganizationSubscription = async (): Promise<OrganizationSubscription | null> => {
    const response = await apiClient.get<SubscriptionApiResponse>('/subscriptions/organization/current')

    const rawData = response.data.data
    if (!rawData) {
        return null
    }
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

    const currency = (rawData as any).attributes.currency || (rawData as any).relationships?.plan?.currency || 'NGN'
    return {
        id: rawData.id,
        status: rawData.attributes.status,
        dunning_stage: null,
        billing_cycle: rawData.billing_cycle ?? 'monthly',
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
        ends_at: rawData.attributes.ended_at,
        currency,
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
        // Per-asset pricing (kobo)
        vehicle_price_monthly_kobo?: number
        vehicle_price_yearly_kobo?: number
        device_price_monthly_kobo?: number
        device_price_yearly_kobo?: number
        trial_vehicle_limit?: number
        trial_device_limit?: number
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

export interface InvoiceDetail extends Invoice {
    line_items?: Array<{
        description: string
        quantity: number
        unit_price: number
        total: number
    }>
    subtotal?: number
    tax?: number
    discount?: number
}

export const getInvoiceDetails = async (invoiceId: string | number): Promise<{ data: InvoiceDetail }> => {
    const response = await apiClient.get<{ data: InvoiceDetail }>(`/subscriptions/invoices/${invoiceId}`)
    return response.data
}

export const getInvoicePdfUrl = (id: number): string => {
    return `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/subscriptions/invoices/${id}/pdf`
}

export const downloadInvoicePdf = async (invoiceId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/subscriptions/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
    })
    return response.data
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

// ─── Per-asset Subscriptions ──────────────────────────────────────────────────

export type AssetSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'
export type AssetDunningStage = 'grace' | 'restricted' | 'suspended' | null

export interface AssetSubscription {
    id: number
    subscribable_type: 'Vehicle' | 'Device' | string
    subscribable_id: number
    billing_cycle: 'monthly' | 'yearly'
    price_kobo: number
    price_naira: number
    currency: string
    status: AssetSubscriptionStatus
    status_label: string
    dunning_stage: AssetDunningStage
    started_at: string | null
    current_period_start: string | null
    current_period_end: string | null
    next_billing_at: string | null
    dunning_started_at: string | null
    cancelled_at: string | null
    expires_at: string | null
    last_billed_at: string | null
    plan: { id: number; name: string } | null
}

export interface AssetSubscriptionSummary {
    total: number
    active: number
    trialing: number
    past_due: number
    cancelled: number
    expired: number
    monthly_arr_kobo: number
    monthly_arr_naira: number
}

export interface AssetSubscriptionListParams {
    status?: AssetSubscriptionStatus
    type?: 'Vehicle' | 'Device'
    per_page?: number
    page?: number
}

export const getAssetSubscriptions = async (
    params?: AssetSubscriptionListParams
): Promise<{ data: AssetSubscription[]; meta: { current_page: number; last_page: number; total: number } }> => {
    const response = await apiClient.get('/subscriptions/assets', { params })
    return response.data
}

export const getAssetSubscriptionSummary = async (): Promise<AssetSubscriptionSummary> => {
    const response = await apiClient.get<{ data: AssetSubscriptionSummary }>('/subscriptions/assets/summary')
    return response.data.data
}

export const getAssetSubscription = async (id: number): Promise<AssetSubscription> => {
    const response = await apiClient.get<{ data: AssetSubscription }>(`/subscriptions/assets/${id}`)
    return response.data.data
}

export const cancelAssetSubscription = async (id: number): Promise<AssetSubscription> => {
    const response = await apiClient.post<{ data: AssetSubscription }>(`/subscriptions/assets/${id}/cancel`)
    return response.data.data
}

export interface InitializeSubscriptionPayload {
    organization_id: number | string
    plan_id: number
    billing_cycle: 'monthly' | 'yearly'
    redirect_url: string
    addon_id?: number[]
}

export interface InitializeSubscriptionResponse {
    message: string
    data: {
        authorization_url: string
        reference: string
        public_key: string
    }
}

export const initializeSubscription = async (data: InitializeSubscriptionPayload): Promise<InitializeSubscriptionResponse> => {
    const response = await apiClient.post<InitializeSubscriptionResponse>('/subscriptions/payments/initialize', data)
    return response.data
}

// ─── Payment Methods Mocking ──────────────────────────────────────────────────

export interface PaymentMethod {
    id: string
    brand: string
    last4: string
    exp_month: number
    exp_year: number
    is_default: boolean
}

// In-memory mock storage for payment methods, initialised with a default Visa card
let mockCards: PaymentMethod[] = [
    { id: 'pm_1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2028, is_default: true }
]

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...mockCards])
        }, 300)
    })
}

export const addPaymentMethod = async (data: { brand: string; last4: string; exp_month: number; exp_year: number }): Promise<PaymentMethod> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newCard: PaymentMethod = {
                id: `pm_${Date.now()}`,
                brand: data.brand.toLowerCase(),
                last4: data.last4,
                exp_month: data.exp_month,
                exp_year: data.exp_year,
                is_default: mockCards.length === 0,
            }
            mockCards.push(newCard)
            resolve(newCard)
        }, 500)
    })
}

export const removePaymentMethod = async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockCards.findIndex(c => c.id === id)
            if (index === -1) {
                reject(new Error('Card not found.'))
                return
            }
            mockCards.splice(index, 1)
            resolve()
        }, 500)
    })
}

// ─── B2B Change Requests Mocking ──────────────────────────────────────────────

export interface BillingChangeRequest {
    id: number
    type: 'downgrade' | 'cancellation'
    reason: string
    details?: string
    status: 'pending' | 'approved' | 'rejected'
    submitted_at: string
}

let mockRequests: BillingChangeRequest[] = []

export const submitBillingRequest = async (data: { type: 'downgrade' | 'cancellation'; reason: string; details?: string }): Promise<{ success: boolean; data: BillingChangeRequest }> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newReq: BillingChangeRequest = {
                id: Date.now(),
                type: data.type,
                reason: data.reason,
                details: data.details,
                status: 'pending',
                submitted_at: new Date().toISOString(),
            }
            mockRequests.push(newReq)
            resolve({ success: true, data: newReq })
        }, 600)
    })
}

export const getBillingRequests = async (): Promise<BillingChangeRequest[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...mockRequests])
        }, 300)
    })
}

// ─── Add Vehicles Beyond Capacity ──────────────────────────────────────────────

export interface AddVehiclesResponse {
    success: boolean
    message: string
    batch_id: string
    quantity: number
    prorated_charge: number
    currency: string
    next_billing_date: string
}

export const addVehiclesBeyondCapacity = async (data: { count: number; proration_kobo: number }): Promise<AddVehiclesResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const nextMonth = new Date()
            nextMonth.setMonth(nextMonth.getMonth() + 1)
            resolve({
                success: true,
                message: `${data.count} vehicles successfully added to your fleet subscription.`,
                batch_id: `batch-${Date.now().toString().slice(-6)}`,
                quantity: data.count,
                prorated_charge: data.proration_kobo,
                currency: 'NGN',
                next_billing_date: nextMonth.toISOString(),
            })
        }, 800)
    })
}
