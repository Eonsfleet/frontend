'use client'

import { useCallback } from 'react'
import { getEcho } from '@/lib/echo'

export function useEcho() {
    const subscribe = useCallback((channelName: string, eventName: string, callback: (data: any) => void) => {
        const echo = getEcho()
        if (!echo) return

        const channel = echo.channel(channelName)
        channel.listen(eventName, callback)

        return () => {
            channel.stopListening(eventName)
        }
    }, [])

    const subscribePrivate = useCallback((channelName: string, eventName: string, callback: (data: any) => void) => {
        const echo = getEcho()
        if (!echo) return

        const channel = echo.private(channelName)
        channel.listen(eventName, callback)

        return () => {
            channel.stopListening(eventName)
        }
    }, [])

    return {
        echo: getEcho(),
        subscribe,
        subscribePrivate,
    }
}
