'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface PickerOption {
    id: number
    label: string
}

/**
 * A searchable multi-select for the vehicle, driver and cluster filters. It
 * only reports ids; what a filter means for each widget is decided elsewhere.
 */
export function EntityPicker({
    label,
    options,
    selected,
    onChange,
    isLoading,
    note,
}: {
    label: string
    options: PickerOption[]
    selected: number[]
    onChange: (ids: number[]) => void
    isLoading?: boolean
    /** Shown under the list, e.g. when only the first page of vehicles is loaded. */
    note?: string | null
}) {
    const [open, setOpen] = useState(false)
    const names = new Map(options.map((o) => [o.id, o.label]))

    const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

    const summary =
        selected.length === 0
            ? `All ${label.toLowerCase()}`
            : selected.length === 1
              ? (names.get(selected[0]) ?? `1 ${label.toLowerCase().replace(/s$/, '')}`)
              : `${selected.length} ${label.toLowerCase()}`

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label={`${label} filter: ${summary}`}
                    className={cn('h-9 justify-between gap-2 border-an-border bg-an-surface font-normal', selected.length > 0 && 'border-an-accent text-an-accent')}
                >
                    <span className="max-w-[10rem] truncate">{summary}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
                    <CommandList>
                        <CommandEmpty>{isLoading ? 'Loading…' : `No ${label.toLowerCase()} found.`}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem key={option.id} value={`${option.label} ${option.id}`} onSelect={() => toggle(option.id)}>
                                    <Check className={cn('mr-2 h-4 w-4', selected.includes(option.id) ? 'opacity-100' : 'opacity-0')} aria-hidden />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    {(note || selected.length > 0) && (
                        <div className="flex items-center justify-between gap-2 border-t border-an-border px-3 py-2 text-xs text-an-muted">
                            <span>{note}</span>
                            {selected.length > 0 && (
                                <button type="button" className="font-medium text-an-accent hover:underline" onClick={() => onChange([])}>
                                    Clear
                                </button>
                            )}
                        </div>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    )
}
