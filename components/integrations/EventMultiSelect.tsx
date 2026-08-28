'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface EventOption {
    id: string
    label: string
    disabled?: boolean
    disabledNote?: string
}

export interface EventCategory {
    title: string
    events: EventOption[]
}

export function EventMultiSelect({
    categories,
    value,
    onChange,
}: {
    categories: EventCategory[]
    value: string[]
    onChange: (next: string[]) => void
}) {
    const [open, setOpen] = useState(false)
    const optionsById = new Map(categories.flatMap((c) => c.events).map((e) => [e.id, e]))

    const toggle = (eventId: string) => {
        onChange(value.includes(eventId) ? value.filter((id) => id !== eventId) : [...value, eventId])
    }

    const remove = (eventId: string) => {
        onChange(value.filter((id) => id !== eventId))
    }

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="h-auto min-h-10 w-full justify-between font-normal shadow-none"
                        type="button"
                    >
                        <span className="text-slate-500">
                            {value.length === 0 ? 'Select events…' : `${value.length} event${value.length === 1 ? '' : 's'} selected`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-none" align="start">
                    <Command>
                        <CommandInput placeholder="Search events…" />
                        <CommandList>
                            <CommandEmpty>No events found.</CommandEmpty>
                            {categories.map((category) => (
                                <CommandGroup key={category.title} heading={category.title}>
                                    {category.events.map((event) => {
                                        const selected = value.includes(event.id)
                                        return (
                                            <CommandItem
                                                key={event.id}
                                                value={`${category.title} ${event.label} ${event.id}`}
                                                disabled={event.disabled}
                                                onSelect={() => !event.disabled && toggle(event.id)}
                                                className={cn('flex items-start gap-2', event.disabled && 'opacity-60')}
                                            >
                                                <Checkbox checked={selected} disabled={event.disabled} className="mt-0.5 shadow-none" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-900">{event.label}</p>
                                                    <p className="font-mono text-[10px] text-slate-500">{event.id}</p>
                                                    {event.disabled && event.disabledNote && (
                                                        <p className="text-[10px] text-slate-400">{event.disabledNote}</p>
                                                    )}
                                                </div>
                                                {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                                            </CommandItem>
                                        )
                                    })}
                                </CommandGroup>
                            ))}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((eventId) => (
                        <Badge key={eventId} variant="secondary" className="gap-1 rounded-md py-1 pl-2 pr-1 text-[11px] font-medium shadow-none">
                            {optionsById.get(eventId)?.label ?? eventId}
                            <button
                                type="button"
                                onClick={() => remove(eventId)}
                                className="rounded-sm p-0.5 hover:bg-slate-200"
                                aria-label={`Remove ${optionsById.get(eventId)?.label ?? eventId}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
