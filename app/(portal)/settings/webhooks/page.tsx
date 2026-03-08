'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Webhook as WebhookIcon, Plus, MoreVertical, Edit2, Trash,
    Loader2, Activity, ShieldCheck, History, CheckCircle2,
    XCircle, Clock, Copy, Send, ExternalLink, Check, ChevronDown
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const EVENT_CATEGORIES = [
    {
        title: 'Trips',
        events: [
            { id: 'trip.started', label: 'Trip Started' },
            { id: 'trip.completed', label: 'Trip Completed' },
            { id: 'trip.assigned', label: 'Trip Assigned' }
        ]
    },
    {
        title: 'Incidents',
        events: [
            { id: 'incidents.created', label: 'Incident Created' },
            { id: 'incidents.resolved', label: 'Incident Resolved' },
            { id: 'incidents.closed', label: 'Incident Closed' }
        ]
    },
    {
        title: 'Maintenance',
        events: [
            { id: 'maintenance.assigned', label: 'Maintenance Assigned' },
            { id: 'maintenance.completed', label: 'Maintenance Completed' }
        ]
    },
    {
        title: 'Geofencing',
        events: [
            { id: 'geofence.alert', label: 'Geofence Alert' }
        ]
    },
    {
        title: 'System',
        events: [
            { id: 'device.status_changed', label: 'Device Status Changed' }
        ]
    }
]

