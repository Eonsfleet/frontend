'use client'

import React from 'react'
import { DriverTable } from '@/components/drivers/DriverTable'
import { Button } from '@/components/ui/button'
import { UserPlus, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { getDrivers } from '@/lib/api/drivers'

export default function DriversPage() {
    const [search, setSearch] = React.useState('')
    const [page, setPage] = React.useState(1)

    const { data, isLoading } = useQuery({
        queryKey: ['drivers', search, page],
        queryFn: () => getDrivers({ q: search, page }),
    })

    const handleSearch = (val: string) => {
        setSearch(val)
        setPage(1)
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Drivers</h1>
                    <p className="text-slate-500 mt-1">Manage driver registry, performance, and vehicle assignments.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="mr-2 h-4 w-4" /> Add Driver
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search name or ID..."
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-10"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="w-full sm:w-auto text-slate-600 border-slate-200 h-10">
                    <Filter className="mr-2 h-4 w-4" /> Status All
                </Button>
            </div>

            <DriverTable
                data={data?.data || []}
                isLoading={isLoading}
                pagination={data?.pagination}
                onPageChange={setPage}
            />
        </div>
    )
}
