'use client'

import React from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QueryError } from '@/components/shared/QueryError'
import { decideOdometerReview, getOdometerReview } from '@/lib/api/odometer'
import { extractApiError } from '@/lib/utils'
import { formatDistance, reasonLabel, responsibleLabel, reviewReadingText, reviewStatusLabel } from '@/lib/odometer'
import type { OdometerReview } from '@/types/odometer'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-medium text-slate-900">{children}</dd>
        </div>
    )
}

/** Why the person cannot decide this review, or null when they can. */
export function decisionBlocker(r: OdometerReview): string | null {
    if (r.status !== 'pending') return 'This review has already been decided.'
    if (r.level === 'support') return 'This review is decided by EonsFleet support. You can follow its progress here.'
    return null
}

export function ReviewDetail({ id }: { id: string }) {
    const queryClient = useQueryClient()
    const [reason, setReason] = React.useState('')
    const [reasonError, setReasonError] = React.useState<string | null>(null)
    const [forbidden, setForbidden] = React.useState(false)

    const { data: review, isLoading, isError, refetch } = useQuery({
        queryKey: ['odometer-review', id],
        queryFn: () => getOdometerReview(id),
    })

    const decide = useMutation({
        mutationFn: (decision: 'approve' | 'reject') => decideOdometerReview(id, decision, reason.trim()),
        onSuccess: (_r, decision) => {
            toast.success(decision === 'approve' ? 'Reading approved' : 'Reading rejected')
            setReason('')
            queryClient.invalidateQueries({ queryKey: ['odometer-review', id] })
            queryClient.invalidateQueries({ queryKey: ['odometer-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
        },
        onError: (e: unknown) => {
            if (axios.isAxiosError(e) && e.response?.status === 403) {
                setForbidden(true)
                toast.error('You are not allowed to decide this review.')
            } else {
                toast.error(extractApiError(e, 'The decision could not be saved'))
            }
        },
    })

    const submit = (decision: 'approve' | 'reject') => {
        if (!reason.trim()) {
            setReasonError('A reason is required.')
            return
        }
        setReasonError(null)
        decide.mutate(decision)
    }

    if (isLoading) return <Skeleton className="h-64 w-full" />
    if (isError || !review) return <QueryError message="Failed to load this review." onRetry={refetch} />

    const blocker = forbidden ? 'You are not allowed to decide this review.' : decisionBlocker(review)

    return (
        <div className="space-y-4">
            <Link href="/odometer/reviews" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                <ChevronLeft className="h-4 w-4" /> All reviews
            </Link>
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{review.vehicle.registration_number}</h1>
                <Badge variant={review.overdue && review.status === 'pending' ? 'destructive' : 'secondary'}>
                    {reviewStatusLabel(review.status, review.overdue)}
                </Badge>
                {review.level === 'support' && <Badge variant="outline">Support level</Badge>}
            </div>

            <Card>
                <CardHeader><CardTitle className="text-sm">Reading under review</CardTitle></CardHeader>
                <CardContent>
                    <dl>
                        <Row label="Reason flagged">{reasonLabel(review.reason)}</Row>
                        <Row label="Submitted reading">{reviewReadingText(review.reading)}</Row>
                        <Row label="Reading time">{new Date(review.reading.effective_at).toLocaleString()}</Row>
                        <Row label="Current accepted odometer">{formatDistance(review.previous_accepted_km) ?? 'None'}</Row>
                        <Row label="Proposed odometer">{formatDistance(review.proposed_km) ?? '—'}</Row>
                        <Row label="Responsible">{responsibleLabel(review.responsible)}</Row>
                        <Row label="Dashboard photo">
                            {review.has_photo ? 'Attached' : review.requires_photo ? 'Required, none attached' : 'Not required'}
                        </Row>
                        <Row label="Approvals">{review.approvals.filter(a => a.decision === 'approved').length} of {review.approvals_required}</Row>
                    </dl>
                    {review.requires_photo && !review.has_photo && (
                        <p className="mt-2 text-xs text-amber-700">
                            Approval is refused until a dashboard photo is attached to the reading.
                        </p>
                    )}
                </CardContent>
            </Card>

            {review.approvals.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="text-sm">Decisions</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            {review.approvals.map((a, i) => (
                                <li key={i}>
                                    <span className="font-semibold">{a.by.name}</span> {a.decision} on {new Date(a.at).toLocaleString()}: {a.reason}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle className="text-sm">Decide</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {blocker ? (
                        <p role="status" data-testid="decision-blocked" className="text-sm text-slate-600">{blocker}</p>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="review-reason">Reason (required)</Label>
                                <Textarea id="review-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
                                {reasonError && <p role="alert" className="text-xs text-red-600">{reasonError}</p>}
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => submit('approve')} disabled={decide.isPending}>
                                    {decide.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Approve
                                </Button>
                                <Button variant="outline" onClick={() => submit('reject')} disabled={decide.isPending}>Reject</Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-sm">History</CardTitle></CardHeader>
                <CardContent>
                    {review.history.length === 0 ? (
                        <p className="text-sm text-slate-500">No history yet.</p>
                    ) : (
                        <ol className="space-y-2 text-sm">
                            {review.history.map((h, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="w-40 shrink-0 text-slate-500">{new Date(h.at).toLocaleString()}</span>
                                    <span>
                                        <span className="font-semibold">{h.event.replace(/_/g, ' ')}</span>
                                        {h.by?.name ? ` by ${h.by.name}` : ''}
                                        {h.detail ? `: ${h.detail}` : ''}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
