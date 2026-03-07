'use client'

import { useEffect, useCallback } from 'react'
import getEcho from '@/lib/echo'

export function useEcho() {
    const echo = getEcho

    const subscribe = useCallback((channelName: string, eventName: string, callback: (data: any) => void) => {
        if (!echo) return

        const channel = echo.channel(channelName)
        channel.listen(eventName, callback)

        return () => {
            channel.stopListening(eventName)
        }
    }, [echo])

    const subscribePrivate = useCallback((channelName: string, eventName: string, callback: (data: any) => void) => {
        if (!echo) return

        const channel = echo.private(channelName)
        channel.listen(eventName, callback)

        return () => {
            channel.stopListening(eventName)
        }
    }, [echo])

    return {
        echo,
        subscribe,
        subscribePrivate
    }
}
