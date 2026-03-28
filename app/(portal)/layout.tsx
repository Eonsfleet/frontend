'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { getOrganizationSubscription } from '@/lib/api/billing'
import { STALE_TIME_STATIC } from '@/lib/config'
import AppShell from '@/components/layout/AppShell'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const { token, clearAuth, _hasHydrated } = useAuthStore()
    const setSubscription = useSubscriptionStore((s) => s.setSubscription)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted && _hasHydrated && !token) {
            clearAuth()
            router.replace('/login')
        }
    }, [mounted, _hasHydrated, token, router, clearAuth])

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
                sub.dunning_stage ?? null
            )
        }
    }, [sub, setSubscription])

    if (!mounted || !_hasHydrated) return null
    if (!token) return null

    return <AppShell>{children}</AppShell>
}
