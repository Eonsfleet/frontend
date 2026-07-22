import { useAuthStore } from '@/store/authStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'

/** Settings routes the owner role cannot access — only available on corporate accounts */
export const OWNER_RESTRICTED_PATHS = [
    '/settings',          // Organization settings (exact match)
    '/settings/users',
    '/settings/notifications',
    '/settings/roles',
    '/settings/webhooks',
    '/settings/api-keys',
    '/integrations',
]

/** Routes accessible to users whose free trial has expired and have no active subscription */
export const TRIAL_EXPIRED_ALLOWED_PATHS = [
    '/dashboard',
    '/vehicles',
    '/drivers',
    '/settings/clusters',
    '/profile',
    '/billing',
]

export function useAccessControl() {
    const user = useAuthStore(s => s.user)
    const subscriptionStatus = useSubscriptionStore(s => s.subscriptionStatus)

    const role = Array.isArray(user?.attributes.role)
        ? user?.attributes.role[0]
        : user?.attributes.role

    const isOwner = role === 'owner'
    const isExpiredTrial = subscriptionStatus === 'expired'
    const isActiveTrial = subscriptionStatus === 'trial'

    const isOwnerRestricted = (path: string): boolean => {
        if (!isOwner) return false
        return OWNER_RESTRICTED_PATHS.some(p =>
            p === '/settings'
                ? path === '/settings'
                : path === p || path.startsWith(p + '/')
        )
    }

    const isTrialExpiredRestricted = (path: string): boolean => {
        if (!isExpiredTrial) return false
        return !TRIAL_EXPIRED_ALLOWED_PATHS.some(p =>
            path === p || path.startsWith(p + '/')
        )
    }

    return {
        isOwner,
        isActiveTrial,
        isExpiredTrial,
        isOwnerRestricted,
        isTrialExpiredRestricted,
    }
}
