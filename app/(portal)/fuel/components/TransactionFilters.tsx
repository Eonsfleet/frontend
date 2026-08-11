'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getFuelVehicles } from '@/lib/api/fuel'
import { cn } from '@/lib/utils'
import type { FuelTransactionFilters, ReconciliationStatus, TxType } from './useFuelTransactions'
import { formatVehicleMakeModel, formatVehicleRegistration } from './formatVehicleText'

interface TransactionFiltersProps {
    filters: FuelTransactionFilters
    onFiltersChange: (filters: FuelTransactionFilters) => void
}

const TYPE_OPTIONS: Array<{ label: string; value: 'all' | TxType }> = [
    { label: 'All Types', value: 'all' },
    { label: 'Refill', value: 'refill' },
    { label: 'Theft', value: 'theft' },
    { label: 'Leakage', value: 'leakage' },
]

const RECONCILIATION_OPTIONS: Array<{ label: string; value: ReconciliationStatus }> = [
    { label: 'All', value: 'all' },
    { label: 'Matched', value: 'matched' },
    { label: 'Variance', value: 'flagged_variance' },
    { label: 'Unmatched', value: 'unmatched' },
]

const SORT_OPTIONS = [
    { label: 'Date', value: 'occurred_at' },
    { label: 'Type', value: 'type' },
    { label: 'Vehicle', value: 'vehicle_id' },
    { label: 'Volume', value: 'amount_liters' },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">{label}</label>
            {children}
        </div>
    )
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
    const [isVehicleOpen, setIsVehicleOpen] = useState(false)
    const [vehicleSearch, setVehicleSearch] = useState('')

    const vehiclesQuery = useQuery({
        queryKey: ['fuel-transaction-filter-vehicles'],
        queryFn: () => getFuelVehicles({ per_page: 200 }),
    })

    const vehicleOptions = useMemo(() => {
        const q = vehicleSearch.trim().toLowerCase()
        return (vehiclesQuery.data?.data.vehicles ?? [])
            .map((vehicle) => ({
                id: Number(vehicle.id),
                label: formatVehicleRegistration(vehicle.attributes.registration_number),
                meta: formatVehicleMakeModel(vehicle.attributes.make, vehicle.attributes.model),
            }))
            .filter((vehicle) => {
                if (!q) return true
                return vehicle.label.toLowerCase().includes(q) || vehicle.meta.toLowerCase().includes(q)
            })
    }, [vehicleSearch, vehiclesQuery.data])

    const selectedVehicle = useMemo(() => {
        return (vehiclesQuery.data?.data.vehicles ?? []).find((vehicle) => vehicle.id === filters.vehicleId)
    }, [filters.vehicleId, vehiclesQuery.data])

    const updateFilters = (next: Partial<FuelTransactionFilters>) => {
        onFiltersChange({ ...filters, ...next, page: 1 })
    }

    const resetFilters = () => {
        onFiltersChange({
            search: '',
            vehicleId: undefined,
            type: 'all',
            reconciliationStatus: 'all',
            startDate: '',
            endDate: '',
            page: 1,
            perPage: filters.perPage,
            exportLimit: filters.exportLimit,
            sortBy: 'occurred_at',
            orderBy: 'desc',
        })
    }

    return (
        <Card className="flex flex-col rounded-2xl border-0 bg-white p-4 shadow-none xl:h-full">
            <div className="flex shrink-0 items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Filters</h2>
                <button type="button" className="text-[12px] font-semibold text-blue-600 hover:text-blue-700" onClick={resetFilters}>
                    Clear All
                </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-1">
                <Field label="Transaction Type">
                    <select
                        value={filters.type ?? 'all'}
                        onChange={(event) => updateFilters({ type: event.target.value as FuelTransactionFilters['type'] })}
                        className="h-9 w-full rounded-lg bg-slate-50 px-3 text-[13px] font-medium text-slate-600 outline-none transition-colors hover:bg-slate-100"
                    >
                        {TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Reconciliation Status">
                    <select
                        value={filters.reconciliationStatus ?? 'all'}
                        onChange={(event) => updateFilters({ reconciliationStatus: event.target.value as ReconciliationStatus })}
                        className="h-9 w-full rounded-lg bg-slate-50 px-3 text-[13px] font-medium text-slate-600 outline-none transition-colors hover:bg-slate-100"
                    >
                        {RECONCILIATION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Vehicle">
                    <div className="relative">
                        <button
                            type="button"
                            aria-expanded={isVehicleOpen}
                            className="flex h-9 w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                            onClick={() => setIsVehicleOpen((open) => !open)}
                        >
                            <span className="min-w-0 truncate">
                                {selectedVehicle ? formatVehicleRegistration(selectedVehicle.attributes.registration_number) : 'All vehicles'}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>

                        {isVehicleOpen && (
                            <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg bg-white">
                                <div className="p-2">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={vehicleSearch}
                                            onChange={(event) => setVehicleSearch(event.target.value)}
                                            placeholder="Search vehicles..."
                                            className="h-8 border-0 bg-slate-50 pl-8 text-[12px] shadow-none focus-visible:border-0 focus-visible:ring-0"
                                            aria-label="Search vehicles"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto py-1">
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                                        onClick={() => {
                                            updateFilters({ vehicleId: undefined })
                                            setVehicleSearch('')
                                            setIsVehicleOpen(false)
                                        }}
                                    >
                                        All vehicles
                                        {filters.vehicleId == null && <Check className="h-3.5 w-3.5 text-blue-600" />}
                                    </button>

                                    {vehiclesQuery.isLoading ? (
                                        <p className="px-3 py-3 text-center text-[12px] text-slate-400">Loading vehicles...</p>
                                    ) : vehicleOptions.length === 0 ? (
                                        <p className="px-3 py-3 text-center text-[12px] text-slate-400">No vehicles found.</p>
                                    ) : (
                                        vehicleOptions.map((vehicle) => (
                                            <button
                                                key={vehicle.id}
                                                type="button"
                                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                                onClick={() => {
                                                    updateFilters({ vehicleId: vehicle.id })
                                                    setVehicleSearch('')
                                                    setIsVehicleOpen(false)
                                                }}
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[12px] font-semibold text-slate-700">{vehicle.label}</span>
                                                    <span className="block truncate text-[11px] text-slate-400">{vehicle.meta || '—'}</span>
                                                </span>
                                                <Check
                                                    className={cn(
                                                        'h-3.5 w-3.5 shrink-0 text-blue-600',
                                                        filters.vehicleId === vehicle.id ? 'opacity-100' : 'opacity-0',
                                                    )}
                                                />
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </Field>

                <Field label="Start Date">
                    <Input
                        type="date"
                        value={filters.startDate ?? ''}
                        onChange={(event) => updateFilters({ startDate: event.target.value })}
                        className="h-9 border-0 bg-slate-50 text-[13px] shadow-none focus-visible:border-0 focus-visible:ring-0"
                        aria-label="Start date"
                    />
                </Field>

                <Field label="End Date">
                    <Input
                        type="date"
                        value={filters.endDate ?? ''}
                        onChange={(event) => updateFilters({ endDate: event.target.value })}
                        className="h-9 border-0 bg-slate-50 text-[13px] shadow-none focus-visible:border-0 focus-visible:ring-0"
                        aria-label="End date"
                    />
                </Field>

                <Field label="Sort By">
                    <select
                        value={filters.sortBy}
                        onChange={(event) => updateFilters({ sortBy: event.target.value })}
                        className="h-9 w-full rounded-lg bg-slate-50 px-3 text-[13px] font-medium text-slate-600 outline-none transition-colors hover:bg-slate-100"
                    >
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Order">
                    <select
                        value={filters.orderBy}
                        onChange={(event) => updateFilters({ orderBy: event.target.value as FuelTransactionFilters['orderBy'] })}
                        className="h-9 w-full rounded-lg bg-slate-50 px-3 text-[13px] font-medium text-slate-600 outline-none transition-colors hover:bg-slate-100"
                    >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </Field>

                <Field label="Rows Per Page">
                    <select
                        value={filters.perPage}
                        onChange={(event) => updateFilters({ perPage: Number(event.target.value) })}
                        className="h-9 w-full rounded-lg bg-slate-50 px-3 text-[13px] font-medium text-slate-600 outline-none transition-colors hover:bg-slate-100"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </Field>

                <Field label="Export Limit">
                    <Input
                        type="number"
                        min={1}
                        max={10000}
                        value={filters.exportLimit}
                        onChange={(event) => {
                            const nextLimit = Math.min(10000, Math.max(1, Number(event.target.value) || 1))
                            updateFilters({ exportLimit: nextLimit })
                        }}
                        className="h-9 border-0 bg-slate-50 text-[13px] shadow-none focus-visible:border-0 focus-visible:ring-0"
                        aria-label="Export row limit"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Max 10,000 rows.</p>
                </Field>
            </div>

            <div className="mt-4 shrink-0 pt-4">
                <button
                    type="button"
                    className="h-9 w-full rounded-lg bg-slate-100 text-[13px] font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-200"
                    onClick={resetFilters}
                >
                    Reset
                </button>
            </div>
        </Card>
    )
}
