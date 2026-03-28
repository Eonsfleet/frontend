'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Settings, ScrollText, PlayCircle, Loader2, ArrowRight, BellRing, Users as UsersIcon, CalendarClock, ShieldAlert, Target } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/notifications'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { RoleGate } from '@/components/shared/RoleGate'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'

export default function NotificationRulesPage() {
    const queryClient = useQueryClient()
    const { hasCapability } = useSubscription()
    const [activeTab, setActiveTab] = useState('rules')
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

    // Data Fetching
    const { data: userData } = useQuery({
        queryKey: ['users-list-simple'],
        queryFn: () => import('@/lib/api/settings').then(api => api.getUsers({ per_page: 100 }))
    })

    const { data: rulesData, isLoading: isLoadingRules } = useQuery({
        queryKey: ['notification-rules'],
        queryFn: api.getRules,
        enabled: activeTab === 'rules'
    })

    const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
        queryKey: ['notification-groups'],
        queryFn: api.getGroups,
        enabled: activeTab === 'groups'
    })

    const { data: delegationsData, isLoading: isLoadingDelegations } = useQuery({
        queryKey: ['notification-delegations'],
        queryFn: api.getDelegations,
        enabled: activeTab === 'delegations'
    })

    const { data: channelData } = useQuery({
        queryKey: ['channel-availability'],
        queryFn: api.getChannelAvailability
    })

    const { data: notificationTypes } = useQuery({
        queryKey: ['notification-types'],
        queryFn: () => api.getNotificationTypes({ configurable: true }),
        enabled: activeTab === 'rules'
    })

    const { data: rolesData } = useQuery({
        queryKey: ['settings-roles-simple'],
        queryFn: () => import('@/lib/api/settings').then(api => api.getRoles()),
        enabled: activeTab === 'rules'
    })

    // Mutations
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
        if (activeTab === 'rules') {
            if (!formData.notification_type_id) return toast.error('Please select a notification type')
            createRuleMutation.mutate({
                notification_type_id: parseInt(formData.notification_type_id),
                is_enabled: formData.is_enabled,
                channel_types: formData.channel_types,
                recipient_groups: formData.recipient_groups,
                recipient_roles: formData.recipient_roles,
                recipient_users: formData.recipient_users
            })
        } else if (activeTab === 'groups') {
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

    const EVENT_SLUGS = [
        'trip.started', 'trip.completed', 'trip.assigned',
        'incidents.created', 'incidents.resolved', 'incidents.closed',
        'maintenance.assigned', 'maintenance.completed',
        'geofence.alert', 'device.status_changed'
    ]

    const ALL_CHANNELS = [
        { id: 'in_app', label: 'In-App', icon: BellRing },
        { id: 'email', label: 'Email', icon: ScrollText },
        { id: 'sms', label: 'SMS', icon: Settings },
        { id: 'push', label: 'Push', icon: PlayCircle }
    ]

    const availableChannels = ALL_CHANNELS.filter(c =>
        !channelData?.data?.channels || channelData.data.channels[c.id as keyof api.ChannelAvailability] === true
    )

    return (
        <RoleGate allowedRoles={['administrator']} fallbackMessage="Custom notification settings are restricted to Administrators only.">
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Advanced Notifications</h1>
                    <p className="text-slate-500 mt-1">Manage complex routing, user groups, and temporary delegations.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 h-10 w-fit">
                    <Plus className="w-4 h-4 mr-2" />
                    {activeTab === 'rules' ? 'Create Rule' : activeTab === 'groups' ? 'Create Group' : 'Add Delegation'}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="bg-slate-100/50 p-1 border border-slate-200">
                    <TabsTrigger value="rules" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Target className="w-4 h-4" /> Routing Rules
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <UsersIcon className="w-4 h-4" /> Groups
                    </TabsTrigger>
                    <TabsTrigger value="delegations" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <CalendarClock className="w-4 h-4" /> Delegations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="rules" className="mt-6">
                    <UpgradeGate
                        module="notification_routing"
                        featureName="Intelligent Notification Routing"
                        description="Route specific events to targeted groups or roles based on complex conditions."
                        requiredPlan="growth"
                    >
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                    <BellRing className="w-4 h-4 text-slate-500" />
                                    Active Routing Logic
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoadingRules ? <LoadingState /> : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow>
                                                    <TableHead>Event</TableHead>
                                                    <TableHead>Condition</TableHead>
                                                    <TableHead>Channels</TableHead>
                                                    <TableHead>Target Groups</TableHead>
                                                    <TableHead className="text-right">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rulesData?.data?.rules?.map((rule) => (
                                                    <TableRow key={rule.id} className="hover:bg-slate-50/50">
                                                        <TableCell><Badge variant="outline" className="font-mono text-[10px]">{rule.event_type}</Badge></TableCell>
                                                        <TableCell className="text-xs font-mono text-indigo-600">{rule.condition || 'Always'}</TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
                                                                {rule.channel_types.map(c => (
                                                                    <Badge key={c} variant="secondary" className="text-[10px] uppercase">{c}</Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {rule.relationships?.recipient_groups?.data?.map(g => (
                                                                <Badge key={g.id} className="mr-1 h-5 text-[10px] bg-slate-100 text-slate-700 hover:bg-slate-100 border-none">{g.name}</Badge>
                                                            ))}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={rule.is_active ? 'default' : 'secondary'} className={rule.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200' : ''}>
                                                                {rule.is_active ? 'Active' : 'Disabled'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {rulesData?.data?.rules?.length === 0 && <EmptyTableRow colSpan={5} message="No routing rules configured." />}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </UpgradeGate>
                </TabsContent>

                <TabsContent value="groups" className="mt-6">
                    <UpgradeGate
                        module="notification_groups"
                        featureName="Dynamic Notification Groups"
                        description="Cluster users together to receive relevant operational alerts based on shift, region, or department."
                        requiredPlan="growth"
                    >
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                    <UsersIcon className="w-4 h-4 text-slate-500" />
                                    Managed User Clusters
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoadingGroups ? <LoadingState /> : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow>
                                                    <TableHead>Group Name</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Members</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {groupsData?.data?.groups?.map((group) => (
                                                    <TableRow key={group.id} className="hover:bg-slate-50/50">
                                                        <TableCell className="font-bold text-slate-900">{group.name}</TableCell>
                                                        <TableCell className="text-sm text-slate-500">{group.description || '-'}</TableCell>
                                                        <TableCell>
                                                            <div className="flex -space-x-2">
                                                                {group.relationships?.users?.data?.slice(0, 5).map(u => (
                                                                    <div key={u.id} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold" title={u.name}>
                                                                        {u.name?.charAt(0)}
                                                                    </div>
                                                                ))}
                                                                {(group.relationships?.users?.data?.length || 0) > 5 && (
                                                                    <div className="w-7 h-7 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                                        +{(group.relationships?.users?.data?.length || 0) - 5}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">Manage Members</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {groupsData?.data?.groups?.length === 0 && <EmptyTableRow colSpan={4} message="No notification groups found." />}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </UpgradeGate>
                </TabsContent>

                <TabsContent value="delegations" className="mt-6">
                    <UpgradeGate
                        module="notification_delegation"
                        featureName="Temporary Delegations"
                        description="Smoothly hand over notification responsibilities during leaves or shift changes without messing with role configurations."
                        requiredPlan="enterprise"
                    >
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                    <CalendarClock className="w-4 h-4 text-slate-500" />
                                    Active Responsibilities
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoadingDelegations ? <LoadingState /> : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow>
                                                    <TableHead>Recipient</TableHead>
                                                    <TableHead>Events</TableHead>
                                                    <TableHead>Expires At</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {delegationsData?.data?.delegations?.map((del) => (
                                                    <TableRow key={del.id} className="hover:bg-slate-50/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                                    {del.relationships?.delegated_to.data.name?.charAt(0)}
                                                                </div>
                                                                <span className="font-medium">{del.relationships?.delegated_to.data.name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {del.event_types.map(e => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-600">
                                                            {format(new Date(del.expires_at), 'PPP')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">Active</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm" className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50">Revoke</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {delegationsData?.data?.delegations?.length === 0 && <EmptyTableRow colSpan={5} message="No active delegations." />}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </UpgradeGate>
                </TabsContent>
            </Tabs>

            <Dialog open={isCreateOpen} onOpenChange={(v) => !v && handleClose()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {activeTab === 'rules' ? 'Create Routing Rule' : activeTab === 'groups' ? 'Create Notification Group' : 'New Temporary Delegation'}
                        </DialogTitle>
                        <DialogDescription>
                            {activeTab === 'rules' ? 'Define automated routing conditions for operational events.' : activeTab === 'groups' ? 'Group users together to receive batch alerts.' : 'Temporarily hand over alerts to another teammate.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-1">
                        {activeTab === 'rules' && (
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
                                    <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-slate-50">
                                        {availableChannels.map(c => (
                                            <div key={c.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={c.id}
                                                    checked={formData.channel_types.includes(c.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    onChange={(e) => {
                                                        const checked = e.target.checked
                                                        const channels = checked
                                                            ? [...formData.channel_types, c.id]
                                                            : formData.channel_types.filter((id: string) => id !== c.id)
                                                        setFormData({ ...formData, channel_types: channels })
                                                    }}
                                                />
                                                <label htmlFor={c.id} className="text-sm font-medium leading-none">{c.label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Target Roles</Label>
                                        <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-slate-50/50">
                                            {rolesData?.data?.roles?.map(role => (
                                                <div key={role.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`role-${role.id}`}
                                                        checked={formData.recipient_roles.includes(role.attributes.name)}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        onChange={(e) => {
                                                            const roles = e.target.checked
                                                                ? [...formData.recipient_roles, role.attributes.name]
                                                                : formData.recipient_roles.filter((r: string) => r !== role.attributes.name)
                                                            setFormData({ ...formData, recipient_roles: roles })
                                                        }}
                                                    />
                                                    <label htmlFor={`role-${role.id}`} className="text-xs font-medium capitalize">{role.attributes.name.replace(/_/g, ' ')}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Target Groups</Label>
                                        <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-slate-50/50">
                                            {groupsData?.data?.groups?.map(g => (
                                                <div key={g.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`group-${g.id}`}
                                                        checked={formData.recipient_groups.includes(g.id)}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        onChange={(e) => {
                                                            const checked = e.target.checked
                                                            const groups = checked
                                                                ? [...formData.recipient_groups, g.id]
                                                                : formData.recipient_groups.filter((id: any) => id !== g.id)
                                                            setFormData({ ...formData, recipient_groups: groups })
                                                        }}
                                                    />
                                                    <label htmlFor={`group-${g.id}`} className="text-xs font-medium">{g.name}</label>
                                                </div>
                                            ))}
                                            {groupsData?.data?.groups?.length === 0 && <p className="text-[10px] text-slate-400 italic">No groups found.</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Specific Users (Optional)</Label>
                                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-slate-50/50">
                                        {userData?.data?.users?.map(u => (
                                            <div key={u.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`rule-user-${u.id}`}
                                                    checked={formData.recipient_users.includes(u.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    onChange={(e) => {
                                                        const users = e.target.checked
                                                            ? [...formData.recipient_users, u.id]
                                                            : formData.recipient_users.filter((id: any) => id !== u.id)
                                                        setFormData({ ...formData, recipient_users: users })
                                                    }}
                                                />
                                                <label htmlFor={`rule-user-${u.id}`} className="text-xs font-medium">
                                                    {u.attributes.full_name} <span className="text-[10px] text-slate-400">({u.attributes.email})</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'groups' && (
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

                        {activeTab === 'delegations' && (
                            <>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Original Recipient (Source)</Label>
                                        <Select value={formData.initial_user_id} onValueChange={(v) => setFormData({ ...formData, initial_user_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Who is delegating?" /></SelectTrigger>
                                            <SelectContent>
                                                {userData?.data?.users?.map(u => (
                                                    <SelectItem key={u.id} value={u.id.toString()}>{u.attributes.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Delegate To (Destination)</Label>
                                        <Select value={formData.delegated_to_id} onValueChange={(v) => setFormData({ ...formData, delegated_to_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select a colleague" /></SelectTrigger>
                                            <SelectContent>
                                                {userData?.data?.users?.map(u => (
                                                    u.id.toString() !== formData.initial_user_id && (
                                                        <SelectItem key={u.id} value={u.id.toString()}>{u.attributes.full_name}</SelectItem>
                                                    )
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Events to Delegate</Label>
                                    <div className="grid grid-cols-2 gap-2 border rounded-lg p-4 bg-slate-50 max-h-40 overflow-y-auto">
                                        {EVENT_SLUGS.map(s => (
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Expiry Date</Label>
                                        <Input type="date" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reason for Handover</Label>
                                        <Input placeholder="e.g. Annual Leave" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                                    </div>
                                </div>
                            </>
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
                            {activeTab === 'rules' ? 'Create Rule' : activeTab === 'groups' ? 'Create Group' : 'Assign Delegation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </RoleGate>
    )
}

function LoadingState() {
    return (
        <div role="status" aria-label="Loading" className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            <p className="text-sm text-slate-400 font-medium">Synchronizing configurations...</p>
        </div>
    )
}

function EmptyTableRow({ colSpan, message }: { colSpan: number, message: string }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="py-20 text-center">
                <div className="flex flex-col items-center justify-center opacity-40">
                    <ScrollText className="w-10 h-10 mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">{message}</p>
                </div>
            </TableCell>
        </TableRow>
    )
}
