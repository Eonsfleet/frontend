'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Webhook, Plus, Settings, Activity, Trash2, Mail, PlayCircle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/webhooks'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

const availableEvents = [
    'trip.started', 'trip.completed', 'trip.cancelled',
    'vehicle.assigned', 'vehicle.idle', 'vehicle.offline'
]

export default function WebhooksPage() {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [formData, setFormData] = useState({ name: '', url: '', secret: '', events: [] as string[] })

    const { data: webhooksData, isLoading } = useQuery({
        queryKey: ['webhooks'],
        queryFn: api.getWebhooks,
        // Mock fallback if API not implemented
        initialData: {
            data: [
                { id: '1', name: 'Slack Integration', url: 'https://hooks.slack.com/services/T00...', events: ['trip.completed', 'vehicle.offline'], is_active: true, created_at: new Date().toISOString(), last_delivery_at: new Date().toISOString() }
            ] as api.WebhookEndpoint[]
        }
    })

    const createMutation = useMutation({
        mutationFn: () => api.createWebhook({ ...formData, is_active: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            toast.success('Webhook endpoint created successfully.')
            setIsCreateOpen(false)
            setFormData({ name: '', url: '', secret: '', events: [] })
        },
        onError: () => {
            toast.error('Failed to create webhook. Check URL format.')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: api.deleteWebhook,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            toast.success('Webhook deleted.')
        }
    })

    const toggleEvent = (reqEvent: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(reqEvent)
                ? prev.events.filter(e => e !== reqEvent)
                : [...prev.events, reqEvent]
        }))
    }

    const webhooks = webhooksData?.data || []

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center break-words gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Webhooks</h1>
                    <p className="text-slate-500 mt-1">Configure real-time HTTP callbacks for external system integrations.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> Add Endpoint
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-500" />
                        Active Endpoints
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead>Endpoint Name</TableHead>
                                        <TableHead>URL</TableHead>
                                        <TableHead>Events</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {webhooks.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-slate-500">No webhooks defined.</TableCell>
                                        </TableRow>
                                    )}
                                    {webhooks.map((hook) => (
                                        <TableRow key={hook.id} className="hover:bg-slate-50/50">
                                            <TableCell>
                                                <div className="font-medium text-slate-900">{hook.name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">Last delivery: {hook.last_delivery_at ? formatDistanceToNow(new Date(hook.last_delivery_at)) + ' ago' : 'Never'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <code className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-700 font-mono truncate max-w-[200px] block">
                                                    {hook.url}
                                                </code>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {hook.events.slice(0, 2).map(e => <Badge key={e} variant="outline" className="text-[10px] uppercase font-mono">{e}</Badge>)}
                                                    {hook.events.length > 2 && <Badge variant="secondary" className="text-[10px]">+{hook.events.length - 2}</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="default" className={hook.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700'}>
                                                    {hook.is_active ? 'Active' : 'Disabled'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50" title="Test Fire">
                                                        <PlayCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button onClick={() => deleteMutation.mutate(hook.id)} variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Delete">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Webhook Endpoint</DialogTitle>
                        <DialogDescription>HTTP requests will be sent to your URL when these events occur.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Description / Name</Label>
                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Prod Internal Slack Bot" />
                        </div>
                        <div className="space-y-2">
                            <Label>Payload URL</Label>
                            <Input value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://api.example.com/webhooks/eonsfleet" type="url" />
                        </div>
                        <div className="space-y-2">
                            <Label>Secret Header (Optional)</Label>
                            <Input value={formData.secret} onChange={e => setFormData({ ...formData, secret: e.target.value })} placeholder="Signing secret for verification" type="password" />
                        </div>
                        <div className="space-y-2 pt-2">
                            <Label>Trigger Events ({formData.events.length} selected)</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {availableEvents.map(ev => (
                                    <div
                                        key={ev}
                                        onClick={() => toggleEvent(ev)}
                                        className={`px-3 py-2 border rounded-md text-xs font-mono cursor-pointer transition-colors ${formData.events.includes(ev) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {ev}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-indigo-600"
                            disabled={createMutation.isPending || !formData.name || !formData.url || formData.events.length === 0}
                            onClick={() => createMutation.mutate()}
                        >
                            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Endpoint
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
