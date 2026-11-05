'use client'

import { useEffect, useRef, useState } from 'react'
import { getEcho } from '@/lib/echo'
import { useAuthStore } from '@/store/authStore'

export type LiveConnection = 'connecting' | 'live' | 'offline' | 'unavailable'

const EVENT = '.vehicle.status.changed'
const DEBOUNCE_MS = 3_000
const AWAY_REFETCH_MS = 60_000

/** The part of pusher-js's connection object this hook uses. */
interface PusherConnection {
    state: string
    bind: (event: 'state_change', cb: (states: { current: string }) => void) => void
    unbind: (event: 'state_change', cb: (states: { current: string }) => void) => void
}

const toConnection = (state: string): LiveConnection => {
    if (state === 'connected') return 'live'
    if (state === 'unavailable' || state === 'failed') return 'unavailable'
    if (state === 'connecting' || state === 'initialized') return 'connecting'
    return 'offline'
}

/**
 * Keeps the fleet status tile current from the one org-wide status channel.
 * That channel is only published when a trip starts, so its events are used as
 * a signal to refetch the authoritative count (debounced), never tallied here:
 * a local tally would drift on every status change that is not broadcast.
 * It also refetches after a reconnect and when the tab returns after a minute
 * away. One private channel, no per-vehicle subscriptions, no polling.
 */
export function useVehicleStatusLive(refetch: () => void) {
    const token = useAuthStore((s) => s.token)
    const organization = useAuthStore((s) => s.organization)
    const orgId = organization?.attributes?.identifier || organization?.id
    const [connection, setConnection] = useState<LiveConnection>('connecting')
    const [lastEventAt, setLastEventAt] = useState<number | null>(null)
    const refetchRef = useRef(refetch)
    useEffect(() => {
        refetchRef.current = refetch
    })

    useEffect(() => {
        if (!token || !orgId) return
        const echo = getEcho()
        if (!echo) {
            // No realtime client in this environment: say so on the next tick.
            const timer = setTimeout(() => setConnection('unavailable'), 0)
            return () => clearTimeout(timer)
        }

        let timer: ReturnType<typeof setTimeout> | undefined
        const schedule = () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => refetchRef.current(), DEBOUNCE_MS)
        }

        const channel = echo.private(`vehicle.status.${orgId}`)
        const onEvent = () => {
            setLastEventAt(Date.now())
            schedule()
        }
        channel.listen(EVENT, onEvent)

        // Connection state: refetch when it returns after being down.
        const connectionApi = (echo as unknown as { connector?: { pusher?: { connection?: PusherConnection } } }).connector?.pusher?.connection
        let wasDown = false
        const onState = (states: { current: string }) => {
            const next = toConnection(states.current)
            setConnection(next)
            if (next === 'live' && wasDown) schedule()
            wasDown = next !== 'live'
        }
        let initial: ReturnType<typeof setTimeout> | undefined
        if (connectionApi) {
            // Show the state the connection is already in, on the next tick.
            initial = setTimeout(() => setConnection(toConnection(connectionApi.state)), 0)
            wasDown = connectionApi.state !== 'connected'
            connectionApi.bind('state_change', onState)
        }

        let hiddenAt: number | null = null
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') hiddenAt = Date.now()
            else if (hiddenAt && Date.now() - hiddenAt > AWAY_REFETCH_MS) {
                hiddenAt = null
                schedule()
            }
        }
        document.addEventListener('visibilitychange', onVisibility)

        return () => {
            if (timer) clearTimeout(timer)
            if (initial) clearTimeout(initial)
            // Stop only this listener: the channel is shared with the tracking map.
            channel.stopListening(EVENT, onEvent)
            connectionApi?.unbind('state_change', onState)
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [token, orgId])

    return { connection, lastEventAt }
}
