import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import type { ReactNode } from 'react'

let query = ''
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }))

import { useAuthStore } from '@/store/authStore'
import { useAnalyticsUi } from '@/hooks/analytics/useAnalyticsUi'
import { UI_COOKIE } from '@/lib/analytics/flags'

const serve = (flags: object | null) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(flags ? { ok: true, json: async () => flags } : { ok: false, status: 500 }))

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
)

beforeEach(() => {
    query = ''
    Cookies.remove(UI_COOKIE)
    useAuthStore.setState({ user: { id: '12' } as never })
})

describe('choosing the Analytics experience at runtime', () => {
    it('waits for the flags before choosing, so the wrong version never flashes', async () => {
        serve({ default: 'legacy', killSwitch: false, testerIds: [] })
        const { result } = renderHook(() => useAnalyticsUi(), { wrapper })
        expect(result.current.ready).toBe(false)
        await waitFor(() => expect(result.current.ready).toBe(true))
        expect(result.current.ui).toBe('legacy')
    })

    it('lets a tester switch with ?ui= and remembers the choice in a cookie', async () => {
        serve({ default: 'legacy', killSwitch: false, testerIds: ['12'] })
        query = 'ui=v2'
        const { result } = renderHook(() => useAnalyticsUi(), { wrapper })
        await waitFor(() => expect(result.current.ready).toBe(true))
        expect(result.current).toMatchObject({ ui: 'v2', source: 'url', canSwitch: true })
        await waitFor(() => expect(Cookies.get(UI_COOKIE)).toBe('v2'))
    })

    it('uses the cookie when the URL has no override, and ?ui=reset clears it', async () => {
        serve({ default: 'legacy', killSwitch: false, testerIds: ['12'] })
        Cookies.set(UI_COOKIE, 'v2')
        const first = renderHook(() => useAnalyticsUi(), { wrapper })
        await waitFor(() => expect(first.result.current.ready).toBe(true))
        expect(first.result.current).toMatchObject({ ui: 'v2', source: 'cookie' })
        first.unmount()

        query = 'ui=reset'
        const second = renderHook(() => useAnalyticsUi(), { wrapper })
        await waitFor(() => expect(second.result.current.ready).toBe(true))
        await waitFor(() => expect(Cookies.get(UI_COOKIE)).toBeUndefined())
        expect(second.result.current.ui).toBe('legacy')
    })

    it('ignores the URL, the cookie and the switch for a user who is not a tester', async () => {
        serve({ default: 'legacy', killSwitch: false, testerIds: ['99'] })
        query = 'ui=v2'
        Cookies.set(UI_COOKIE, 'v2')
        const { result } = renderHook(() => useAnalyticsUi(), { wrapper })
        await waitFor(() => expect(result.current.ready).toBe(true))
        expect(result.current).toMatchObject({ ui: 'legacy', canSwitch: false })
        expect(Cookies.get(UI_COOKIE)).toBe('v2') // untouched, and ignored
    })

    it('shows the existing experience everywhere when the kill switch is on, testers included', async () => {
        serve({ default: 'v2', killSwitch: true, testerIds: ['12'] })
        query = 'ui=v2'
        const { result } = renderHook(() => useAnalyticsUi(), { wrapper })
        await waitFor(() => expect(result.current.ready).toBe(true))
        expect(result.current).toMatchObject({ ui: 'legacy', source: 'kill-switch' })
    })

    it('falls back to the safe build default when the flags cannot be fetched', async () => {
        serve(null)
        const { result } = renderHook(() => useAnalyticsUi(), { wrapper })
        await waitFor(() => expect(result.current.ready).toBe(true))
        expect(result.current).toMatchObject({ ui: 'legacy', canSwitch: false })
    })
})
