'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangle, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as api from '@/lib/api/settings'
import type { CreateWebhookReplayPayload } from '@/lib/api/settings'
import { STALE_TIME_STATIC } from '@/lib/config'
import { extractApiError } from '@/lib/utils'
import type { WebhookReplay } from '@/types'
import axios from 'axios'

const ANY = '__any__'

type FormState = {
    endpointId: string
    eventType: string
    status: 'failed' | 'dead_lettered'
    dateFrom: string
    dateTo: string
}

const emptyForm: FormState = { endpointId: ANY, eventType: ANY, status: 'failed', dateFrom: '', dateTo: '' }

/**
 * The API rejects an over-100 batch with a plain 422 and asks the caller to
 * resend with `confirm: true`. All three 422 cases (zero matches, over 500,
 * needs confirmation) share one shape with no distinguishing code, so the only
 * available signal is the message text.
 */
const needsConfirmation = (error: unknown): boolean =>
    axios.isAxiosError(error) &&
    error.response?.status === 422 &&
    /confirm/i.test(extractApiError(error, ''))

const isRateLimited = (error: unknown): boolean =>
    axios.isAxiosError(error) && error.response?.status === 429

export function WebhookReplayDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent className="sm:max-w-[560px]">
                {open && <ReplayBody onOpenChange={onOpenChange} />}
            </DialogContent>
        </Dialog>
    )
}

