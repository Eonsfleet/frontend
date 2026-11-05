'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getDrivers } from '@/lib/api/drivers'
import { cn } from '@/lib/utils'

/**
 * Pick one driver to look at. It shares its list (and cache) with the filter
 * bar's driver filter; choosing a driver is the same as filtering to that
 * driver, and the Drivers tab then shows that driver's own page.
 */
export function DriverFocusPicker({ selected, onSelect }: { selected: number | null; onSelect: (id: number | null) => void }) {
    const [open, setOpen] = useState(false)
    const drivers = useQuery({ queryKey: ['analytics-picker', 'drivers'], queryFn: () => getDrivers({ per_page: 100 }), staleTime: 10 * 60_000 })

    const options = useMemo(
        () =>
            (drivers.data?.data ?? []).flatMap((d) => {
                const id = Number(d.id)
                return Number.isInteger(id) && id > 0 ? [{ id, label: d.attributes.full_name || d.attributes.email }] : []
            }),
        [drivers.data],
    )
    const current = options.find((o) => o.id === selected)
    const total = drivers.data?.pagination?.total

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 min-w-[14rem] justify-between gap-2 border-an-border bg-an-surface font-normal" aria-label="Look at one driver">
                    <span className="flex min-w-0 items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0 text-an-muted" aria-hidden />
                        <span className="truncate">{current ? current.label : selected ? `Driver ${selected}` : 'Look at one driver…'}</span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search drivers…" />
                    <CommandList>
                        <CommandEmpty>{drivers.isPending ? 'Loading…' : 'No drivers found.'}</CommandEmpty>
                        <CommandGroup>
                            {options.map((o) => (
                                <CommandItem
                                    key={o.id}
                                    value={`${o.label} ${o.id}`}
                                    onSelect={() => {
                                        onSelect(o.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', selected === o.id ? 'opacity-100' : 'opacity-0')} aria-hidden />
                                    {o.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    {total && total > options.length ? <p className="border-t border-an-border px-3 py-2 text-xs text-an-muted">Showing the first {options.length} of {total} drivers. Search finds only those.</p> : null}
                </Command>
            </PopoverContent>
        </Popover>
    )
}
