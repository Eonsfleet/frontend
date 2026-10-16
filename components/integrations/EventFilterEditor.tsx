'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useVehiclesDropdown } from '@/hooks/useVehiclesDropdown'
import { cn } from '@/lib/utils'

/**
 * How one event type's delivery is scoped.
 *
 * `inherit` means "send no `subscriptions` entry for this event", which the
 * update endpoint treats as "leave whatever filter is already stored alone".
 * That state exists because no Resource exposes an endpoint's stored filters —
 * the API accepts them but never returns them, so on edit we genuinely cannot
 * show what is currently set, and silently defaulting to `all` would wipe
 * filters the user can't see.
 */
export type EventFilterMode = 'inherit' | 'all' | 'vehicles'

export interface EventFilter {
    mode: EventFilterMode
    vehicleIds: number[]
}

export type EventFilterMap = Record<string, EventFilter>

export const defaultFilter = (isEditing: boolean): EventFilter => ({
    mode: isEditing ? 'inherit' : 'all',
    vehicleIds: [],
})

export function EventFilterEditor({
    events,
    filters,
    onChange,
    isEditing,
}: {
    events: string[]
    filters: EventFilterMap
    onChange: (next: EventFilterMap) => void
    isEditing: boolean
}) {
    const { data, isLoading } = useVehiclesDropdown()

    const vehicles = (data?.data ?? []).map((v) => ({
        id: Number(v.id),
        label: v.attributes.registration_number,
    }))

    if (events.length === 0) {
        return <p className="text-[11px] text-slate-500">Select at least one event to scope its delivery.</p>
    }

    const set = (event: string, patch: Partial<EventFilter>) => {
        const current = filters[event] ?? defaultFilter(isEditing)
        onChange({ ...filters, [event]: { ...current, ...patch } })
    }

    return (
        <div className="space-y-2">
            {isEditing && (
                <p className="rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500">
                    Existing filters aren&apos;t returned by the API, so they can&apos;t be shown here. Events left on
                    <span className="font-medium"> Unchanged </span>
                    keep whatever is already stored — only the ones you switch are overwritten.
                </p>
            )}
            {events.map((event) => {
                const filter = filters[event] ?? defaultFilter(isEditing)
                return (
                    <div className="rounded-lg border border-slate-200 p-3" key={event}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <code className="text-xs font-medium text-slate-700">{event}</code>
                            <div className="flex items-center gap-1">
                                {isEditing && (
                                    <ModeButton
                                        active={filter.mode === 'inherit'}
                                        label="Unchanged"
                                        onClick={() => set(event, { mode: 'inherit' })}
                                    />
                                )}
                                <ModeButton
                                    active={filter.mode === 'all'}
                                    label="All vehicles"
                                    onClick={() => set(event, { mode: 'all' })}
                                />
                                <ModeButton
                                    active={filter.mode === 'vehicles'}
                                    label="Specific"
                                    onClick={() => set(event, { mode: 'vehicles' })}
                                />
                            </div>
                        </div>

                        {filter.mode === 'vehicles' && (
                            <div className="mt-3">
                                <VehiclePicker
                                    isLoading={isLoading}
                                    onChange={(vehicleIds) => set(event, { vehicleIds })}
                                    selected={filter.vehicleIds}
                                    vehicles={vehicles}
                                />
                                {filter.vehicleIds.length === 0 && (
                                    <p className="mt-1.5 text-[11px] text-amber-700">
                                        No vehicles selected — this event would never be delivered.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            className={cn(
                'rounded-md px-2 py-1 text-[11px] font-medium transition',
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
            )}
            onClick={onClick}
            type="button"
        >
            {label}
        </button>
    )
}

function VehiclePicker({
    vehicles,
    selected,
    onChange,
    isLoading,
}: {
    vehicles: { id: number; label: string }[]
    selected: number[]
    onChange: (next: number[]) => void
    isLoading: boolean
}) {
    const [open, setOpen] = useState(false)

    const toggle = (id: number) =>
        onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id])

    return (
        <div className="space-y-2">
            <Popover onOpenChange={setOpen} open={open}>
                <PopoverTrigger asChild>
                    <Button className="h-9 w-full justify-between font-normal" role="combobox" type="button" variant="outline">
                        <span className="text-xs text-slate-500">
                            {isLoading
                                ? 'Loading vehicles…'
                                : selected.length === 0
                                  ? 'Select vehicles…'
                                  : `${selected.length} vehicle${selected.length === 1 ? '' : 's'}`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput className="text-xs" placeholder="Search registration…" />
                        <CommandList>
                            <CommandEmpty className="py-4 text-center text-xs text-slate-500">
                                No vehicles found.
                            </CommandEmpty>
                            <CommandGroup>
                                {vehicles.map((vehicle) => (
                                    <CommandItem
                                        className="gap-2 text-xs"
                                        key={vehicle.id}
                                        onSelect={() => toggle(vehicle.id)}
                                        value={vehicle.label}
                                    >
                                        <Checkbox checked={selected.includes(vehicle.id)} />
                                        <span className="flex-1">{vehicle.label}</span>
                                        {selected.includes(vehicle.id) && <Check className="h-3.5 w-3.5 text-blue-600" />}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selected.map((id) => {
                        const vehicle = vehicles.find((v) => v.id === id)
                        return (
                            <Badge
                                className="cursor-pointer rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-600 hover:bg-slate-200"
                                key={id}
                                onClick={() => toggle(id)}
                            >
                                {vehicle?.label ?? `#${id}`} ×
                            </Badge>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

/**
 * Collapse the editor state into the `subscriptions` array the API expects.
 * `inherit` entries are dropped so the server keeps their stored filters.
 */
export function toSubscriptions(events: string[], filters: EventFilterMap) {
    return events
        .map((event) => ({ event, filter: filters[event] }))
        .filter(({ filter }) => filter && filter.mode !== 'inherit')
        .map(({ event, filter }) => ({
            event_type: event,
            filters: filter!.mode === 'vehicles' ? { vehicle_ids: filter!.vehicleIds } : {},
        }))
}
