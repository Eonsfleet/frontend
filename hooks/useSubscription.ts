import { useSubscriptionStore, type GatedModule } from '@/store/subscriptionStore'

export function useSubscription() {
    const { hasCapability, planTier, planName, dunningStage } = useSubscriptionStore()
    const isPaymentOverdue = dunningStage === 'restricted' || dunningStage === 'suspended'
    const isGracePeriod = dunningStage === 'grace'

    return {
        hasCapability,
        hasModule: hasCapability, // Alias for backward compatibility
        planTier,
        planName,
        isPaymentOverdue,
        isGracePeriod,
        dunningStage
    }
}
