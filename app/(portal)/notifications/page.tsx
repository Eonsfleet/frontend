'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/notifications'
import { toast } from 'sonner'
import { Bell, CheckCheck, Loader2, Mail, Smartphone, AppWindow, Settings2, BellRing, Info, AlertTriangle, Route, ShieldAlert, Wrench } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Switch } from '@/components/ui/switch'

export default function NotificationsPage() {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('inbox')

    const { data: inboxData, isLoading: isLoadingInbox } = useQuery({
        queryKey: ['notifications-inbox'],
        queryFn: () => api.getInbox({ page: 1 })
    })

    const { data: prefData, isLoading: isLoadingPref } = useQuery({
        queryKey: ['notifications-prefs'],
        queryFn: api.getPreferences
    })

    const markReadMutation = useMutation({
        mutationFn: api.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] })
        }
    })

    const markAllReadMutation = useMutation({
        mutationFn: api.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] })
            toast.success('All messages marked as read')
        }
    })

    const prefMutation = useMutation({
        mutationFn: api.updatePreference,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-prefs'] })
            toast.success('Preferences updated')
        },
        onError: () => toast.error('Failed to update preference')
    })

    const getIcon = (type: string) => {
        if (type.includes('trip')) return <Route className="w-5 h-5 text-indigo-500" />
        if (type.includes('incident') || type.includes('anomaly')) return <ShieldAlert className="w-5 h-5 text-rose-500" />
        if (type.includes('maintenance')) return <Wrench className="w-5 h-5 text-amber-500" />
        if (type.includes('geofence')) return <Target className="w-5 h-5 text-emerald-500" />
        return <Info className="w-5 h-5 text-sky-500" />
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
                    <p className="text-slate-500 mt-1">Review activity alerts and manage your delivery channels.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="inbox" className="gap-2"><Bell className="w-4 h-4" /> Inbox</TabsTrigger>
                    <TabsTrigger value="preferences" className="gap-2"><Settings2 className="w-4 h-4" /> Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="inbox">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-base font-semibold text-slate-900">Recent Alerts</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => markAllReadMutation.mutate()}
                                disabled={markAllReadMutation.isPending || !inboxData?.data?.notifications?.length || inboxData.data.notifications.every(n => n.attributes.is_read)}
                            >
                                {markAllReadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-2 text-emerald-600" />}
                                Mark all as read
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingInbox ? (
                                <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
                            ) : !inboxData?.data?.notifications?.length ? (
                                <div className="py-20 text-center text-slate-500">
                                    <BellRing className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p>You're all caught up! No notifications in your inbox.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {inboxData?.data?.notifications?.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 flex gap-4 transition-colors ${!notification.attributes.is_read ? 'bg-indigo-50/30' : 'bg-white hover:bg-slate-50'}`}
                                            onClick={() => !notification.attributes.is_read && markReadMutation.mutate(notification.id)}
                                        >
                                            <div className="shrink-0 mt-1">
                                                {getIcon(notification.attributes.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={`text-sm ${!notification.attributes.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                        {notification.attributes.data.message || notification.attributes.subject || notification.attributes.type.replace('_', ' ')}
                                                    </p>
                                                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(notification.attributes.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                    {notification.attributes.body || notification.attributes.data.description || 'System generated event.'}
                                                </p>
                                            </div>
                                            {!notification.attributes.is_read && (
                                                <div className="shrink-0 flex items-center">
                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preferences">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="border-b border-slate-100 bg-white">
                            <CardTitle className="text-lg">Delivery Matrices</CardTitle>
                            <CardDescription>Configure which operational events trigger alerts across your personal channels.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Trigger Event</th>
                                        <th className="px-6 py-4 text-center">
                                            <AppWindow className="w-4 h-4 mx-auto mb-1 text-indigo-500" />
                                            In-App
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            <Mail className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                                            Email
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            <Smartphone className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                                            SMS
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {isLoadingPref ? (
                                        <tr><td colSpan={4} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>
                                    ) : !prefData?.data?.length ? (
                                        <tr><td colSpan={4} className="py-12 text-center text-slate-500">No routing preferences available.</td></tr>
                                    ) : (
                                        prefData?.data?.map((pref) => (
                                            <tr key={pref.event_id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-medium text-slate-700">{pref.event_name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Switch
                                                        checked={pref.in_app}
                                                        onCheckedChange={(checked: boolean) => prefMutation.mutate({ event_id: pref.event_id, channel: 'in_app', enabled: checked })}
                                                        disabled={prefMutation.isPending}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Switch
                                                        checked={pref.email}
                                                        onCheckedChange={(checked: boolean) => prefMutation.mutate({ event_id: pref.event_id, channel: 'email', enabled: checked })}
                                                        disabled={prefMutation.isPending}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Switch
                                                        checked={pref.sms}
                                                        onCheckedChange={(checked: boolean) => prefMutation.mutate({ event_id: pref.event_id, channel: 'sms', enabled: checked })}
                                                        disabled={prefMutation.isPending}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function Target(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
}
