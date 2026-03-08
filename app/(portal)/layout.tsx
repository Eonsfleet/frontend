'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { getOrganizationSubscription } from '@/lib/api/billing'
import AppShell from '@/components/layout/AppShell'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const { token } = useAuthStore()
    const setSubscription = useSubscriptionStore((s) => s.setSubscription)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted && !token) {
            // Delete cookie to break infinite redirect loop with middleware
            document.cookie = 'ef-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            router.replace('/login')
        }
    }, [mounted, token, router])

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
                sub.capabilities,
                sub.dunning_stage ?? null
            )
        }
    }, [sub, setSubscription])

    if (!mounted || !token) return null

    return <AppShell>{children}</AppShell>
}
