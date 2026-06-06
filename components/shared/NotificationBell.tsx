'use client'

import React, { useState } from 'react'
import { Bell, Loader2, CheckCheck, BellRing, ExternalLink } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/notifications'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import { invalidateNotificationInbox } from '@/hooks/useRealtimeNotifications'

function getNotificationTitle(notification: api.Notification) {
    const data = notification.attributes.data
    return (
        notification.attributes.subject ||
        (typeof data.message === 'string' ? data.message : null) ||
        notification.attributes.type.replace(/[_-]/g, ' ')
    )
}

function getNotificationBody(notification: api.Notification) {
    const data = notification.attributes.data
    return (
        notification.attributes.body ||
        (typeof data.description === 'string' ? data.description : null) ||
        'A new fleet event needs your attention.'
    )
}

function getActionUrl(notification: api.Notification) {
    const value = notification.attributes.data.action_url || notification.attributes.data.url
    return typeof value === 'string' ? value : null
}

export function NotificationBell() {
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)

    const { data: inboxData, isLoading } = useQuery({
        queryKey: ['notifications', 'inbox'],
        queryFn: () => api.getInbox({ unread_only: true, per_page: 10 })
    })

    const markReadMutation = useMutation({
        mutationFn: api.markAsRead,
        onSuccess: () => invalidateNotificationInbox(queryClient)
    })

    const markAllReadMutation = useMutation({
        mutationFn: api.markAllAsRead,
        onSuccess: () => {
            invalidateNotificationInbox(queryClient)
            toast.success('All notifications cleared')
        }
    })

    const notifications = inboxData?.data?.notifications || []
    const unreadCount = notifications.filter(n => !n.attributes.is_read).length

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-0">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="mr-4 mt-2 w-[22rem] overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl shadow-slate-200/70" align="end">
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                    <div>
                        <span className="text-sm font-black text-slate-900">Inbox</span>
                        <p className="text-[11px] font-medium text-slate-400">Fresh operational signals</p>
                    </div>
                    {unreadCount > 0 ? (
                        <Badge variant="secondary" className="rounded-full bg-indigo-50 text-[10px] font-black text-indigo-700">{unreadCount} unread</Badge>
                    ) : (
                        <Badge variant="secondary" className="rounded-full bg-emerald-50 text-[10px] font-black text-emerald-700">Clear</Badge>
                    )}
                </div>

                <div className="max-h-[340px] w-full overflow-y-auto bg-slate-50/60">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                    ) : notifications.length === 0 ? (
                        <div className="py-8 text-center px-4">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCheck className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-700">You&apos;re all caught up</p>
                            <p className="mt-1 text-xs text-slate-400">Quiet dashboards are happy dashboards.</p>
                        </div>
                    ) : (
                        <div className="w-full p-2">
                            {notifications.slice(0, 5).map(n => (
                                <div
                                    key={n.id}
                                    className="mb-2 flex cursor-pointer gap-3 rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm shadow-slate-200/40 transition hover:border-indigo-100 hover:bg-indigo-50/40"
                                    onClick={() => {
                                        if (!n.attributes.is_read) markReadMutation.mutate(n.id)
                                        const actionUrl = getActionUrl(n)
                                        if (actionUrl) window.location.href = actionUrl
                                    }}
                                >
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                        <BellRing className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="line-clamp-1 font-bold leading-tight text-slate-800 capitalize">{getNotificationTitle(n)}</p>
                                            {getActionUrl(n) && <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-slate-300" />}
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{getNotificationBody(n)}</p>
                                        <p className="text-[10px] text-slate-400 mt-2">{formatDistanceToNow(new Date(n.attributes.created_at))} ago</p>
                                    </div>
                                    {!n.attributes.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 border-t border-slate-100 bg-white p-2">
                    <Link href="/notifications" onClick={() => setIsOpen(false)} className="flex-1">
                        <Button variant="ghost" className="h-9 w-full rounded-xl text-xs font-black text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                            View Inbox
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        className="h-9 rounded-xl px-3 text-xs font-black text-slate-500 hover:bg-slate-100"
                        disabled={!unreadCount || markAllReadMutation.isPending}
                        onClick={() => markAllReadMutation.mutate()}
                    >
                        <CheckCheck className="h-4 w-4" />
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
