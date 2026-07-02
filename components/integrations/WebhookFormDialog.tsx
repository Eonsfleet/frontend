'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Loader2, Copy, KeyRound } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWebhook, updateWebhook, WebhookEndpoint } from '@/lib/api/webhooks'
import { toast } from 'sonner'

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response
        if (response?.data?.message) return response.data.message
    }
    return fallback
}

// Event catalog per docs/webhook_ui_guide.md — the backend doesn't expose a
// "list available events" endpoint, so this mirrors the documented set rather
// than inventing one.
const EVENT_OPTIONS = [
    { value: 'trip.started', label: 'Trip Started' },
    { value: 'trip.completed', label: 'Trip Completed' },
    { value: 'trip.assigned', label: 'Trip Assigned' },
    { value: 'incident.created', label: 'Incident Created' },
    { value: 'incident.resolved', label: 'Incident Resolved' },
    { value: 'incident.closed', label: 'Incident Closed' },
    { value: 'maintenance.assigned', label: 'Maintenance Assigned' },
    { value: 'maintenance.completed', label: 'Maintenance Completed' },
    { value: 'geofence.alert', label: 'Geofence Alert' },
    { value: 'device.status_changed', label: 'Device Status Changed' },
]

const webhookSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    url: z.string().url('Enter a valid URL').refine(v => v.startsWith('https://'), 'URL must start with https://'),
    events: z.array(z.string()).min(1, 'Select at least one event'),
    is_active: z.boolean(),
    secret: z.string().optional(),
})

type WebhookFormValues = z.infer<typeof webhookSchema>

interface WebhookFormDialogProps {
    isOpen: boolean
    onClose: () => void
    initialData?: WebhookEndpoint | null
}

export function WebhookFormDialog({ isOpen, onClose, initialData }: WebhookFormDialogProps) {
    const queryClient = useQueryClient()
    const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)

    const form = useForm<WebhookFormValues>({
        resolver: zodResolver(webhookSchema) as any,
        defaultValues: {
            name: '',
            url: '',
            events: [],
            is_active: true,
            secret: '',
        },
    })

    React.useEffect(() => {
        if (!isOpen) return
        setRevealedSecret(null)
        form.reset(initialData ? {
            name: initialData.name,
            url: initialData.url,
            events: initialData.events ?? [],
            is_active: initialData.is_active,
            secret: '',
        } : {
            name: '',
            url: '',
            events: [],
            is_active: true,
            secret: '',
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData])

    const { mutate: submit, isPending } = useMutation({
        mutationFn: (values: WebhookFormValues) => {
            const payload = {
                name: values.name,
                url: values.url,
                events: values.events,
                is_active: values.is_active,
                ...(values.secret ? { secret: values.secret } : {}),
            }
            return initialData ? updateWebhook(initialData.id, payload) : createWebhook(payload)
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            // The API only returns a signing secret on creation (never on subsequent
            // reads/updates) — per docs/webhook_ui_guide.md this must be surfaced
            // immediately since it can't be retrieved again later.
            const secretKey = (res?.data as WebhookEndpoint & { secret_key?: string })?.secret_key
            if (!initialData && secretKey) {
                setRevealedSecret(secretKey)
                return
            }
            toast.success(initialData ? 'Webhook updated successfully.' : 'Webhook created successfully.')
            onClose()
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to save webhook.'))
        },
    })

    const handleCopySecret = () => {
        if (!revealedSecret) return
        navigator.clipboard.writeText(revealedSecret)
        toast.success('Secret copied to clipboard.')
    }

    const handleDone = () => {
        setRevealedSecret(null)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDone() }}>
            <DialogContent className="sm:max-w-lg">
                {revealedSecret ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <KeyRound className="h-4 w-4 text-amber-500" /> Save Your Signing Secret
                            </DialogTitle>
                            <DialogDescription>
                                This secret is shown only once. Store it securely — you&apos;ll need it to verify the{' '}
                                <code className="text-xs">X-Eonsfleet-Signature</code> header on incoming requests.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <code className="flex-1 text-xs font-mono text-slate-700 break-all">{revealedSecret}</code>
                            <Button type="button" variant="outline" size="sm" onClick={handleCopySecret}>
                                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                            </Button>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleDone} className="bg-blue-600 hover:bg-blue-700">Done</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>{initialData ? 'Edit Webhook' : 'Add Webhook'}</DialogTitle>
                            <DialogDescription>
                                Configure an endpoint to receive real-time event notifications from your fleet.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((values) => submit(values))} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Dispatch System" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Endpoint URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://example.com/webhooks/eonsfleet" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="events"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>Events</FormLabel>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3 max-h-48 overflow-y-auto">
                                                {EVENT_OPTIONS.map(opt => (
                                                    <FormField
                                                        key={opt.value}
                                                        control={form.control}
                                                        name="events"
                                                        render={({ field }) => {
                                                            const checked = field.value?.includes(opt.value)
                                                            return (
                                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={checked}
                                                                            onCheckedChange={(val) => {
                                                                                const current = field.value ?? []
                                                                                const next = val
                                                                                    ? [...current, opt.value]
                                                                                    : current.filter((v: string) => v !== opt.value)
                                                                                field.onChange(next)
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="text-xs font-normal text-slate-600 cursor-pointer">
                                                                        {opt.label}
                                                                    </FormLabel>
                                                                </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="secret"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Custom Signing Secret (optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Leave blank to auto-generate" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="is_active"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 p-3 space-y-0">
                                            <div>
                                                <FormLabel>Active</FormLabel>
                                                <p className="text-xs text-slate-500">Inactive endpoints won&apos;t receive deliveries.</p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[120px]" disabled={isPending}>
                                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {initialData ? 'Save Changes' : 'Create Webhook'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
