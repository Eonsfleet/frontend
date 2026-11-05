'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/store/authStore'
import { FALLBACK_FLAGS, UI_COOKIE, UI_PARAM, resolveAnalyticsUi, type RuntimeFlags, type UiDecision } from '@/lib/analytics/flags'

const fetchFlags = async (): Promise<RuntimeFlags> => {
    const res = await fetch('/api/analytics-flags', { cache: 'no-store' })
    if (!res.ok) throw new Error(`flags ${res.status}`)
    return res.json()
}

// The ui cookie as an external store: the server (and the first hydration pass)
// sees NOT_MOUNTED, the browser sees the cookie, and writes notify readers.
const NOT_MOUNTED = '__not-mounted__'
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}
const readCookie = () => Cookies.get(UI_COOKIE) ?? null
const writeCookie = (value: string | null) => {
    if (value) Cookies.set(UI_COOKIE, value, { expires: 7, sameSite: 'lax' })
    else Cookies.remove(UI_COOKIE)
    listeners.forEach((listener) => listener())
}

/**
 * Which Analytics experience to show. Flags come from the runtime endpoint
 * (re-checked on focus, so a kill switch reaches open tabs); if it cannot be
 * reached, the build-time default applies. `ready` is false until the cookie
 * has been read and the flags have answered, so the wrong version never flashes.
 */
export function useAnalyticsUi(): UiDecision & { ready: boolean } {
    const search = useSearchParams()
    const userId = useAuthStore((s) => s.user?.id)
    const cookie = useSyncExternalStore<string | null>(subscribe, readCookie, () => NOT_MOUNTED)
    const mounted = cookie !== NOT_MOUNTED

    const flagsQuery = useQuery({
        queryKey: ['analytics-flags'],
        queryFn: fetchFlags,
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: 0,
    })
    const flags = flagsQuery.data ?? FALLBACK_FLAGS

    const urlOverride = search.get(UI_PARAM)
    const decision = resolveAnalyticsUi({ flags, userId, urlOverride, cookieOverride: mounted ? cookie : null })

    // Remember a tester's choice. `?ui=reset` clears it.
    useEffect(() => {
        if (!mounted || !decision.canSwitch) return
        if (urlOverride === 'v2' || urlOverride === 'legacy') {
            if (readCookie() !== urlOverride) writeCookie(urlOverride)
        } else if (urlOverride === 'reset' && readCookie() !== null) {
            writeCookie(null)
        }
    }, [mounted, decision.canSwitch, urlOverride])

    return { ...decision, ready: mounted && !flagsQuery.isPending }
}
