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

const FALLBACK_WEBHOOK_EVENTS: WebhookEventCatalogEntry[] = [
    { type: 'trip.started', description: 'A trip has been started by a driver.', example: {} },
    { type: 'trip.completed', description: 'A trip has been completed.', example: {} },
    { type: 'trip.assigned', description: 'A trip has been assigned to a driver.', example: {} },
    { type: 'location.updated', description: 'A vehicle location has been updated.', example: {} },
    { type: 'incidents.created', description: 'A new incident has been reported.', example: {} },
    { type: 'incidents.resolved', description: 'An incident has been resolved.', example: {} },
    { type: 'incidents.closed', description: 'An incident has been closed.', example: {} },
    { type: 'maintenance.assigned', description: 'A maintenance job has been assigned.', example: {} },
    { type: 'maintenance.completed', description: 'A maintenance job has been completed.', example: {} },
    { type: 'geofence.alert', description: 'A vehicle entered or exited a geofence.', example: {} },
    { type: 'device.status_changed', description: 'A tracking device changed status.', example: {} },
    { type: 'alert.speeding', description: 'A vehicle exceeded its speed limit.', example: {} },
    { type: 'alert.idling', description: 'A vehicle was detected idling.', example: {} },
]

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

function RequiredLabel({ children, className }: { children: string; className?: string }) {
    return (
        <Label className={className}>
            {children} <span className="text-red-500">*</span>
        </Label>
    )
}

function isValidWebhookUrl(value: string) {
    try {
        const url = new URL(value)
        return url.protocol === 'https:'
    } catch {
        return false
    }
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
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 shadow-none sm:max-w-[600px]">
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
    const [submitted, setSubmitted] = useState(false)

    const { data: catalogData, isLoading: catalogLoading } = useQuery({
        queryKey: ['webhook-event-catalog'],
        queryFn: api.getWebhookEventCatalog,
        staleTime: STALE_TIME_STATIC,
    })
    const categories = useMemo(
        () => buildCategories(catalogData?.data.events?.length ? catalogData.data.events : FALLBACK_WEBHOOK_EVENTS),
        [catalogData]
    )

    const isEditing = Boolean(editing)
    const [filters, setFilters] = useState<EventFilterMap>({})

    const throttleValue = form.locationThrottle.trim() === '' ? null : Number(form.locationThrottle)
    const throttleInvalid =
        throttleValue !== null && (!Number.isInteger(throttleValue) || throttleValue < 30 || throttleValue > 3600)
    const urlInvalid = !isValidWebhookUrl(form.url.trim())
    const eventsInvalid = form.events.length === 0

    const buildPayload = () => {
        const subscriptions = toSubscriptions(form.events, filters)
        return {
            url: form.url.trim(),
            name: form.name.trim() || undefined,
            description: form.description.trim() || undefined,
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
    const saveWebhook = () => {
        setSubmitted(true)
        if (urlInvalid || eventsInvalid || throttleInvalid) {
            toast.error('Please complete the required webhook fields before submitting.')
            return
        }
        if (editing) updateMutation.mutate()
        else createMutation.mutate()
    }

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
                        <Input className="shadow-none" placeholder="e.g. Primary Production" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <RequiredLabel>Endpoint URL</RequiredLabel>
                        <Input className="shadow-none" placeholder="https://your-api.com/webhooks" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                        {submitted && urlInvalid && <p className="text-xs text-red-500">Enter a valid HTTPS endpoint URL.</p>}
                        <p className="text-[11px] text-slate-500">Must be a secure HTTPS endpoint accessible over the public internet.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input className="shadow-none" placeholder="e.g. Production Analytics" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                    <RequiredLabel className="text-sm font-bold text-slate-900">Event Subscriptions</RequiredLabel>
                    <EventMultiSelect categories={categories} value={form.events} onChange={(events) => { setForm({ ...form, events }); syncFilters(events) }} />
                    {submitted && eventsInvalid && <p className="text-xs text-red-500">Choose at least one event subscription.</p>}
                    {catalogLoading && <p className="text-[11px] text-slate-500">Showing supported event values while the live catalog loads.</p>}
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
                            className="shadow-none"
                            placeholder="Server default"
                            value={form.payloadVersion}
                            onChange={(e) => setForm({ ...form, payloadVersion: e.target.value })}
                        />
                        <p className="text-[11px] text-slate-500">Pins this endpoint to a payload contract.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Location Throttle (seconds)</Label>
                        <Input
                            className="shadow-none"
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
                    disabled={isSaving}
                    className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
                    onClick={saveWebhook}
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update Webhook' : 'Create Webhook'}
                </Button>
            </DialogFooter>
        </>
    )
}
