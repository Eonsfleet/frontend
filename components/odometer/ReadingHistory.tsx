'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryError } from '@/components/shared/QueryError'
import { EvidenceList } from '@/components/odometer/EvidenceList'
import { SyncBadge, SyncNoticeBox } from '@/components/odometer/SyncNotice'
import { OdometerBadge } from '@/components/odometer/OdometerBadge'
import { getVehicleOdometer, listOdometerReadings } from '@/lib/api/odometer'
import {
    formatDistance,
    formatLifetime,
    ODOMETER_REQUIRED_LABEL,
    readingKindLabel,
    readingSourceLabel,
    readingStatusLabel,
    sourceLabel,
    statusLabel,
    summariseOdometer,
    validationSummary,
} from '@/lib/odometer'

const PER_PAGE = 10

/** The accepted odometer with its segments, and the paginated ledger of submitted readings, for one vehicle. */
export function ReadingHistory({ vehicleId }: { vehicleId: string }) {
    const [page, setPage] = React.useState(1)

    const state = useQuery({ queryKey: ['odometer', vehicleId], queryFn: () => getVehicleOdometer(vehicleId) })
    const readings = useQuery({
        queryKey: ['odometer-readings', vehicleId, page],
        queryFn: () => listOdometerReadings(vehicleId, { page, perPage: PER_PAGE }),
    })

    const odo = state.data?.odometer ?? null
    const summary = summariseOdometer(odo)
    const segments = state.data?.segments ?? []
    const rows = readings.data?.readings ?? []
    const pagination = readings.data?.pagination

    return (
        <div className="space-y-6">
            <section className="space-y-2" aria-label="Accepted odometer">
                <h3 className="text-sm font-bold text-slate-900">Accepted odometer</h3>
                {state.isLoading && <Skeleton className="h-16 w-full" />}
                {state.isError && <QueryError message="Failed to load the odometer." onRetry={state.refetch} />}
                <SyncNoticeBox sync={odo?.sync} />
                {odo && (
                    <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4" data-testid="accepted-odometer">
                        <div>
                            <dt className="text-xs text-slate-500">Total</dt>
                            <dd className="font-semibold">
                                {summary.required ? ODOMETER_REQUIRED_LABEL : (formatLifetime(odo) ?? 'Unavailable')}{' '}
                                <OdometerBadge odometer={odo} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Status</dt>
                            <dd>{statusLabel(odo.status) ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Source</dt>
                            <dd>{sourceLabel(odo.source) ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Effective</dt>
                            <dd>{odo.effective_at ? new Date(odo.effective_at).toLocaleString() : '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Baseline</dt>
                            <dd>
                                {formatDistance(odo.baseline?.value_km) ?? '—'}
                                {odo.baseline?.physically_inspected ? ' (inspected)' : ''}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Last tracker reading (raw)</dt>
                            <dd>{formatDistance(odo.last_tracker_reading?.value_km) ?? '—'}</dd>
                        </div>
                    </dl>
                )}
                {segments.length > 0 && (
                    <div>
                        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">Segments</h4>
                        <ul className="space-y-1 text-sm" data-testid="segments">
                            {segments.map(s => (
                                <li key={String(s.id)}>
                                    {s.kind.replace(/_/g, ' ')}
                                    {s.tracker_device_id != null ? ` (device ${s.tracker_device_id})` : ''}
                                    {': '}
                                    {s.opened_at ? new Date(s.opened_at).toLocaleDateString() : '—'} to{' '}
                                    {s.closed_at ? new Date(s.closed_at).toLocaleDateString() : 'now'}
                                    {s.offset_km != null ? `, tracker offset ${formatDistance(s.offset_km)}` : ''}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            <section className="space-y-2" aria-label="Readings">
                <h3 className="text-sm font-bold text-slate-900">Submitted readings</h3>
                {readings.isError && <QueryError message="Failed to load readings." onRetry={readings.refetch} />}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Reading</TableHead>
                            <TableHead>In km</TableHead>
                            <TableHead>Read on</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Inspected</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Checks</TableHead>
                            <TableHead>Photos</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {readings.isLoading && (
                            <TableRow><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                        )}
                        {!readings.isLoading && !readings.isError && rows.length === 0 && (
                            <TableRow><TableCell colSpan={9} className="py-6 text-center text-sm text-slate-500">No readings have been submitted.</TableCell></TableRow>
                        )}
                        {rows.map(r => {
                            const checks = validationSummary(r.validation)
                            const reviewId = r.review_id ?? r.review?.id ?? null
                            return (
                                <TableRow key={r.id} data-testid={`reading-${r.id}`}>
                                    <TableCell className="font-medium">
                                        {formatDistance(r.original_value, r.original_unit ?? 'km') ?? '—'}
                                        {r.kind !== 'reading' && <Badge variant="outline" className="ml-2">{readingKindLabel(r.kind)}</Badge>}
                                    </TableCell>
                                    <TableCell>{formatDistance(r.value_km) ?? '—'}</TableCell>
                                    <TableCell>{r.effective_at ? new Date(r.effective_at).toLocaleString() : '—'}</TableCell>
                                    <TableCell>{readingSourceLabel(r.source)}</TableCell>
                                    <TableCell>{r.physically_inspected ? 'Yes' : 'No'}</TableCell>
                                    <TableCell>
                                        {r.status === 'pending_sync' ? (
                                            <SyncBadge sync={r.sync} />
                                        ) : (
                                            <Badge variant={r.status === 'rejected' ? 'destructive' : 'secondary'}>{readingStatusLabel(r.status)}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs">{checks.length ? checks.join('; ') : 'All passed'}</TableCell>
                                    <TableCell><EvidenceList evidence={r.evidence} /></TableCell>
                                    <TableCell>
                                        {r.status === 'pending_review' && (
                                            <Link className="text-sm font-semibold text-blue-600 hover:underline" href={reviewId ? `/odometer/reviews/${reviewId}` : '/odometer/reviews'}>
                                                Review
                                            </Link>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                {pagination && pagination.lastPage > 1 && (
                    <div className="flex items-center justify-end gap-2 text-sm">
                        <span className="text-slate-500">Page {pagination.current} of {pagination.lastPage}</span>
                        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <Button size="sm" variant="outline" disabled={page >= pagination.lastPage} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                )}
            </section>
        </div>
    )
}
