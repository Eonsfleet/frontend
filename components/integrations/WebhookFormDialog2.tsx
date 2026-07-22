'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import * as api from '@/lib/api/settings'
import type { Webhook } from '@/types'
import { EventMultiSelect, type EventCategory } from './EventMultiSelect'

const EVENT_CATEGORIES: EventCategory[] = [
    { title: 'Trips', events: [
        { id: 'trip.started', label: 'Trip Started' },
        { id: 'trip.completed', label: 'Trip Completed' },
        { id: 'trip.assigned', label: 'Trip Assigned' },
    ] },
    { title: 'Location', events: [
        { id: 'location.updated', label: 'Location Updated' },
    ] },
    { title: 'Fuel', events: [
        { id: 'fuel_alert_rule.triggered', label: 'Fuel Alert Triggered', disabled: true, disabledNote: 'Configured per rule under Fuel → Alert Rules, not here' },
    ] },
    { title: 'Incidents', events: [
        { id: 'incidents.created', label: 'Incident Created' },
        { id: 'incidents.resolved', label: 'Incident Resolved' },
        { id: 'incidents.closed', label: 'Incident Closed' },
    ] },
    { title: 'Maintenance', events: [
        { id: 'maintenance.assigned', label: 'Maintenance Assigned' },
        { id: 'maintenance.completed', label: 'Maintenance Completed' },
    ] },
    { title: 'Geofencing', events: [{ id: 'geofence.alert', label: 'Geofence Alert' }] },
    { title: 'Device', events: [{ id: 'device.status_changed', label: 'Device Status Changed' }] },
]

type FormState = { name: string; url: string; description: string; events: string[]; status: 'active' | 'inactive' }

const emptyForm: FormState = { name: '', url: '', description: '', events: [], status: 'active' }

function computeInitialForm(editing?: Webhook | null, duplicateFrom?: Webhook | null): FormState {
    if (editing) {
        return { name: editing.name ?? '', url: editing.url, description: editing.description ?? '', events: editing.events, status: editing.status }
    }
    if (duplicateFrom) {
        return { name: `${duplicateFrom.name ?? 'Webhook'} (copy)`, url: '', description: duplicateFrom.description ?? '', events: duplicateFrom.events, status: 'active' }
    }
    return emptyForm
}

export function WebhookFormDialog2({
    open,
    onOpenChange,
    editing,
    duplicateFrom,
    onSecretIssued,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    editing?: Webhook | null
    duplicateFrom?: Webhook | null
    onSecretIssued: (secret: string) => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[600px]">
                {open && (
                    <WebhookFormBody
                        key={editing?.id ?? duplicateFrom?.id ?? 'create'}
                        editing={editing}
                        duplicateFrom={duplicateFrom}
                        onOpenChange={onOpenChange}
                        onSecretIssued={onSecretIssued}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}

function WebhookFormBody({
    editing,
    duplicateFrom,
    onOpenChange,
    onSecretIssued,
}: {
    editing?: Webhook | null
    duplicateFrom?: Webhook | null
    onOpenChange: (open: boolean) => void
    onSecretIssued: (secret: string) => void
}) {
    const queryClient = useQueryClient()
    const [form, setForm] = useState<FormState>(() => computeInitialForm(editing, duplicateFrom))

    const createMutation = useMutation({
        mutationFn: () => api.createWebhook({ url: form.url, name: form.name || undefined, description: form.description || undefined, events: form.events }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            toast.success('Webhook created')
            if (res.data.secret_key) onSecretIssued(res.data.secret_key)
            onOpenChange(false)
        },
        onError: () => toast.error('Failed to create webhook'),
    })

    const updateMutation = useMutation({
        mutationFn: () => api.updateWebhook(String(editing!.id), { url: form.url, name: form.name || undefined, description: form.description || undefined, events: form.events, status: form.status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            toast.success('Webhook updated')
            onOpenChange(false)
        },
        onError: () => toast.error('Failed to update webhook'),
    })

    const isSaving = createMutation.isPending || updateMutation.isPending
    const title = editing ? 'Edit Webhook Endpoint' : duplicateFrom ? 'Duplicate Webhook Endpoint' : 'Register Webhook Endpoint'

    return (
        <>
            <DialogHeader className="border-b bg-slate-50/50 p-6">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>Configure the URL, name, and events for this endpoint.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input placeholder="e.g. Primary Production" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Endpoint URL</Label>
                        <Input placeholder="https://your-api.com/webhooks" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                        <p className="text-[11px] text-slate-500">Must be a secure HTTPS endpoint accessible over the public internet.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="e.g. Production Analytics" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    {editing && (
                        <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                            <div>
                                <Label className="text-sm font-semibold">Status</Label>
                                <p className="text-[11px] text-slate-500">Enable or disable delivery temporarily.</p>
                            </div>
                            <Switch checked={form.status === 'active'} onCheckedChange={(checked) => setForm({ ...form, status: checked ? 'active' : 'inactive' })} />
                        </div>
                    )}
                </div>
                <div className="space-y-2 border-t pt-4">
                    <Label className="text-sm font-bold text-slate-900">Event Subscriptions</Label>
                    <EventMultiSelect categories={EVENT_CATEGORIES} value={form.events} onChange={(events) => setForm({ ...form, events })} />
                </div>
            </div>
            <DialogFooter className="border-t bg-slate-50 p-4">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button
                    disabled={!form.url || form.events.length === 0 || isSaving}
                    className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
                    onClick={() => (editing ? updateMutation.mutate() : createMutation.mutate())}
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update Webhook' : 'Create Webhook'}
                </Button>
            </DialogFooter>
        </>
    )
}
