import { useSubscriptionStore, type GatedModule } from '@/store/subscriptionStore'

export function useSubscription() {
    const { hasModule, planTier, planName, dunningStage } = useSubscriptionStore()
    const isPaymentOverdue = dunningStage === 'restricted' || dunningStage === 'suspended'
    const isGracePeriod = dunningStage === 'grace'

    return { hasModule, planTier, planName, isPaymentOverdue, isGracePeriod, dunningStage }
}
