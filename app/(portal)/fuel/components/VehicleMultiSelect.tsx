'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getFuelVehicles } from '@/lib/api/fuel'
import { cn } from '@/lib/utils'

interface VehicleMultiSelectProps {
    /** Currently selected vehicle ids. Empty array = "All Vehicles". */
    value: number[]
    onChange: (ids: number[]) => void
    /** Label shown for the empty selection. */
    allLabel?: string
    placeholder?: string
    className?: string
}

/**
 * Searchable, multi-select vehicle picker backed by /fuel/vehicles. An empty
 * selection means "all vehicles". Mirrors the single-select dropdown used in the
 * transaction filter, extended for multiple selections + a select-all toggle.
 */
export function VehicleMultiSelect({
    value,
    onChange,
    allLabel = 'All Vehicles',
    placeholder = 'Search vehicles...',
    className,
}: VehicleMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const vehiclesQuery = useQuery({
        queryKey: ['fuel-vehicle-multiselect'],
        queryFn: () => getFuelVehicles({ per_page: 200 }),
    })

    const allVehicles = useMemo(
        () =>
            (vehiclesQuery.data?.data.vehicles ?? []).map((vehicle) => ({
                id: Number(vehicle.id),
                label: vehicle.attributes.registration_number,
                meta: `${vehicle.attributes.make} ${vehicle.attributes.model}`.trim(),
            })),
        [vehiclesQuery.data],
    )

    const options = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return allVehicles
        return allVehicles.filter(
            (vehicle) => vehicle.label.toLowerCase().includes(q) || vehicle.meta.toLowerCase().includes(q),
        )
    }, [search, allVehicles])

    // Close on outside click.
    useEffect(() => {
        if (!isOpen) return
        const onPointerDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', onPointerDown)
        return () => document.removeEventListener('mousedown', onPointerDown)
    }, [isOpen])

    const selectedSet = useMemo(() => new Set(value), [value])
    const allSelected = allVehicles.length > 0 && value.length === 0

    const toggle = (id: number) => {
        onChange(selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id])
    }

    const triggerLabel =
        value.length === 0
            ? allLabel
            : value.length === 1
                ? allVehicles.find((v) => v.id === value[0])?.label ?? '1 vehicle'
                : `${value.length} vehicles selected`

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                aria-expanded={isOpen}
                className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                onClick={() => setIsOpen((open) => !open)}
            >
                <span className="min-w-0 truncate">{triggerLabel}</span>
                <span className="flex shrink-0 items-center gap-1">
                    {value.length > 0 && (
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label="Clear vehicle selection"
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            onClick={(event) => {
                                event.stopPropagation()
                                onChange([])
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    onChange([])
                                }
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                </span>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={placeholder}
                                className="h-8 border-slate-200 pl-8 text-[12px]"
                                aria-label="Search vehicles"
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                            onClick={() => onChange([])}
                        >
                            {allLabel}
                            {allSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                        </button>

                        {vehiclesQuery.isLoading ? (
                            <p className="px-3 py-3 text-center text-[12px] text-slate-400">Loading vehicles...</p>
                        ) : options.length === 0 ? (
                            <p className="px-3 py-3 text-center text-[12px] text-slate-400">No vehicles found.</p>
                        ) : (
                            options.map((vehicle) => {
                                const checked = selectedSet.has(vehicle.id)
                                return (
                                    <button
                                        key={vehicle.id}
                                        type="button"
                                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                        onClick={() => toggle(vehicle.id)}
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-[12px] font-semibold text-slate-700">{vehicle.label}</span>
                                            <span className="block truncate text-[11px] text-slate-400">{vehicle.meta || '—'}</span>
                                        </span>
                                        <Check className={cn('h-3.5 w-3.5 shrink-0 text-blue-600', checked ? 'opacity-100' : 'opacity-0')} />
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
