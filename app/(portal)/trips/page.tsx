'use client'

import React from 'react'
import { TripTable } from '@/components/trips/TripTable'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { getTrips } from '@/lib/api/trips'
import Link from 'next/link'

import { TripStatusModal } from '@/components/trips/TripStatusModal'
import { EditTripModal } from '@/components/trips/EditTripModal'
import { QueryError } from '@/components/shared/QueryError'
import { Trip } from '@/types'

export default function TripsPage() {
    const [search, setSearch] = React.useState('')
    const [page, setPage] = React.useState(1)
    const [statusTrip, setStatusTrip] = React.useState<Trip | null>(null)
    const [editingTrip, setEditingTrip] = React.useState<Trip | null>(null)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['trips', search, page],
        queryFn: () => getTrips({ q: search, page }),
    })

    const handleSearch = (val: string) => {
        setSearch(val)
        setPage(1)
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trip Management</h1>
                    <p className="text-slate-500 mt-1">Dispatch, monitor and manage fleet journeys across your network.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                    <Link href="/trips/new">
                        <Plus className="mr-2 h-4 w-4" /> Create New Trip
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search reference or location..."
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-10"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="w-full sm:w-auto text-slate-600 border-slate-200 h-10">
                    <Filter className="mr-2 h-4 w-4" /> All Statuses
                </Button>
            </div>

            {isError && <QueryError message="Failed to load trips." onRetry={refetch} />}

            <TripTable
                data={data?.data.trips || []}
                isLoading={isLoading}
                pagination={data?.data.pagination}
                onPageChange={setPage}
                onEdit={setEditingTrip}
                onChangeStatus={setStatusTrip}
            />

            <TripStatusModal
                isOpen={!!statusTrip}
                onClose={() => setStatusTrip(null)}
                trip={statusTrip}
            />

            <EditTripModal
                isOpen={!!editingTrip}
                onClose={() => setEditingTrip(null)}
                trip={editingTrip}
            />
        </div>
    )
}
