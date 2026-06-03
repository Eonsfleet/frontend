import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlanTier = 'starter' | 'growth' | 'enterprise'
export type DunningStage = null | 'grace' | 'restricted' | 'suspended'
export type SubscriptionStatus = 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired' | null

/**
 * Slugs for all gateable features (Core Modules + Advanced Capabilities)
 * as defined in docs/frontend_integration_guide.md
 */
export const CAPABILITIES = [
    // Core Modules
    'vehicles',
    'drivers',
    'users',
    'fuel',
    'analytics',
    'maintenance',
    'incidents',
    'workflow',
    'geofence',
    'vendors',
    'notifications',
    'webhooks',
    'trips',
    'clusters',
    'documents',
    'reporting',
    // Advanced Capabilities
    'custom_roles',
    'fuel_card_va',
    'notification_delegation',
    'notification_groups',
    'notification_routing',
] as const

export type Capability = (typeof CAPABILITIES)[number]
export type GatedModule = Capability // Alias for backward compatibility if needed

interface SubscriptionState {
    planTier: PlanTier | null
    planName: string | null
    capabilities: Capability[]
    dunningStage: DunningStage
    subscriptionStatus: SubscriptionStatus
    setSubscription: (
        tier: PlanTier | null,
        name: string | null,
        capabilities: Capability[],
        dunning: DunningStage,
        status?: SubscriptionStatus
    ) => void
    hasCapability: (slug: Capability) => boolean
}

export const useSubscriptionStore = create<SubscriptionState>()(
    persist(
        (set, get) => ({
            planTier: null,
            planName: null,
            capabilities: [],
            dunningStage: null,
            subscriptionStatus: null,
            setSubscription: (planTier, planName, capabilities, dunningStage, subscriptionStatus = null) =>
                set({ planTier, planName, capabilities, dunningStage, subscriptionStatus }),
            hasCapability: (slug) => get().capabilities.includes(slug),
        }),
        { name: 'eonsfleet-subscription' }
    )
)
