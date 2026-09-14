'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { matchesStatusBucket, type StatusBucket } from '@/lib/vehicleStatus'
import type { Vehicle } from '@/types/vehicle'
import { ClusterVehicleRow } from './ClusterVehicleRow'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'

const PAGE_SIZE = 10

type AssetFilter = 'all' | 'online' | 'offline' | 'moving' | 'parked'

const FILTERS: { key: AssetFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'online', label: 'Online' },
    { key: 'offline', label: 'Offline' },
    { key: 'moving', label: 'Moving' },
    { key: 'parked', label: 'Stopped / Parked' },
]

function statusInput(vehicle: Vehicle) {
    const loc = vehicle.relationships?.current_location
    return {
        status: vehicle.attributes?.status,
        is_online: vehicle.attributes?.is_online ?? false,
        speed: Number(loc?.speed ?? vehicle.attributes?.speed ?? 0) || 0,
    }
}

export function ClusterAssetList({ vehicles }: { vehicles: Vehicle[] }) {
    const [filter, setFilter] = useState<AssetFilter>('all')
    const [page, setPage] = useState(1)

    const counts = useMemo(() => {
        const c: Record<AssetFilter, number> = { all: vehicles.length, online: 0, offline: 0, moving: 0, parked: 0 }
        for (const v of vehicles) {
            const input = statusInput(v)
            if (matchesStatusBucket('online', input)) c.online++
            if (matchesStatusBucket('offline', input)) c.offline++
            if (matchesStatusBucket('moving', input)) c.moving++
            if (matchesStatusBucket('parked', input)) c.parked++
        }
        return c
    }, [vehicles])

    const filtered = useMemo(() => {
        if (filter === 'all') return vehicles
        return vehicles.filter((v) => matchesStatusBucket(filter as StatusBucket, statusInput(v)))
    }, [vehicles, filter])

    const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

    useEffect(() => {
        setPage(1)
    }, [filter])

    useEffect(() => {
        if (page > lastPage) setPage(lastPage)
    }, [page, lastPage])

    const paged = useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page],
    )

    return (
        <div>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide border-b border-slate-100 px-1">
                {FILTERS.map(({ key, label }) => {
                    const isActive = filter === key
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={cn(
                                'shrink-0 pb-2.5 pt-1 text-xs font-bold whitespace-nowrap border-b-2 transition-colors',
                                isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800',
                            )}
                        >
                            {label} <span className="tabular-nums">{counts[key]}</span>
                        </button>
                    )
                })}
            </div>

            <div className="mt-2">
                {filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-slate-400">
                        {vehicles.length === 0
                            ? 'No assets are currently assigned to this cluster.'
                            : 'No assets match the selected filter.'}
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                            {paged.map((v) => (
                                <ClusterVehicleRow key={v.id} vehicle={v} />
                            ))}
                        </div>

                        {lastPage > 1 && (
                            <div className="flex items-center justify-between px-2 mt-4">
                                <p className="text-xs text-slate-500">
                                    Showing{' '}
                                    <span className="font-medium text-slate-900">{paged.length}</span> of{' '}
                                    <span className="font-medium text-slate-900">{filtered.length}</span> assets
                                </p>
                                <Pagination className="mx-0 w-auto">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    if (page > 1) setPage(page - 1)
                                                }}
                                                className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                            let pageNum = i + 1
                                            if (lastPage > 5 && page > 3) {
                                                pageNum = page - 2 + i
                                                if (pageNum > lastPage) pageNum = lastPage - 4 + i
                                            }
                                            if (pageNum <= 0 || pageNum > lastPage) return null
                                            return (
                                                <PaginationItem key={pageNum}>
                                                    <PaginationLink
                                                        href="#"
                                                        isActive={page === pageNum}
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            setPage(pageNum)
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        {pageNum}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            )
                                        })}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    if (page < lastPage) setPage(page + 1)
                                                }}
                                                className={page === lastPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
