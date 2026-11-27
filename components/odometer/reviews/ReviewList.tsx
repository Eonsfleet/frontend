'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryError } from '@/components/shared/QueryError'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useVehiclesDropdown } from '@/hooks/useVehiclesDropdown'
import { listOdometerReviews } from '@/lib/api/odometer'
import { cn } from '@/lib/utils'
import { formatDistance, reasonLabel, responsibleLabel, reviewReadingText, reviewStatusLabel } from '@/lib/odometer'
import type { ReviewListStatus } from '@/types/odometer'

export const REVIEW_TABS: { value: ReviewListStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
]

/** The organisation's odometer review work queue. */
export function ReviewList() {
    const [status, setStatus] = React.useState<ReviewListStatus>('pending')
    const [page, setPage] = React.useState(1)
    const [level, setLevel] = React.useState<'all' | 'organisation' | 'support'>('all')
    const [vehicleId, setVehicleId] = React.useState<string>('all')
    const vehicles = useVehiclesDropdown()
    const vehicleOptions = (vehicles.data?.data ?? []) as { id: string | number; attributes: { registration_number: string } }[]

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['odometer-reviews', status, page, level, vehicleId],
        queryFn: () =>
            listOdometerReviews({
                status,
                page,
                ...(level !== 'all' ? { level } : {}),
                ...(vehicleId !== 'all' ? { vehicle_id: vehicleId } : {}),
            }),
    })
    const reviews = data?.reviews ?? []
    const pagination = data?.pagination

    return (
        <div className="space-y-4">
            <div role="tablist" aria-label="Review status" className="flex gap-2 border-b border-slate-200">
                {REVIEW_TABS.map(t => (
                    <button
                        key={t.value}
                        role="tab"
                        aria-selected={status === t.value}
                        onClick={() => { setStatus(t.value); setPage(1) }}
                        className={cn(
                            'border-b-2 px-3 pb-2 text-sm font-semibold',
                            status === t.value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700',
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-3">
                <Select value={level} onValueChange={v => { setLevel(v as typeof level); setPage(1) }}>
                    <SelectTrigger aria-label="Level" className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All levels</SelectItem>
                        <SelectItem value="organisation">Organisation</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={vehicleId} onValueChange={v => { setVehicleId(v); setPage(1) }}>
                    <SelectTrigger aria-label="Vehicle" className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All vehicles</SelectItem>
                        {vehicleOptions.map(v => (
                            <SelectItem key={v.id} value={String(v.id)}>{v.attributes.registration_number}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isError && <QueryError message="Failed to load odometer reviews." onRetry={refetch} />}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Submitted reading</TableHead>
                        <TableHead>Current odometer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Responsible</TableHead>
                        <TableHead />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                    ))}
                    {!isLoading && !isError && reviews.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500">No {status} reviews.</TableCell></TableRow>
                    )}
                    {reviews.map(r => (
                        <TableRow key={r.id}>
                            <TableCell className="font-semibold">{r.vehicle.registration_number}</TableCell>
                            <TableCell>
                                {reasonLabel(r.reason)}
                                {r.level === 'support' && <Badge variant="outline" className="ml-2">Support</Badge>}
                            </TableCell>
                            <TableCell>{reviewReadingText(r.reading)}</TableCell>
                            <TableCell>{formatDistance(r.previous_accepted_km) ?? 'None'}</TableCell>
                            <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <Badge variant={r.overdue && r.status === 'pending' ? 'destructive' : 'secondary'}>
                                    {reviewStatusLabel(r.status, r.overdue)}
                                </Badge>
                            </TableCell>
                            <TableCell>{responsibleLabel(r.responsible)}</TableCell>
                            <TableCell>
                                <Link className="text-sm font-semibold text-blue-600 hover:underline" href={`/odometer/reviews/${r.id}`}>
                                    Open
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm">
                    <span className="text-slate-500">Page {pagination.current} of {pagination.lastPage}</span>
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={page >= pagination.lastPage} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
            )}
        </div>
    )
}
