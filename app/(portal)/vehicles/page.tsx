'use client'

import React from 'react'
import { VehicleTable } from '@/components/vehicles/VehicleTable'
import { Button } from '@/components/ui/button'
import { Plus, Search, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { getVehicles } from '@/lib/api/vehicles'
import { AssignDriverDialog } from '@/components/vehicles/AssignDriverDialog'
import { AssignClusterDialog } from '@/components/vehicles/AssignClusterDialog'
import { AssignTrackerDialog } from '@/components/vehicles/AssignTrackerDialog'
import { VehicleModal } from '@/components/vehicles/VehicleModal'
import { Vehicle } from '@/types'
import { VehicleFiltersComponent, VehicleFilters } from '@/components/vehicles/VehicleFilters'
import { QueryError } from '@/components/shared/QueryError'
import { useAuthStore } from '@/store/authStore'
import { PolicySettingsSheet } from '@/components/shared/PolicySettingsSheet'

export default function VehiclesPage() {
    const { token } = useAuthStore()
    const [isPolicyOpen, setIsPolicyOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')
    const [page, setPage] = React.useState(1)
    const [filters, setFilters] = React.useState<VehicleFilters>({})
    const [assignVehicle, setAssignVehicle] = React.useState<Vehicle | null>(null)
    const [assignClusterVehicle, setAssignClusterVehicle] = React.useState<Vehicle | null>(null)
    const [assignTrackerVehicle, setAssignTrackerVehicle] = React.useState<Vehicle | null>(null)
    const [isVehicleModalOpen, setIsVehicleModalOpen] = React.useState(false)
    const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(null)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['vehicles', search, page, filters],
        queryFn: () => getVehicles({ q: search, page, ...filters }),
        enabled: !!token,
    })

    const handleSearch = (val: string) => {
        setSearch(val)
        setPage(1)
    }

    const handleFiltersChange = (newFilters: VehicleFilters) => {
        setFilters(newFilters)
        setPage(1)
    }

    const handleEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle)
        setIsVehicleModalOpen(true)
    }

    const handleAdd = () => {
        setEditingVehicle(null)
        setIsVehicleModalOpen(true)
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vehicles</h1>
                    <p className="text-slate-500 mt-1">Manage your fleet inventory and tracker assignments.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setIsPolicyOpen(true)} title="Fleet policy settings">
                        <Settings className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>
                        <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search registration or model..."
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-10"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <VehicleFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} />
            </div>

            {isError && <QueryError message="Failed to load vehicles." onRetry={refetch} />}

            <VehicleTable
                data={data?.data || []}
                isLoading={isLoading}
                onAssign={setAssignVehicle}
                onAssignCluster={setAssignClusterVehicle}
                onAssignTracker={setAssignTrackerVehicle}
                onEdit={handleEdit}
                pagination={data?.pagination}
                onPageChange={setPage}
            />

            {assignVehicle && (
                <AssignDriverDialog
                    vehicleId={assignVehicle.id}
                    vehicleReg={assignVehicle.attributes.registration_number}
                    isOpen={!!assignVehicle}
                    onClose={() => setAssignVehicle(null)}
                />
            )}

            {assignClusterVehicle && (
                <AssignClusterDialog
                    vehicleId={assignClusterVehicle.id}
                    vehicleReg={assignClusterVehicle.attributes.registration_number}
                    isOpen={!!assignClusterVehicle}
                    onClose={() => setAssignClusterVehicle(null)}
                />
            )}

            {assignTrackerVehicle && (
                <AssignTrackerDialog
                    vehicleId={assignTrackerVehicle.id}
                    vehicleReg={assignTrackerVehicle.attributes.registration_number}
                    isOpen={!!assignTrackerVehicle}
                    onClose={() => setAssignTrackerVehicle(null)}
                />
            )}

            <VehicleModal
                isOpen={isVehicleModalOpen}
                onClose={() => {
                    setIsVehicleModalOpen(false)
                    setEditingVehicle(null)
                }}
                initialData={editingVehicle || undefined}
            />

            <PolicySettingsSheet
                open={isPolicyOpen}
                onOpenChange={setIsPolicyOpen}
                defaultTab="fleet-rules"
            />
        </div>
    )
}