function ReplayBody({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
    const queryClient = useQueryClient()
    const [form, setForm] = useState<FormState>(emptyForm)
    const [pendingConfirm, setPendingConfirm] = useState<string | null>(null)
    const [queued, setQueued] = useState<WebhookReplay | null>(null)

    const { data: endpointsData } = useQuery({
        queryKey: ['webhooks', 1],
        queryFn: () => api.getWebhooks({ page: 1 }),
        staleTime: STALE_TIME_STATIC,
    })
    const { data: catalogData } = useQuery({
        queryKey: ['webhook-event-catalog'],
        queryFn: api.getWebhookEventCatalog,
        staleTime: STALE_TIME_STATIC,
    })

    const buildPayload = (confirm: boolean): CreateWebhookReplayPayload => ({
        webhook_endpoint_id: form.endpointId === ANY ? undefined : Number(form.endpointId),
        event_type: form.eventType === ANY ? undefined : form.eventType,
        status: form.status,
        date_from: form.dateFrom || undefined,
        date_to: form.dateTo || undefined,
        confirm: confirm || undefined,
    })

    const replayMutation = useMutation({
        mutationFn: (confirm: boolean) => api.createWebhookReplay(buildPayload(confirm)),
        onSuccess: (res) => {
            setPendingConfirm(null)
            setQueued(res.data)
            queryClient.invalidateQueries({ queryKey: ['webhook-replays'] })
        },
        onError: (error) => {
            // Hold the server's own wording — it carries the match count.
            setPendingConfirm(needsConfirmation(error) ? extractApiError(error, '') : null)
        },
    })

    if (queued) {
        return <ReplayProgress onClose={() => onOpenChange(false)} replay={queued} />
    }

    const error = replayMutation.error
    const showPlainError = error && !pendingConfirm

    return (
        <>
            <DialogHeader>
                <DialogTitle>Replay Deliveries</DialogTitle>
                <DialogDescription>
                    Re-sends matching deliveries as new delivery records. Originals are left untouched.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label className="text-xs">Endpoint</Label>
                    <Select onValueChange={(v) => setForm({ ...form, endpointId: v })} value={form.endpointId}>
                        <SelectTrigger className="text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ANY}>All endpoints</SelectItem>
                            {(endpointsData?.data.webhooks ?? []).map((webhook) => (
                                <SelectItem key={webhook.id} value={String(webhook.id)}>
                                    {webhook.name ?? webhook.url}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-xs">Event Type</Label>
                        <Select onValueChange={(v) => setForm({ ...form, eventType: v })} value={form.eventType}>
                            <SelectTrigger className="text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ANY}>All events</SelectItem>
                                {(catalogData?.data.events ?? []).map((event) => (
                                    <SelectItem key={event.type} value={event.type}>
                                        {event.type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Status</Label>
                        <Select
                            onValueChange={(v) => setForm({ ...form, status: v as FormState['status'] })}
                            value={form.status}
                        >
                            <SelectTrigger className="text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="dead_lettered">Dead-lettered</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-xs">From</Label>
                        <Input
                            className="text-xs"
                            onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
                            type="date"
                            value={form.dateFrom}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">To</Label>
                        <Input
                            className="text-xs"
                            onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
                            type="date"
                            value={form.dateTo}
                        />
                    </div>
                </div>

                <p className="rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500">
                    Filters combine, and leaving them all unset matches every {form.status.replace('_', '-')} delivery
                    in the organization. Replays are limited to 5 per hour.
                </p>

                {pendingConfirm && (
                    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-amber-900">{pendingConfirm}</p>
                            <p className="text-[11px] text-amber-700">
                                Every matched delivery will be re-sent to its endpoint.
                            </p>
                        </div>
                    </div>
                )}

                {showPlainError && (
                    <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                        {isRateLimited(error)
                            ? 'Replay limit reached — 5 runs per hour. Try again later.'
                            : extractApiError(error, 'Could not queue the replay.')}
                    </p>
                )}
            </div>

            <DialogFooter>
                <Button onClick={() => onOpenChange(false)} variant="ghost">
                    Cancel
                </Button>
                <Button
                    className={pendingConfirm ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}
                    disabled={replayMutation.isPending}
                    onClick={() => replayMutation.mutate(pendingConfirm !== null)}
                >
                    {replayMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {pendingConfirm ? 'Replay anyway' : 'Queue Replay'}
                </Button>
            </DialogFooter>
        </>
    )
}

function ReplayProgress({ replay, onClose }: { replay: WebhookReplay; onClose: () => void }) {
    const { data } = useQuery({
        queryKey: ['webhook-replay', replay.id],
        queryFn: () => api.getWebhookReplay(replay.id),
        initialData: { data: replay },
        // Stop polling once the run finishes.
        refetchInterval: (query) => (query.state.data?.data.status === 'completed' ? false : 2000),
    })

    const current = data.data
    const done = current.status === 'completed'
    const pct = current.total_count > 0 ? Math.round((current.replayed_count / current.total_count) * 100) : 0

    return (
        <>
            <DialogHeader>
                <DialogTitle>{done ? 'Replay Complete' : 'Replay Running'}</DialogTitle>
                <DialogDescription>
                    {done
                        ? `${current.replayed_count} of ${current.total_count} deliveries re-queued.`
                        : `Re-queueing ${current.total_count} deliveries…`}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="capitalize">{current.status}</span>
                    <span>
                        {current.replayed_count} / {current.total_count}
                    </span>
                </div>
                {!done && (
                    <p className="text-[11px] text-slate-500">
                        You can close this — the replay continues in the background.
                    </p>
                )}
            </div>

            <DialogFooter>
                <Button className="bg-slate-900" onClick={onClose}>
                    Close
                </Button>
            </DialogFooter>
        </>
    )
}

/** Compact history of replay runs, for the webhooks dashboard. */
export function WebhookReplayHistory() {
    const { data, isLoading } = useQuery({
        queryKey: ['webhook-replays'],
        queryFn: () => api.getWebhookReplays({ per_page: 5 }),
    })

    const replays = data?.data.replays ?? []
    if (isLoading || replays.length === 0) return null

    return (
        <div className="mt-5 border-t pt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <History className="h-3.5 w-3.5" /> Recent Replays
            </p>
            <ul className="mt-3 space-y-2">
                {replays.map((replay) => (
                    <li className="flex items-center justify-between text-xs" key={replay.id}>
                        <span className="text-slate-500">{new Date(replay.created_at).toLocaleString()}</span>
                        <span className="font-medium text-slate-700">
                            {replay.replayed_count}/{replay.total_count}
                            <span className="ml-1.5 font-normal capitalize text-slate-400">{replay.status}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
