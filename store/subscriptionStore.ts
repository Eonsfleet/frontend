import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlanTier = 'starter' | 'growth' | 'enterprise'
export type DunningStage = null | 'grace' | 'restricted' | 'suspended'

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
] as const

export type Capability = (typeof CAPABILITIES)[number]
export type GatedModule = Capability // Alias for backward compatibility if needed

interface SubscriptionState {
    planTier: PlanTier | null
    planName: string | null
    capabilities: Capability[]
    dunningStage: DunningStage
    setSubscription: (
        tier: PlanTier,
        name: string,
        capabilities: Capability[],
        dunning: DunningStage
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
            setSubscription: (planTier, planName, capabilities, dunningStage) =>
                set({ planTier, planName, capabilities, dunningStage }),
            hasCapability: (slug) => get().capabilities.includes(slug),
        }),
        { name: 'eonsfleet-subscription' }
    )
)
