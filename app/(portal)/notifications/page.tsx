'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/notifications'
import { toast } from 'sonner'
import { Bell, CheckCheck, Loader2, Mail, Smartphone, AppWindow, Settings2, BellRing, Info, AlertTriangle, Route, ShieldAlert, Wrench, Users as UsersIcon, CalendarClock, Target, Plus, ShieldCheck } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { Switch } from '@/components/ui/switch'
import { useSubscription } from '@/hooks/useSubscription'
import { usePermission } from '@/hooks/usePermission'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function NotificationsPage() {
    const queryClient = useQueryClient()
    const { hasCapability } = useSubscription()
    const { can } = usePermission()
    const [activeTab, setActiveTab] = useState('inbox')
    const [managementTab, setManagementTab] = useState('rules')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [formData, setFormData] = useState<any>({
        notification_type_id: '',
        is_enabled: true,
        channel_types: ['in_app'],
        recipient_groups: [],
        recipient_roles: [],
        recipient_users: [],
        name: '',
        description: '',
        user_ids: [],
        initial_user_id: '',
        delegated_to_id: '',
        event_types: [],
        expires_at: '',
        reason: ''
    })

    const isAdvancedUser = can('notifications:configure') && (
        hasCapability('notification_routing') || hasCapability('notification_groups') || hasCapability('notification_delegation')
    )

    const sentinelRef = React.useRef<HTMLDivElement>(null)

    const {
        data: inboxData,
        isLoading: isLoadingInbox,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ['notifications-inbox'],
        queryFn: ({ pageParam = 1 }) => api.getInbox({ page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const { current_page, last_page } = lastPage.data.pagination
            return current_page < last_page ? current_page + 1 : undefined
        },
    })

    const notifications = inboxData?.pages.flatMap(p => p.data.notifications) ?? []

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            { threshold: 0.1 }
        )
        if (sentinelRef.current) observer.observe(sentinelRef.current)
        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const { data: prefData, isLoading: isLoadingPref } = useQuery({
        queryKey: ['notifications-prefs'],
        queryFn: api.getPreferences
    })

    // Advanced Data
    const { data: rulesData, isLoading: isLoadingRules } = useQuery({
        queryKey: ['notification-rules'],
        queryFn: api.getRules,
        enabled: activeTab === 'management' && managementTab === 'rules'
    })

    const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
        queryKey: ['notification-groups'],
        queryFn: api.getGroups,
        enabled: activeTab === 'management' && managementTab === 'groups'
    })

    const { data: delegationsData, isLoading: isLoadingDelegations } = useQuery({
        queryKey: ['notification-delegations'],
        queryFn: api.getDelegations,
        enabled: activeTab === 'management' && managementTab === 'delegations'
    })

    const { data: userData } = useQuery({
        queryKey: ['users-list-simple'],
        queryFn: () => import('@/lib/api/settings').then(api => api.getUsers({ per_page: 100 })),
        enabled: activeTab === 'management'
    })

    const { data: channelData } = useQuery({
        queryKey: ['channel-availability'],
        queryFn: api.getChannelAvailability,
        enabled: activeTab === 'management' || activeTab === 'preferences'
    })

    const { data: notificationTypes } = useQuery({
        queryKey: ['notification-types'],
        queryFn: () => api.getNotificationTypes({ configurable: true }),
        enabled: activeTab === 'management' && managementTab === 'rules'
    })

    const { data: rolesData } = useQuery({
        queryKey: ['settings-roles-simple'],
        queryFn: () => import('@/lib/api/settings').then(api => api.getRoles()),
        enabled: activeTab === 'management' && managementTab === 'rules'
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
            queryClient.resetQueries({ queryKey: ['notifications-inbox'] })
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

    const createRuleMutation = useMutation({
        mutationFn: api.createRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-rules'] })
            toast.success('Routing rule created')
            handleClose()
        },
        onError: () => toast.error('Failed to create rule')
    })

    const createGroupMutation = useMutation({
        mutationFn: api.createGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-groups'] })
            toast.success('Notification group created')
            handleClose()
        },
        onError: () => toast.error('Failed to create group')
    })

    const createDelegationMutation = useMutation({
        mutationFn: api.createDelegation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-delegations'] })
            toast.success('Delegation assigned')
            handleClose()
        },
        onError: () => toast.error('Failed to assign delegation')
    })

    const handleClose = () => {
        setIsCreateOpen(false)
        setFormData({
            notification_type_id: '',
            is_enabled: true,
            channel_types: ['in_app'],
            recipient_groups: [],
            recipient_roles: [],
            recipient_users: [],
            name: '',
            description: '',
            user_ids: [],
            initial_user_id: '',
            delegated_to_id: '',
            event_types: [],
            expires_at: '',
            reason: ''
        })
    }

    const handleSave = () => {
        if (managementTab === 'rules') {
            if (!formData.notification_type_id) return toast.error('Please select a notification type')
            createRuleMutation.mutate({
                notification_type_id: parseInt(formData.notification_type_id),
                is_enabled: formData.is_enabled,
                channel_types: formData.channel_types,
                recipient_groups: formData.recipient_groups,
                recipient_roles: formData.recipient_roles,
                recipient_users: formData.recipient_users
            })
        } else if (managementTab === 'groups') {
            if (!formData.name) return toast.error('Group name is required')
            createGroupMutation.mutate({
                name: formData.name,
                description: formData.description,
                user_ids: formData.user_ids
            })
        } else {
            if (!formData.delegated_to_id || !formData.expires_at) return toast.error('Recipient and expiry are required')
            createDelegationMutation.mutate({
                initial_user_id: formData.initial_user_id,
                delegated_to_id: formData.delegated_to_id,
                event_types: formData.event_types,
                expires_at: formData.expires_at,
                reason: formData.reason
            })
        }
    }

    const getIcon = (type: string) => {
        if (type.includes('trip')) return <Route className="w-5 h-5 text-indigo-500" />
        if (type.includes('incident') || type.includes('anomaly')) return <ShieldAlert className="w-5 h-5 text-rose-500" />
        if (type.includes('maintenance')) return <Wrench className="w-5 h-5 text-amber-500" />
        if (type.includes('geofence')) return <Target className="w-5 h-5 text-emerald-500" />
        return <Info className="w-5 h-5 text-sky-500" />
    }

    const channels = prefData?.data?.channels || { email: false, sms: false, push: false, in_app: false }

    const handleToggleChannel = (channel: keyof api.ChannelAvailability, enabled: boolean) => {
        const newChannels = { ...channels, [channel]: enabled }
        prefMutation.mutate(newChannels)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications Center</h1>
                    <p className="text-slate-500 mt-1">Unified view for alerts, personal preferences, and operational routing.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100/50 p-1 border border-slate-200">
                    <TabsTrigger value="inbox" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Bell className="w-4 h-4" /> Inbox
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Settings2 className="w-4 h-4" /> Preferences
                    </TabsTrigger>
                    {isAdvancedUser && (
                        <TabsTrigger value="management" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Management
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="inbox" className="mt-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-base font-semibold text-slate-900">Recent Activity</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs bg-white"
                                onClick={() => markAllReadMutation.mutate()}
                                disabled={markAllReadMutation.isPending || !notifications.length}
                            >
                                {markAllReadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-2 text-emerald-600" />}
                                Mark all as read
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingInbox ? (
                                <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
                            ) : !notifications.length ? (
                                <div className="py-24 text-center text-slate-500">
                                    <BellRing className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="font-medium text-slate-400">Everything clear!</p>
                                    <p className="text-xs text-slate-300">You don't have any unread notifications.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 flex gap-4 transition-colors cursor-pointer ${!notification.attributes.is_read ? 'bg-indigo-50/20' : 'bg-white hover:bg-slate-50'}`}
                                            onClick={() => !notification.attributes.is_read && markReadMutation.mutate(notification.id)}
                                        >
                                            <div className="shrink-0 mt-1">
                                                {getIcon(notification.attributes.type)}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
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
                                    {/* Infinite scroll sentinel */}
                                    <div ref={sentinelRef} className="py-4 flex justify-center">
                                        {isFetchingNextPage ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                        ) : hasNextPage ? (
                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Scroll for more</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-200 font-bold uppercase tracking-widest">All caught up</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preferences" className="mt-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-base font-semibold text-slate-900">My Delivery Channels</CardTitle>
                            <CardDescription>Select which platforms should receive your activity alerts.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {isLoadingPref ? <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { id: 'in_app', label: 'In-App Desktop', icon: BellRing, desc: 'Real-time alerts within the portal interface.' },
                                        { id: 'email', label: 'Email Reports', icon: Mail, desc: 'Daily and emergency updates to your inbox.' },
                                        { id: 'sms', label: 'SMS Messages', icon: Smartphone, desc: 'High-priority push text for critical events.' },
                                        { id: 'push', label: 'Mobile Push', icon: AppWindow, desc: 'Mobile app notifications for on-the-go tracking.' }
                                    ].map((channel) => (
                                        <div key={channel.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 rounded-lg bg-white shadow-sm border border-slate-100 text-slate-600">
                                                    <channel.icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{channel.label}</p>
                                                    <p className="text-xs text-slate-500">{channel.desc}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={channels[channel.id as keyof api.ChannelAvailability]}
                                                onCheckedChange={(v) => handleToggleChannel(channel.id as keyof api.ChannelAvailability, v)}
                                                disabled={prefMutation.isPending}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="management" className="mt-6">
                    <div className="space-y-6">
                        <Tabs value={managementTab} onValueChange={setManagementTab} className="w-full">
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <TabsList className="bg-slate-50 p-1 border border-slate-200 h-9">
                                    <TabsTrigger value="rules" className="h-7 text-xs px-4">Routing Rules</TabsTrigger>
                                    <TabsTrigger value="groups" className="h-7 text-xs px-4">Groups</TabsTrigger>
                                    <TabsTrigger value="delegations" className="h-7 text-xs px-4">Delegations</TabsTrigger>
                                </TabsList>

                                <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50" onClick={() => setIsCreateOpen(true)}>
                                    <Plus className="w-3 h-3 mr-1.5" />
                                    {managementTab === 'rules' ? 'New Rule' : managementTab === 'groups' ? 'New Group' : 'New Delegation'}
                                </Button>
                            </div>

                            <TabsContent value="rules" className="mt-4">
                                <UpgradeGate
                                    module="notification_routing"
                                    featureName="Operational Routing"
                                    requiredPlan="growth"
                                    description="Configure complex notification routing rules to ensure the right people are notified at the right time."
                                >
                                    <Card className="shadow-none border-slate-200">
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500">
                                                    <TableRow>
                                                        <TableHead>Event Code</TableHead>
                                                        <TableHead>Target Groups</TableHead>
                                                        <TableHead>Channels</TableHead>
                                                        <TableHead className="text-right">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {isLoadingRules ? <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></TableCell></TableRow> : (
                                                        rulesData?.data?.rules?.map(rule => (
                                                            <TableRow key={rule.id} className="text-sm">
                                                                <TableCell className="font-mono text-[11px] font-semibold text-slate-700">{rule.event_type}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {rule.relationships?.recipient_groups?.data?.map(g => (
                                                                            <Badge key={g.id} variant="secondary" className="bg-slate-100 text-slate-600 border-none font-normal text-[10px]">{g.name}</Badge>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex gap-1">
                                                                        {rule.channel_types.map(c => <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold uppercase">{c}</span>)}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Badge className={rule.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}>
                                                                        {rule.is_active ? 'Active' : 'Muted'}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                    {rulesData?.data?.rules?.length === 0 && <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm italic">No routing rules defined.</TableCell></TableRow>}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </UpgradeGate>
                            </TabsContent>

                            <TabsContent value="groups" className="mt-4">
                                <UpgradeGate
                                    module="notification_groups"
                                    featureName="Notification Groups"
                                    requiredPlan="growth"
                                    description="Create and manage user groups for targeted notification delivery."
                                >
                                    <Card className="shadow-none border-slate-200">
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500">
                                                    <TableRow>
                                                        <TableHead>Cluster Name</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>Members</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {isLoadingGroups ? <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></TableCell></TableRow> : (
                                                        groupsData?.data?.groups?.map(group => (
                                                            <TableRow key={group.id} className="text-sm">
                                                                <TableCell className="font-bold text-slate-900">{group.name}</TableCell>
                                                                <TableCell className="text-slate-500 line-clamp-1 max-w-[200px]">{group.description || '-'}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex -space-x-2">
                                                                        {group.relationships?.users?.data?.slice(0, 4).map(u => (
                                                                            <div key={u.id} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold" title={u.name}>
                                                                                {u.name?.charAt(0)}
                                                                            </div>
                                                                        ))}
                                                                        {(group.relationships?.users?.data?.length || 0) > 4 && (
                                                                            <div className="w-6 h-6 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[9px] font-bold text-indigo-600">
                                                                                +{(group.relationships?.users?.data?.length || 0) - 4}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold">Manage</Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                    {groupsData?.data?.groups?.length === 0 && <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm italic">No user groups found.</TableCell></TableRow>}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </UpgradeGate>
                            </TabsContent>

                            <TabsContent value="delegations" className="mt-4">
                                <UpgradeGate
                                    module="notification_delegation"
                                    featureName="Temporary Handover"
                                    requiredPlan="enterprise"
                                    description="Temporarily delegate your notification responsibilities to a colleague while you're away."
                                >
                                    <Card className="shadow-none border-slate-200">
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500">
                                                    <TableRow>
                                                        <TableHead>Delegate</TableHead>
                                                        <TableHead>Events</TableHead>
                                                        <TableHead>Expiry</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {isLoadingDelegations ? <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></TableCell></TableRow> : (
                                                        delegationsData?.data?.delegations?.map(del => (
                                                            <TableRow key={del.id} className="text-sm">
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                                            {del.relationships?.delegated_to.data.name?.charAt(0)}
                                                                        </div>
                                                                        <span className="font-medium text-slate-800">{del.relationships?.delegated_to.data.name}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {del.event_types.map(e => <Badge key={e} variant="outline" className="text-[9px] font-mono h-4 px-1">{e}</Badge>)}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-[11px] text-slate-600 font-medium">
                                                                    {format(new Date(del.expires_at), 'MMM d, yyyy')}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="sm" className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold">Revoke</Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                    {delegationsData?.data?.delegations?.length === 0 && <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm italic">No active delegations.</TableCell></TableRow>}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </UpgradeGate>
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end pt-2">
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold h-9 rounded-lg shadow-sm" onClick={() => window.location.href = '/settings/notifications'}>
                                <Settings2 className="w-3.5 h-3.5 mr-2" /> Full Management Suite
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={isCreateOpen} onOpenChange={(v) => !v && handleClose()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {managementTab === 'rules' ? 'Create Routing Rule' : managementTab === 'groups' ? 'Create Notification Group' : 'New Temporary Delegation'}
                        </DialogTitle>
                        <DialogDescription>
                            {managementTab === 'rules' ? 'Define automated routing conditions for operational events.' : managementTab === 'groups' ? 'Group users together to receive batch alerts.' : 'Temporarily hand over alerts to another teammate.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto px-1">
                        {managementTab === 'rules' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Trigger Notification Type</Label>
                                    <Select value={formData.notification_type_id} onValueChange={(v) => setFormData({ ...formData, notification_type_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select notification type" /></SelectTrigger>
                                        <SelectContent>
                                            {notificationTypes?.data?.map(t => (
                                                <SelectItem key={t.id} value={t.id.toString()}>
                                                    <div className="flex flex-col">
                                                        <span>{t.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">{t.code}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Delivery Channels</Label>
                                    <div className="grid grid-cols-2 gap-3 border rounded-lg p-3 bg-slate-50/50">
                                        {[
                                            { id: 'in_app', label: 'In-App' },
                                            { id: 'email', label: 'Email' },
                                            { id: 'sms', label: 'SMS' },
                                            { id: 'push', label: 'Push' }
                                        ].filter(c => !channelData?.data?.channels || channelData.data.channels[c.id as keyof api.ChannelAvailability] === true).map(c => (
                                            <div key={c.id} className="flex items-center space-x-2">
                                                <Switch
                                                    id={c.id}
                                                    checked={formData.channel_types.includes(c.id)}
                                                    onCheckedChange={(checked) => {
                                                        const channels = checked
                                                            ? [...formData.channel_types, c.id]
                                                            : formData.channel_types.filter((id: string) => id !== c.id)
                                                        setFormData({ ...formData, channel_types: channels })
                                                    }}
                                                />
                                                <Label htmlFor={c.id} className="text-xs font-semibold cursor-pointer">{c.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Target Roles</Label>
                                        <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-white">
                                            {rolesData?.data?.roles?.map(r => (
                                                <div key={r.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`role-${r.id}`}
                                                        checked={formData.recipient_roles.includes(r.attributes.name)}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                                                        onChange={(e) => {
                                                            const roles = e.target.checked
                                                                ? [...formData.recipient_roles, r.attributes.name]
                                                                : formData.recipient_roles.filter((n: string) => n !== r.attributes.name)
                                                            setFormData({ ...formData, recipient_roles: roles })
                                                        }}
                                                    />
                                                    <label htmlFor={`role-${r.id}`} className="text-[11px] font-medium capitalize">{r.attributes.name.replace(/_/g, ' ')}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Target Groups</Label>
                                        <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-white">
                                            {groupsData?.data?.groups?.map(g => (
                                                <div key={g.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`group-${g.id}`}
                                                        checked={formData.recipient_groups.includes(g.id)}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                                                        onChange={(e) => {
                                                            const groups = e.target.checked
                                                                ? [...formData.recipient_groups, g.id]
                                                                : formData.recipient_groups.filter((id: any) => id !== g.id)
                                                            setFormData({ ...formData, recipient_groups: groups })
                                                        }}
                                                    />
                                                    <label htmlFor={`group-${g.id}`} className="text-[11px] font-medium">{g.name}</label>
                                                </div>
                                            ))}
                                            {groupsData?.data?.groups?.length === 0 && <p className="text-[10px] text-slate-400 italic">No groups found.</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Specific Users (Optional)</Label>
                                    <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto bg-white">
                                        {userData?.data?.users?.map(u => (
                                            <div key={u.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`recipient-user-${u.id}`}
                                                    checked={formData.recipient_users.includes(u.id)}
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                                                    onChange={(e) => {
                                                        const users = e.target.checked
                                                            ? [...formData.recipient_users, u.id]
                                                            : formData.recipient_users.filter((id: any) => id !== u.id)
                                                        setFormData({ ...formData, recipient_users: users })
                                                    }}
                                                />
                                                <label htmlFor={`recipient-user-${u.id}`} className="text-[11px] font-medium">{u.attributes.full_name}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {managementTab === 'groups' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Group Name</Label>
                                    <Input placeholder="e.g. Night Shift Mechanics" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description (Optional)</Label>
                                    <Input placeholder="Purpose of this group..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Select Members</Label>
                                    <div className="border rounded-lg p-2 space-y-1 max-h-60 overflow-y-auto bg-slate-50">
                                        {userData?.data?.users?.map(u => (
                                            <div key={u.id} className="flex items-center space-x-2 p-2 rounded hover:bg-white transition-colors">
                                                <input
                                                    type="checkbox"
                                                    id={`user-${u.id}`}
                                                    checked={formData.user_ids.includes(u.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    onChange={(e) => {
                                                        const checked = e.target.checked
                                                        const ids = checked
                                                            ? [...formData.user_ids, u.id]
                                                            : formData.user_ids.filter((id: any) => id !== u.id)
                                                        setFormData({ ...formData, user_ids: ids })
                                                    }}
                                                />
                                                <label htmlFor={`user-${u.id}`} className="text-sm font-medium cursor-pointer flex-1">
                                                    {u.attributes.full_name} <span className="text-xs text-slate-400 font-normal ml-2">{u.attributes.email}</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {managementTab === 'delegations' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Original User</Label>
                                        <Select value={formData.initial_user_id} onValueChange={(v) => setFormData({ ...formData, initial_user_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="User on leave" /></SelectTrigger>
                                            <SelectContent>
                                                {userData?.data?.users?.map(u => (
                                                    <SelectItem key={u.id} value={u.id.toString()}>{u.attributes.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Delegate To</Label>
                                        <Select value={formData.delegated_to_id} onValueChange={(v) => setFormData({ ...formData, delegated_to_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select delegate" /></SelectTrigger>
                                            <SelectContent>
                                                {userData?.data?.users?.map(u => (
                                                    <SelectItem key={u.id} value={u.id.toString()}>{u.attributes.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Events to Delegate</Label>
                                    <div className="grid grid-cols-2 gap-2 border rounded-lg p-4 bg-slate-50 max-h-40 overflow-y-auto">
                                        {[
                                            'trip.started', 'trip.completed', 'trip.assigned',
                                            'incidents.created', 'incidents.resolved', 'incidents.closed',
                                            'maintenance.assigned', 'maintenance.completed',
                                            'geofence.alert', 'device.status_changed'
                                        ].map(s => (
                                            <div key={s} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`del-ev-${s}`}
                                                    checked={formData.event_types.includes(s)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    onChange={(e) => {
                                                        const checked = e.target.checked
                                                        const evs = checked
                                                            ? [...formData.event_types, s]
                                                            : formData.event_types.filter((id: string) => id !== s)
                                                        setFormData({ ...formData, event_types: evs })
                                                    }}
                                                />
                                                <label htmlFor={`del-ev-${s}`} className="text-[10px] font-mono leading-none">{s}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Reason (Optional)</Label>
                                    <Input placeholder="e.g. Annual Leave, Shift Change" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Expiry Date</Label>
                                    <Input type="date" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-3 pt-2">
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleSave}
                            disabled={createRuleMutation.isPending || createGroupMutation.isPending || createDelegationMutation.isPending}
                        >
                            {(createRuleMutation.isPending || createGroupMutation.isPending || createDelegationMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {managementTab === 'rules' ? 'Create Rule' : managementTab === 'groups' ? 'Create Group' : 'Assign Delegation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
