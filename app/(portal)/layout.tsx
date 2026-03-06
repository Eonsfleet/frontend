'use client'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { getOrganizationSubscription } from '@/lib/api/billing'
import AppShell from '@/components/layout/AppShell'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { token } = useAuthStore()
    const setSubscription = useSubscriptionStore((s) => s.setSubscription)

    useEffect(() => {
        if (!token) router.replace('/login')
    }, [token, router])

    const { data: sub } = useQuery({
        queryKey: ['org-subscription'],
        queryFn: getOrganizationSubscription,
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
    })

    useEffect(() => {
        if (sub) {
            setSubscription(
                sub.plan?.tier ?? null,
                sub.plan?.name ?? null,
                sub.enabled_modules ?? [],
                sub.dunning_stage ?? null
            )
        }
    }, [sub, setSubscription])

    if (!token) return null

    return <AppShell>{children}</AppShell>
}
