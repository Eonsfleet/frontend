'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getEcho } from '@/lib/echo'
import { useAuthStore } from '@/store/authStore'
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

            toast(payload.title || 'New notification', {
                description: payload.body,
                action: payload.action_url
                    ? {
                        label: 'Open',
                        onClick: () => {
                            window.location.href = payload.action_url as string
                        },
                    }
                    : undefined,
            })
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
