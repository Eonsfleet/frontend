'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getEcho } from '@/lib/echo'
import { useAuthStore } from '@/store/authStore'
import { resolveNotificationAddress, withLocation } from '@/lib/notificationLocation'
import type { RealtimeNotificationPayload } from '@/lib/api/notifications'

export const NOTIFICATION_INBOX_KEYS = [
    ['notifications', 'inbox'],
    ['notifications-inbox'],
] as const

export function invalidateNotificationInbox(queryClient: ReturnType<typeof useQueryClient>) {
    NOTIFICATION_INBOX_KEYS.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey })
    })
}

export function useRealtimeNotifications() {
    const queryClient = useQueryClient()
    const token = useAuthStore((state) => state.token)
    const userId = useAuthStore((state) => state.user?.id)

    useEffect(() => {
        if (!token || !userId) return

        const echo = getEcho()
        if (!echo) return

        const channelName = `notification.${userId}`
        const channel = echo.private(channelName)

        const handleNotification = (payload: RealtimeNotificationPayload) => {
            invalidateNotificationInbox(queryClient)

            const options = (description: string) => ({
                description,
                action: payload.action_url
                    ? {
                        label: 'Open',
                        onClick: () => {
                            window.location.href = payload.action_url as string
                        },
                    }
                    : undefined,
            })
            const title = payload.title || 'New notification'
            const toastId = toast(title, options(payload.body))

            // Offline-device alerts (e.g. overspeed) carry the last known fix; resolve it to a street address.
            const source = { ...(payload.data ?? {}), latitude: payload.latitude, longitude: payload.longitude, ...(payload.data ?? {}) }
            resolveNotificationAddress(source)
                .then((address) => {
                    if (address) toast(title, { id: toastId, ...options(withLocation(payload.body ?? '', address)) })
                })
                .catch(() => undefined)
        }

        channel.listen('.InAppNotificationSent', handleNotification)
        channel.listen('InAppNotificationSent', handleNotification)

        return () => {
            channel.stopListening('.InAppNotificationSent')
            channel.stopListening('InAppNotificationSent')
            echo.leave(channelName)
        }
    }, [queryClient, token, userId])
}