export default function WebhooksPage() {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSecretOpen, setIsSecretOpen] = useState(false)
    const [newSecret, setNewSecret] = useState('')
    const [editingWebhook, setEditingWebhook] = useState<any>(null)
    const [historyId, setHistoryId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        url: '',
        description: '',
        events: [] as string[],
        status: 'active' as 'active' | 'inactive'
    })

    const { data: webhooksData, isLoading } = useQuery({
        queryKey: ['settings-webhooks'],
        queryFn: api.getWebhooks
    })

    const createMutation = useMutation({
        mutationFn: api.createWebhook,
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['settings-webhooks'] })
            toast.success('Webhook registered successfully')
            if (res.data.attributes.secret_key) {
                setNewSecret(res.data.attributes.secret_key)
                setIsSecretOpen(true)
            }
            handleClose()
        },
        onError: () => toast.error('Failed to register webhook')
    })

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.updateWebhook(editingWebhook.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-webhooks'] })
            toast.success('Webhook updated successfully')
            handleClose()
        },
        onError: () => toast.error('Failed to update webhook')
    })

    const deleteMutation = useMutation({
        mutationFn: api.deleteWebhook,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-webhooks'] })
            toast.success('Webhook deleted')
        },
        onError: () => toast.error('Failed to delete webhook')
    })

    const testMutation = useMutation({
        mutationFn: api.testWebhook,
        onSuccess: () => toast.success('Test event sent successfully'),
        onError: () => toast.error('Ping test failed')
    })

    const handleClose = () => {
        setIsCreateOpen(false)
        setEditingWebhook(null)
        setFormData({ url: '', description: '', events: [], status: 'active' })
    }

    const handleEdit = (webhook: any) => {
        setEditingWebhook(webhook)
        setFormData({
            url: webhook.attributes.url,
            description: webhook.attributes.description || '',
            events: webhook.attributes.events,
            status: webhook.attributes.status
        })
        setIsCreateOpen(true)
    }

    const toggleEvent = (eventId: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(eventId)
                ? prev.events.filter(id => id !== eventId)
                : [...prev.events, eventId]
        }))
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.info('Copied to clipboard')
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Webhooks</h1>
                    <p className="text-slate-500 mt-1">Receive real-time notifications by subscribing to system events.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> Add Endpoint
                </Button>
            </div>

            <div className="grid gap-4">
                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                ) : !webhooksData?.data?.webhooks || webhooksData.data.webhooks.length === 0 ? (
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="py-12 text-center">
                            <WebhookIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">No Webhooks Found</h3>
                            <p className="text-slate-500 max-w-xs mx-auto mt-2">
                                Register an endpoint to start receiving events for trips, incidents, and more.
                            </p>
                        </CardContent>
                    </Card>
                ) : webhooksData?.data?.webhooks?.map((webhook: any) => (
                    <Card key={webhook.id} className="shadow-sm border-slate-200 hover:border-indigo-200 transition-colors">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                        webhook.attributes.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-slate-900">{webhook.attributes.description || 'Unnamed Endpoint'}</h3>
                                            <Badge variant="outline" className={cn("text-[10px] h-5", webhook.attributes.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200")}>
                                                {webhook.attributes.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-mono text-slate-500 break-all">{webhook.attributes.url}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {webhook.attributes.events.slice(0, 3).map((ev: string) => (
                                                <Badge key={ev} variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-600 font-medium">
                                                    {ev}
                                                </Badge>
                                            ))}
                                            {webhook.attributes.events.length > 3 && (
                                                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-400">
                                                    +{webhook.attributes.events.length - 3} more
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500" onClick={() => testMutation.mutate(webhook.id)}>
                                                    <Send className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Send Test Ping</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <DeliveryHistorySheet webhookId={webhook.id}>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500">
                                            <History className="w-4 h-4" />
                                        </Button>
                                    </DeliveryHistorySheet>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(webhook)}>
                                                <Edit2 className="w-4 h-4 mr-2" /> Edit Endpoint
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this webhook?')) {
                                                        deleteMutation.mutate(webhook.id)
                                                    }
                                                }}
                                            >
                                                <Trash className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Registration/Edit Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-6 border-b bg-slate-50/50">
                        <DialogTitle>{editingWebhook ? 'Edit' : 'Register'} Webhook Endpoint</DialogTitle>
                        <DialogDescription>
                            Configure the URL and events you want to listen to.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="url" className="text-sm font-semibold">Endpoint URL <span className="text-red-500">*</span></Label>
                                <Input
                                    id="url"
                                    placeholder="https://your-api.com/webhooks"
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                />
                                <p className="text-[11px] text-slate-500">Must be a secure HTTPS endpoint accessible over the public internet.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="desc" className="text-sm font-semibold">Description</Label>
                                <Input
                                    id="desc"
                                    placeholder="e.g. Production Analytics"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {editingWebhook && (
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-semibold">Webhook Status</Label>
                                        <p className="text-[11px] text-slate-500">Enable or disable delivery temporarily.</p>
                                    </div>
                                    <Switch
                                        checked={formData.status === 'active'}
                                        onCheckedChange={checked => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold text-slate-900">Event Subscriptions</Label>
                                <Button variant="link" size="sm" className="h-auto p-0 text-indigo-600 text-xs" onClick={() => {
                                    const all = EVENT_CATEGORIES.flatMap(c => c.events.map(e => e.id))
                                    setFormData(prev => ({ ...prev, events: prev.events.length === all.length ? [] : all }))
                                }}>
                                    {formData.events.length === EVENT_CATEGORIES.flatMap(c => c.events).length ? 'Unselect All' : 'Select All'}
                                </Button>
                            </div>

                            <div className="grid gap-6">
                                {EVENT_CATEGORIES.map(category => (
                                    <div key={category.title} className="space-y-2.5">
                                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{category.title}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {category.events.map(event => (
                                                <div
                                                    key={event.id}
                                                    className={cn(
                                                        "flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer hover:bg-slate-50",
                                                        formData.events.includes(event.id) ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200"
                                                    )}
                                                    onClick={() => toggleEvent(event.id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.events.includes(event.id)}
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                                        readOnly
                                                    />
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium text-slate-900 leading-none">{event.label}</p>
                                                        <p className="text-[10px] font-mono text-slate-500">{event.id}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 border-t bg-slate-50">
                        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                        <Button
                            disabled={!formData.url || formData.events.length === 0 || createMutation.isPending || updateMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
                            onClick={() => {
                                if (editingWebhook) updateMutation.mutate(formData)
                                else createMutation.mutate(formData)
                            }}
                        >
                            {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editingWebhook ? 'Update Webhook' : 'Create Webhook'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Secret Key Modal */}
            <Dialog open={isSecretOpen} onOpenChange={setIsSecretOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Secure Signing Secret
                        </DialogTitle>
                        <DialogDescription>
                            Verify the authenticity of incoming webhooks using this secret. **Save it now**, it won't be shown again.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <div className="flex gap-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
                            <code className="text-sm font-mono text-emerald-400 flex-1 truncate">{newSecret}</code>
                            <button onClick={() => copyToClipboard(newSecret)} className="text-slate-400 hover:text-white transition-colors">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full bg-slate-900" onClick={() => setIsSecretOpen(false)}>I have saved the secret</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function DeliveryHistorySheet({ webhookId, children }: { webhookId: string, children: React.ReactNode }) {
    const { data: deliveries, isLoading } = useQuery({
        queryKey: ['webhook-deliveries', webhookId],
        queryFn: () => api.getWebhookDeliveries(webhookId),
        enabled: !!webhookId
    })

    return (
        <Sheet>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="sm:max-w-md flex flex-col p-0">
                <SheetHeader className="p-6 border-b bg-slate-50/50">
                    <SheetTitle>Delivery History</SheetTitle>
                    <SheetDescription>Recent event attempts and execution results.</SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        {isLoading ? (
                            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                        ) : !deliveries?.data?.deliveries || deliveries.data.deliveries.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 text-sm">No recent delivery attempts found.</div>
                        ) : (
                            deliveries.data.deliveries.map((delivery: any) => (
                                <DeliveryItem key={delivery.id} delivery={delivery} />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

function DeliveryItem({ delivery }: { delivery: any }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const attr = delivery.attributes
    const success = attr.response_code >= 200 && attr.response_code < 300

    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        success ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                    <div>
                        <p className="text-sm font-bold text-slate-900">{attr.event_type}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                            {format(new Date(attr.created_at), 'MMM d, HH:mm:ss')} • {attr.duration_ms}ms
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5", success ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                        {attr.response_code}
                    </Badge>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                </div>
            </div>

            {isExpanded && (
                <div className="p-3 border-t bg-slate-50 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Request Payload</Label>
                        <pre className="text-[11px] p-2 bg-slate-900 text-slate-300 rounded overflow-x-auto">
                            {JSON.stringify(attr.payload, null, 2)}
                        </pre>
                    </div>
                    {attr.response_body && (
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Response Body</Label>
                            <div className="text-[11px] p-2 bg-white border border-slate-200 text-slate-600 rounded break-all">
                                {attr.response_body}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
