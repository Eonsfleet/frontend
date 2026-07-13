'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { getOrganizationSubscription } from '@/lib/api/billing'
import { STALE_TIME_STATIC } from '@/lib/config'
import { TRIAL_EXPIRED_ALLOWED_PATHS } from '@/hooks/useAccessControl'
import AppShell from '@/components/layout/AppShell'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { token, clearAuth, _hasHydrated } = useAuthStore()
    const setSubscription = useSubscriptionStore((s) => s.setSubscription)
    const subscriptionStatus = useSubscriptionStore((s) => s.subscriptionStatus)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted && _hasHydrated && !token) {
            clearAuth()
            router.replace('/login')
        }
    }, [mounted, _hasHydrated, token, router, clearAuth])

    // Redirect expired-trial users to billing when they navigate to restricted routes
    useEffect(() => {
        if (subscriptionStatus !== 'expired') return
        const allowed = TRIAL_EXPIRED_ALLOWED_PATHS.some(
            p => pathname === p || pathname.startsWith(p + '/')
        )
        if (!allowed) {
            router.replace('/billing')
        }
    }, [subscriptionStatus, pathname, router])

    const { data: sub } = useQuery({
        queryKey: ['org-subscription'],
        queryFn: getOrganizationSubscription,
        enabled: !!token,
        staleTime: STALE_TIME_STATIC,
    })

    useEffect(() => {
        if (sub) {
            setSubscription(
                sub.plan?.tier ?? null,
                sub.plan?.name ?? null,
                sub.capabilities,
                sub.dunning_stage ?? null,
                sub.status ?? null
            )
        } else if (sub === null) {
            setSubscription(null, null, [], null, null)
        }
    }, [sub, setSubscription])

    if (!mounted || !_hasHydrated) return null
    if (!token) return null

    return <AppShell>{children}</AppShell>
}
