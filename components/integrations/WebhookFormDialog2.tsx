'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api/settings'
import { STALE_TIME_STATIC } from '@/lib/config'
import type { Webhook, WebhookEventCatalogEntry } from '@/types'
import { EventMultiSelect, type EventCategory } from './EventMultiSelect'
import { EventFilterEditor, defaultFilter, toSubscriptions, type EventFilterMap } from './EventFilterEditor'

/**
 * Event types the register/update endpoints actually accept. The catalog at
 * GET /webhooks/events also lists `fuel_alert_rule.triggered` and `test.ping`
 * for reference, but neither is selectable here — the first is wired per Fuel
 * Alert Rule, the second only ever fires from the Test Webhook action.
 */
const NON_SELECTABLE_EVENTS: Record<string, string> = {
    'fuel_alert_rule.triggered': 'Configured per rule under Fuel → Alert Rules, not here',
    'test.ping': 'Sent only by the Test Webhook action',
}

const CATEGORY_TITLES: Record<string, string> = {
    trip: 'Trips',
    location: 'Location',
    incidents: 'Incidents',
    maintenance: 'Maintenance',
    geofence: 'Geofencing',
    device: 'Device',
    alert: 'Alerts',
    fuel_alert_rule: 'Fuel',
}

const titleCase = (segment: string) =>
    segment.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** "trip.started" → { category: "Trips", label: "Trip Started" } */
function describeEvent(type: string) {
    const [prefix, ...rest] = type.split('.')
    return {
        category: CATEGORY_TITLES[prefix] ?? titleCase(prefix),
        label: `${titleCase(prefix)} ${titleCase(rest.join('.') || '')}`.trim(),
    }
}

/**
 * Build the picker from the server's catalog rather than a local copy, so a new
 * event type becomes selectable as soon as the backend ships it.
 */
function buildCategories(catalog: WebhookEventCatalogEntry[]): EventCategory[] {
    const grouped = new Map<string, EventCategory>()

    for (const entry of catalog) {
        const { category, label } = describeEvent(entry.type)
        if (!grouped.has(category)) grouped.set(category, { title: category, events: [] })
        grouped.get(category)!.events.push({
            id: entry.type,
            label,
            disabled: entry.type in NON_SELECTABLE_EVENTS,
            disabledNote: NON_SELECTABLE_EVENTS[entry.type],
        })
    }

    return [...grouped.values()]
}

type FormState = {
    name: string
    url: string
    description: string
    events: string[]
    status: 'active' | 'inactive'
    /** Blank means "let the server pick its current default". */
    payloadVersion: string
    /** Blank means "use the server default"; otherwise 30–3600 seconds. */
    locationThrottle: string
}

const emptyForm: FormState = { name: '', url: '', description: '', events: [], status: 'active', payloadVersion: '', locationThrottle: '' }

function computeInitialForm(editing?: Webhook | null, duplicateFrom?: Webhook | null): FormState {
    if (editing) {
        return {
            name: editing.name ?? '',
            url: editing.url,
            description: editing.description ?? '',
            events: editing.events,
            status: editing.status,
            payloadVersion: editing.payload_version ?? '',
            locationThrottle: editing.location_throttle_seconds != null ? String(editing.location_throttle_seconds) : '',
        }
    }
    if (duplicateFrom) {
        return {
            name: `${duplicateFrom.name ?? 'Webhook'} (copy)`,
            url: '',
            description: duplicateFrom.description ?? '',
            events: duplicateFrom.events,
            status: 'active',
            payloadVersion: duplicateFrom.payload_version ?? '',
            locationThrottle: duplicateFrom.location_throttle_seconds != null ? String(duplicateFrom.location_throttle_seconds) : '',
        }
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

    const { data: catalogData, isLoading: catalogLoading } = useQuery({
        queryKey: ['webhook-event-catalog'],
        queryFn: api.getWebhookEventCatalog,
        staleTime: STALE_TIME_STATIC,
    })
    const categories = useMemo(
        () => buildCategories(catalogData?.data.events ?? []),
        [catalogData]
    )

    const isEditing = Boolean(editing)
    const [filters, setFilters] = useState<EventFilterMap>({})

    const throttleValue = form.locationThrottle.trim() === '' ? null : Number(form.locationThrottle)
    const throttleInvalid =
        throttleValue !== null && (!Number.isInteger(throttleValue) || throttleValue < 30 || throttleValue > 3600)

    const buildPayload = () => {
        const subscriptions = toSubscriptions(form.events, filters)
        return {
            url: form.url,
            name: form.name || undefined,
            description: form.description || undefined,
            events: form.events,
            payload_version: form.payloadVersion.trim() || undefined,
            location_throttle_seconds: throttleValue ?? undefined,
            // Omitted entirely when nothing was set, which leaves every event
            // filter-less on create and untouched on update.
            subscriptions: subscriptions.length > 0 ? subscriptions : undefined,
        }
    }

    // Keep a filter row for each selected event, dropping rows for de-selected ones.
    const syncFilters = (events: string[]) => {
        setFilters((prev) => {
            const next: EventFilterMap = {}
            for (const event of events) next[event] = prev[event] ?? defaultFilter(isEditing)
            return next
        })
    }

    const createMutation = useMutation({
        mutationFn: () => api.createWebhook(buildPayload()),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            toast.success('Webhook created')
            if (res.data.secret_key) onSecretIssued(res.data.secret_key)
            onOpenChange(false)
        },
        onError: () => toast.error('Failed to create webhook'),
    })

    const updateMutation = useMutation({
        mutationFn: () => api.updateWebhook(editing!.id, { ...buildPayload(), status: form.status }),
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
                    {catalogLoading ? (
                        <p className="text-[11px] text-slate-500">Loading available events…</p>
                    ) : (
                        <EventMultiSelect categories={categories} value={form.events} onChange={(events) => { setForm({ ...form, events }); syncFilters(events) }} />
                    )}
                </div>

                <div className="space-y-2 border-t pt-4">
                    <Label className="text-sm font-bold text-slate-900">Delivery Filters</Label>
                    <p className="text-[11px] text-slate-500">
                        Restrict an event to specific vehicles. Events left on All vehicles are delivered for the
                        whole fleet.
                    </p>
                    <EventFilterEditor
                        events={form.events}
                        filters={filters}
                        isEditing={isEditing}
                        onChange={setFilters}
                    />
                </div>

                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Payload Version</Label>
                        <Input
                            placeholder="Server default"
                            value={form.payloadVersion}
                            onChange={(e) => setForm({ ...form, payloadVersion: e.target.value })}
                        />
                        <p className="text-[11px] text-slate-500">Pins this endpoint to a payload contract.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Location Throttle (seconds)</Label>
                        <Input
                            inputMode="numeric"
                            placeholder="Server default"
                            value={form.locationThrottle}
                            onChange={(e) => setForm({ ...form, locationThrottle: e.target.value })}
                        />
                        <p className={cn('text-[11px]', throttleInvalid ? 'text-rose-600' : 'text-slate-500')}>
                            {throttleInvalid
                                ? 'Must be a whole number between 30 and 3600.'
                                : 'How often location.updated may fire per vehicle (30–3600).'}
                        </p>
                    </div>
                </div>
            </div>
            <DialogFooter className="border-t bg-slate-50 p-4">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button
                    disabled={!form.url || form.events.length === 0 || throttleInvalid || isSaving}
                    className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
                    onClick={() => (editing ? updateMutation.mutate() : createMutation.mutate())}
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update Webhook' : 'Create Webhook'}
                </Button>
            </DialogFooter>
        </>
    )
}
