'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDrivers } from '@/lib/api/drivers'
import { getClustersBatched } from '@/lib/api/settings'
import { useVehiclesDropdown } from '@/hooks/useVehiclesDropdown'
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters'
import { PRESET_LABELS, RANGE_PRESETS, hasEntityFilters, type RangePreset } from '@/lib/analytics/filters'
import { localDate } from '@/components/analytics/telemetry/format'
import { Button } from '@/components/ui/button'
import { EntityPicker, type PickerOption } from './EntityPicker'

const CUSTOM = 'custom'
const STALE = 10 * 60_000

const toId = (value: string | number): number | null => {
    const n = Number(value)
    return Number.isInteger(n) && n > 0 ? n : null
}

const options = <T,>(rows: T[] | undefined, id: (row: T) => string | number, label: (row: T) => string): PickerOption[] =>
    (rows ?? []).flatMap((row) => {
        const n = toId(id(row))
        return n === null ? [] : [{ id: n, label: label(row) }]
    })

/**
 * The global filters. They only set the URL; which cards honor them is decided
 * per card (applicability.ts) and each card says when it does not.
 */
export function AnalyticsFilterBar({
    entities = true,
    compare = true,
    presets = RANGE_PRESETS,
    custom = true,
}: {
    /** Show the vehicle, driver and cluster filters. Off for a tab that applies none of them. */
    entities?: boolean
    compare?: boolean
    /** The periods this tab can serve. */
    presets?: readonly RangePreset[]
    /** Whether this tab can serve a custom date range. */
    custom?: boolean
} = {}) {
    const { filters, update } = useAnalyticsFilters()

    // The lists are small and cached for ten minutes, so they load with the bar.
    const vehicles = useVehiclesDropdown(entities)
    const drivers = useQuery({ queryKey: ['analytics-picker', 'drivers'], queryFn: () => getDrivers({ per_page: 100 }), staleTime: STALE, enabled: entities })
    const clusters = useQuery({ queryKey: ['analytics-picker', 'clusters'], queryFn: getClustersBatched, staleTime: STALE, enabled: entities })

    const vehicleOptions = useMemo(
        () => options(vehicles.data?.data, (v) => v.id, (v) => v.attributes.registration_number),
        [vehicles.data],
    )
    const driverOptions = useMemo(
        () => options(drivers.data?.data, (d) => d.id, (d) => d.attributes.full_name || d.attributes.email),
        [drivers.data],
    )
    const clusterOptions = useMemo(() => options(clusters.data, (c) => c.id, (c) => c.attributes.name), [clusters.data])

    const vehicleTotal = vehicles.data?.pagination?.total
    const driverTotal = drivers.data?.pagination?.total
    const more = (shown: number, total: number | undefined, word: string) =>
        total && total > shown ? `Showing the first ${shown} of ${total} ${word}.` : null

    const range = filters.range
    const selectValue = range.kind === 'custom' ? CUSTOM : range.preset
    const today = localDate(new Date())

    return (
        <form
            aria-label="Analytics filters"
            className="flex flex-wrap items-end gap-x-3 gap-y-3 rounded-2xl border border-an-border bg-an-surface p-3 sm:p-4"
            onSubmit={(e) => e.preventDefault()}
        >
            <label className="flex flex-col gap-1 text-xs font-medium text-an-muted">
                Period
                <select
                    className="h-9 rounded-md border border-an-border bg-an-surface px-2.5 text-sm text-an-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent"
                    value={selectValue}
                    onChange={(e) => {
                        const value = e.target.value
                        if (value === CUSTOM) update({ range: { kind: 'custom', start: today, end: today } })
                        else update({ range: { kind: 'preset', preset: value as RangePreset } })
                    }}
                >
                    {presets.map((p) => (
                        <option key={p} value={p}>
                            {PRESET_LABELS[p]}
                        </option>
                    ))}
                    {custom && <option value={CUSTOM}>Custom range</option>}
                </select>
            </label>

            {range.kind === 'custom' && (
                <>
                    <label className="flex flex-col gap-1 text-xs font-medium text-an-muted">
                        From
                        <input
                            type="date"
                            max={range.end}
                            value={range.start}
                            onChange={(e) => e.target.value && update({ range: { kind: 'custom', start: e.target.value, end: range.end } })}
                            className="h-9 rounded-md border border-an-border bg-an-surface px-2.5 text-sm text-an-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-an-muted">
                        To
                        <input
                            type="date"
                            min={range.start}
                            max={today}
                            value={range.end}
                            onChange={(e) => e.target.value && update({ range: { kind: 'custom', start: range.start, end: e.target.value } })}
                            className="h-9 rounded-md border border-an-border bg-an-surface px-2.5 text-sm text-an-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent"
                        />
                    </label>
                </>
            )}

            {entities && (
                <>
                <div className="flex flex-col gap-1 text-xs font-medium text-an-muted">
                    Vehicles
                    <EntityPicker
                        label="Vehicles"
                        options={vehicleOptions}
                        selected={filters.vehicleIds}
                        onChange={(ids) => update({ vehicleIds: ids })}
                        isLoading={vehicles.isPending}
                        note={more(vehicleOptions.length, vehicleTotal, 'vehicles')}
                    />
                </div>
                <div className="flex flex-col gap-1 text-xs font-medium text-an-muted">
                    Drivers
                    <EntityPicker
                        label="Drivers"
                        options={driverOptions}
                        selected={filters.driverIds}
                        onChange={(ids) => update({ driverIds: ids })}
                        isLoading={drivers.isPending}
                        note={more(driverOptions.length, driverTotal, 'drivers')}
                    />
                </div>
                <div className="flex flex-col gap-1 text-xs font-medium text-an-muted">
                    Clusters
                    <EntityPicker
                        label="Clusters"
                        options={clusterOptions}
                        selected={filters.clusterIds}
                        onChange={(ids) => update({ clusterIds: ids })}
                        isLoading={clusters.isPending}
                    />
                </div>
                </>
            )}

            {compare && (
                <label className="flex h-9 items-center gap-2 text-sm text-an-text">
                    <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--an-accent)]"
                        checked={filters.compare}
                        onChange={(e) => update({ compare: e.target.checked })}
                    />
                    Compare with previous period
                </label>
            )}

            {((entities && hasEntityFilters(filters)) || (compare && filters.compare)) && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-an-muted"
                    onClick={() => update({ vehicleIds: [], driverIds: [], clusterIds: [], compare: false })}
                >
                    Clear filters
                </Button>
            )}

            <p className="basis-full text-xs text-an-muted">
                {entities
                    ? 'Each card shows which period and filters it uses. A card that cannot apply a filter says so and shows the whole fleet.'
                    : 'Each card shows the period it uses. This tab reports on the whole fleet.'}
            </p>
        </form>
    )
}
