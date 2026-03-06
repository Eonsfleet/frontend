import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlanTier = 'starter' | 'growth' | 'enterprise'
export type DunningStage = null | 'grace' | 'restricted' | 'suspended'

export const GATED_MODULES = [
    'geofencing',
    'maintenance',
    'incidents',
    'fuel_management',
    'analytics',
    'webhooks',
    'reporting',
] as const

export type GatedModule = (typeof GATED_MODULES)[number]

interface SubscriptionState {
    planTier: PlanTier | null
    planName: string | null
    enabledModules: GatedModule[]
    dunningStage: DunningStage
    setSubscription: (
        tier: PlanTier,
        name: string,
        modules: GatedModule[],
        dunning: DunningStage
    ) => void
    hasModule: (module: GatedModule) => boolean
}

export const useSubscriptionStore = create<SubscriptionState>()(
    persist(
        (set, get) => ({
            planTier: null,
            planName: null,
            enabledModules: [],
            dunningStage: null,
            setSubscription: (planTier, planName, enabledModules, dunningStage) =>
                set({ planTier, planName, enabledModules, dunningStage }),
            hasModule: (module) => get().enabledModules.includes(module),
        }),
        { name: 'eonsfleet-subscription' }
    )
)
