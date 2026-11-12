import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

type Handler = () => void
const channel = vi.hoisted(() => ({ listen: vi.fn(), stopListening: vi.fn() }))
const conn = vi.hoisted(() => ({ state: 'connected', handlers: [] as ((s: { current: string }) => void)[], bind: vi.fn(), unbind: vi.fn() }))
const echo = vi.hoisted(() => ({ private: vi.fn(), connector: { pusher: { connection: null as unknown } } }))
vi.mock('@/lib/echo', () => ({ getEcho: () => echo }))

import { useAuthStore } from '@/store/authStore'
import { useVehicleStatusLive } from '@/hooks/analytics/useVehicleStatusLive'

const emit = () => (channel.listen.mock.calls[0][1] as Handler)()
const stateChange = (current: string) => act(() => conn.handlers.forEach((h) => h({ current })))

beforeEach(() => {
    vi.useFakeTimers()
    channel.listen.mockReset()
    channel.stopListening.mockReset()
    conn.state = 'connected'
    conn.handlers = []
    conn.bind.mockImplementation((_e: string, h: (s: { current: string }) => void) => conn.handlers.push(h))
    conn.unbind.mockReset()
    echo.private.mockReset().mockReturnValue(channel)
    echo.connector.pusher.connection = conn
    useAuthStore.setState({ token: 'tok', organization: { id: '1', attributes: { identifier: 'org-7' } } as never })
})
afterEach(() => vi.useRealTimers())

describe('live fleet status', () => {
    it('listens on the one org-wide private status channel, not per vehicle', () => {
        renderHook(() => useVehicleStatusLive(vi.fn()))
        expect(echo.private).toHaveBeenCalledTimes(1)
        expect(echo.private).toHaveBeenCalledWith('vehicle.status.org-7')
        expect(channel.listen).toHaveBeenCalledWith('.vehicle.status.changed', expect.any(Function))
    })

    it('refetches the authoritative count once after a burst of events, instead of tallying them', () => {
        const refetch = vi.fn()
        const { result } = renderHook(() => useVehicleStatusLive(refetch))
        act(() => { emit(); emit(); emit() })
        expect(refetch).not.toHaveBeenCalled()
        act(() => { vi.advanceTimersByTime(3000) })
        expect(refetch).toHaveBeenCalledTimes(1)
        expect(result.current.lastEventAt).not.toBeNull()
    })

    it('reports the connection state, and refetches after it comes back', () => {
        const refetch = vi.fn()
        const { result } = renderHook(() => useVehicleStatusLive(refetch))
        act(() => { vi.advanceTimersByTime(0) })
        expect(result.current.connection).toBe('live')

        stateChange('unavailable')
        expect(result.current.connection).toBe('unavailable')
        act(() => { vi.advanceTimersByTime(5000) })
        expect(refetch).not.toHaveBeenCalled()

        stateChange('connecting')
        expect(result.current.connection).toBe('connecting')
        stateChange('connected')
        expect(result.current.connection).toBe('live')
        act(() => { vi.advanceTimersByTime(3000) })
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('does not refetch for a connection that was never down', () => {
        const refetch = vi.fn()
        renderHook(() => useVehicleStatusLive(refetch))
        stateChange('connected')
        act(() => { vi.advanceTimersByTime(5000) })
        expect(refetch).not.toHaveBeenCalled()
    })

    it('refetches when the tab returns after a minute away, not after a short one', () => {
        const refetch = vi.fn()
        renderHook(() => useVehicleStatusLive(refetch))
        const setVisibility = (v: 'hidden' | 'visible') => {
            Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
            document.dispatchEvent(new Event('visibilitychange'))
        }
        act(() => setVisibility('hidden'))
        act(() => { vi.advanceTimersByTime(10_000) })
        act(() => setVisibility('visible'))
        act(() => { vi.advanceTimersByTime(3000) })
        expect(refetch).not.toHaveBeenCalled()

        act(() => setVisibility('hidden'))
        act(() => { vi.advanceTimersByTime(90_000) })
        act(() => setVisibility('visible'))
        act(() => { vi.advanceTimersByTime(3000) })
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('stops only its own listener on unmount, because the channel is shared with the tracking map', () => {
        const { unmount } = renderHook(() => useVehicleStatusLive(vi.fn()))
        const listener = channel.listen.mock.calls[0][1]
        unmount()
        expect(channel.stopListening).toHaveBeenCalledWith('.vehicle.status.changed', listener)
        expect(conn.unbind).toHaveBeenCalledWith('state_change', expect.any(Function))
    })

    it('cancels a pending refetch on unmount', () => {
        const refetch = vi.fn()
        const { unmount } = renderHook(() => useVehicleStatusLive(refetch))
        act(() => emit())
        unmount()
        act(() => { vi.advanceTimersByTime(5000) })
        expect(refetch).not.toHaveBeenCalled()
    })

    it('does not subscribe without a session', () => {
        useAuthStore.setState({ token: null })
        renderHook(() => useVehicleStatusLive(vi.fn()))
        expect(echo.private).not.toHaveBeenCalled()
    })
})
