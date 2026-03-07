'use client'

import React, { useState } from 'react'
import { Bell, Loader2, CheckCheck, Settings } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/notifications'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export function NotificationBell() {
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)

    const { data: inboxData, isLoading } = useQuery({
        queryKey: ['notifications', 'inbox'],
        queryFn: () => api.getInbox({ unread_only: true })
    })

    const markReadMutation = useMutation({
        mutationFn: api.markAsRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'inbox'] })
    })

    const notifications = inboxData?.data?.notifications || []
    const unreadCount = notifications.filter(n => !n.attributes.is_read).length

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-0">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 mt-1" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                    <span className="font-semibold text-sm text-slate-800">Notifications</span>
                    {unreadCount > 0 && <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-xs">{unreadCount} unread</Badge>}
                </div>

                <div className="max-h-[300px] overflow-y-auto w-full">
                    {isLoading ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                    ) : notifications.length === 0 ? (
                        <div className="py-8 text-center px-4">
                            <CheckCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 w-full">
                            {notifications.slice(0, 5).map(n => (
                                <div
                                    key={n.id}
                                    className={`p-3 text-sm flex gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${!n.attributes.is_read ? 'bg-indigo-50/20' : ''}`}
                                    onClick={() => !n.attributes.is_read && markReadMutation.mutate(n.id)}
                                >
                                    <div className="mt-0.5"><div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 shrink-0"></div></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-800 line-clamp-2 leading-tight">New <span className="font-semibold">{n.attributes.type}</span> event registered in the system.</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{formatDistanceToNow(new Date(n.attributes.created_at))} ago</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50 flex gap-2 rounded-b-lg">
                    <Link href="/notifications" onClick={() => setIsOpen(false)} className="flex-1">
                        <Button variant="ghost" className="w-full text-xs h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium">
                            View Inbox
                        </Button>
                    </Link>
                    <Link href="/settings/notifications" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-600"><Settings className="w-4 h-4" /></Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}
