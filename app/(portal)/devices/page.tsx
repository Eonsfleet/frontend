'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDevices } from '@/lib/api/tracking'
import { getVehiclesBatched } from '@/lib/api/vehicles'
import { Vehicle } from '@/types'
import { DeviceTable } from '@/components/devices/DeviceTable'
import { DeviceFilters, DeviceFiltersState } from '@/components/devices/DeviceFilters'
import { DeviceExportDialog } from '@/components/devices/DeviceExportDialog'
import { QueryError } from '@/components/shared/QueryError'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Search, HardDrive, Download } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function DevicesPage() {
    const { token } = useAuthStore()
    const [search, setSearch] = React.useState('')
    const [page, setPage] = React.useState(1)
    const [filters, setFilters] = React.useState<DeviceFiltersState>({})

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['devices', search, page, filters],
        queryFn: () => getDevices({ q: search, page, ...filters }),
        enabled: !!token,
    })

    // Fetched separately (and batched across all pages) purely to join a device's
    // identifier against the vehicle it's mounted on — no dedicated backend join exists.
    const { data: vehicles } = useQuery({
        queryKey: ['vehicles-batched-for-device-join'],
        queryFn: () => getVehiclesBatched({}),
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
    })

    const vehicleByDevice = React.useMemo(() => {
        const map = new Map<string, Vehicle>()
        for (const vehicle of vehicles ?? []) {
            const deviceId = vehicle.attributes.device_id
            if (deviceId) map.set(String(deviceId), vehicle)
        }
        return map
    }, [vehicles])

    const [exportOpen, setExportOpen] = React.useState(false)

    const handleSearch = (val: string) => {
        setSearch(val)
        setPage(1)
    }

    const handleFiltersChange = (newFilters: DeviceFiltersState) => {
        setFilters(newFilters)
        setPage(1)
    }

    const devices = data?.data?.devices ?? []
    const rawPagination = data?.data?.pagination
    const pagination = rawPagination
        ? {
            current: rawPagination.current ?? rawPagination.current_page ?? 1,
            lastPage: rawPagination.lastPage ?? rawPagination.last_page ?? 1,
            total: rawPagination.total ?? devices.length,
        }
        : undefined

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Devices</h1>
                    <p className="text-slate-500 mt-1">Monitor GPS trackers and their connection health across your fleet.</p>
                </div>
                <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none" onClick={() => setExportOpen(true)}>
                    <Download className="h-4 w-4" /> Export
                </Button>
                <DeviceExportDialog open={exportOpen} onOpenChange={setExportOpen} />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search serial or IMEI..."
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-10"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <DeviceFilters filters={filters} onFiltersChange={handleFiltersChange} />
            </div>

            {isError && <QueryError message="Failed to load devices." onRetry={refetch} />}

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                </div>
            ) : !isError && devices.length === 0 ? (
                <div className="py-20 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <HardDrive className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">No devices found</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                        {search || filters.status
                            ? 'No devices match your current search or filter.'
                            : 'GPS trackers linked to your organization will appear here once registered.'}
                    </p>
                </div>
            ) : (
                <DeviceTable
                    data={devices}
                    vehicleByDevice={vehicleByDevice}
                    pagination={pagination}
                    onPageChange={setPage}
                />
            )}
        </div>
    )
}
