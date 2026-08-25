'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api/settings'
import type { WebhookAttemptErrorType, WebhookDelivery, WebhookDeliveryAttempt } from '@/types'

/**
 * Why an attempt failed, in the words an operator needs. `ssrf_blocked` in
 * particular is not a fault on the receiving end — the URL resolved to an
 * internal or loopback address and was refused before any request went out.
 */
const ERROR_COPY: Record<WebhookAttemptErrorType, { label: string; hint: string }> = {
    ssrf_blocked: {
        label: 'Blocked',
        hint: 'The URL resolved to an internal, private or loopback address. Nothing was sent.',
    },
    http_4xx: {
        label: 'Rejected (4xx)',
        hint: 'The endpoint answered but refused the request. Usually auth or signature verification.',
    },
    http_5xx: {
        label: 'Server error (5xx)',
        hint: 'The endpoint accepted the request and then failed to handle it.',
    },
    rate_limited: {
        label: 'Rate limited',
        hint: 'The endpoint asked us to slow down.',
    },
    connection_error: {
        label: 'Unreachable',
        hint: 'No response — DNS failure, refused connection, or timeout.',
    },
}

export function WebhookDeliveryAttemptsSheet({
    delivery,
    onOpenChange,
}: {
    delivery: WebhookDelivery | null
    onOpenChange: (open: boolean) => void
}) {
    return (
        <Sheet open={delivery !== null} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
                {delivery && <AttemptsBody delivery={delivery} />}
            </SheetContent>
        </Sheet>
    )
}

function AttemptsBody({ delivery }: { delivery: WebhookDelivery }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['webhook-delivery-attempts', delivery.webhook_endpoint_id, delivery.id],
        queryFn: () => api.getWebhookDeliveryAttempts(delivery.webhook_endpoint_id, delivery.id, { per_page: 100 }),
    })

    const attempts = data?.data.attempts ?? []

    return (
        <>
            <SheetHeader className="space-y-1 border-b pb-4">
                <SheetTitle className="text-base">{delivery.event_type}</SheetTitle>
                <SheetDescription className="text-xs">
                    {delivery.endpoint?.name ?? delivery.endpoint?.url ?? `Endpoint #${delivery.webhook_endpoint_id}`}
                    {' · '}
                    Queued {new Date(delivery.created_at).toLocaleString()}
                </SheetDescription>
                {delivery.dead_lettered_at && (
                    <p className="pt-1 text-xs font-medium text-rose-600">
                        Dead-lettered {new Date(delivery.dead_lettered_at).toLocaleString()} — automatic retries are
                        exhausted.
                    </p>
                )}
            </SheetHeader>

            <div className="space-y-4 py-5">
                {isLoading && <p className="text-sm text-slate-500">Loading attempts…</p>}
                {isError && <p className="text-sm text-rose-600">Could not load the attempt history.</p>}
                {!isLoading && !isError && attempts.length === 0 && (
                    <p className="text-sm text-slate-500">
                        No attempts recorded yet — this delivery is still queued.
                    </p>
                )}
                {attempts.map((attempt) => (
                    <AttemptCard attempt={attempt} key={attempt.id} />
                ))}
            </div>
        </>
    )
}

function AttemptCard({ attempt }: { attempt: WebhookDeliveryAttempt }) {
    const failure = attempt.error_type ? ERROR_COPY[attempt.error_type] : null
    const succeeded = failure === null

    return (
        <section className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    {succeeded ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : attempt.error_type === 'ssrf_blocked' ? (
                        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    )}
                    <span className="text-sm font-semibold text-slate-900">Attempt {attempt.attempt_number}</span>
                </div>
                <Badge
                    className={cn(
                        'rounded-md px-2 py-0.5 text-[11px] font-medium',
                        succeeded
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-50'
                    )}
                >
                    {failure?.label ?? 'Delivered'}
                </Badge>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                    <dt className="text-slate-400">Response</dt>
                    <dd className="mt-0.5 font-medium text-slate-700">{attempt.response_status ?? '—'}</dd>
                </div>
                <div>
                    <dt className="text-slate-400">Latency</dt>
                    <dd className="mt-0.5 font-medium text-slate-700">
                        {attempt.latency_ms != null ? `${attempt.latency_ms} ms` : '—'}
                    </dd>
                </div>
                <div>
                    <dt className="text-slate-400">Started</dt>
                    <dd className="mt-0.5 font-medium text-slate-700">
                        {new Date(attempt.started_at).toLocaleTimeString()}
                    </dd>
                </div>
                <div>
                    <dt className="text-slate-400">Completed</dt>
                    <dd className="mt-0.5 font-medium text-slate-700">
                        {attempt.completed_at ? new Date(attempt.completed_at).toLocaleTimeString() : '—'}
                    </dd>
                </div>
            </dl>

            {failure && <p className="mt-3 text-xs leading-relaxed text-slate-500">{failure.hint}</p>}

            {attempt.error_message && (
                <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{attempt.error_message}</p>
            )}

            {attempt.response_body && (
                <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-blue-600">Response body</summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">
                        {attempt.response_body}
                    </pre>
                </details>
            )}
        </section>
    )
}
