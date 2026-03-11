'use client'

import React, { useState } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Vehicle } from '@/types'

interface MultiVehicleSelectorProps {
    vehicles: Vehicle[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
    placeholder?: string
}

export function MultiVehicleSelector({
    vehicles,
    selectedIds,
    onChange,
    placeholder = "Select vehicles..."
}: MultiVehicleSelectorProps) {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const toggleVehicle = (id: string) => {
        const newIds = selectedIds.includes(id)
            ? selectedIds.filter(val => val !== id)
            : [...selectedIds, id]
        onChange(newIds)
    }

    const removeVehicle = (id: string) => {
        onChange(selectedIds.filter(val => val !== id))
    }

    const filteredVehicles = vehicles.filter(v => {
        const search = searchQuery.toLowerCase()
        return (
            v.attributes.registration_number.toLowerCase().includes(search) ||
            v.attributes.make.toLowerCase().includes(search) ||
            v.attributes.model.toLowerCase().includes(search)
        )
    })

    const selectedVehicles = vehicles.filter(v => selectedIds.includes(v.id.toString()))

    return (
        <div className="space-y-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-12 rounded-xl border-slate-200 bg-white hover:bg-slate-50 transition-all font-medium text-slate-600"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <Search className="h-4 w-4 text-slate-400" />
                            {selectedIds.length > 0
                                ? `${selectedIds.length} vehicle(s) selected`
                                : placeholder}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl border-slate-100 shadow-2xl z-[100]" align="start">
                    <Command className="rounded-2xl" shouldFilter={false}>
                        <CommandInput 
                            placeholder="Search registration or model..." 
                            className="h-12 border-none focus:ring-0" 
                            onValueChange={setSearchQuery}
                        />
                        <CommandList className="max-h-[300px]">
                            {filteredVehicles.length === 0 && <CommandEmpty>No vehicle found.</CommandEmpty>}
                            <CommandGroup>
                                {filteredVehicles.map((vehicle) => (
                                    <CommandItem
                                        key={vehicle.id}
                                        value={vehicle.id.toString()}
                                        onSelect={() => toggleVehicle(vehicle.id.toString())}
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 rounded-xl m-1 group"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 leading-none mb-1">
                                                {vehicle.attributes.registration_number}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                                {vehicle.attributes.make} {vehicle.attributes.model}
                                            </span>
                                        </div>
                                        {selectedIds.includes(vehicle.id.toString()) && (
                                            <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center">
                                                <Check className="h-3 w-3 text-blue-600" />
                                            </div>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {selectedVehicles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {selectedVehicles.map(v => (
                        <Badge
                            key={v.id}
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 border-none px-3 py-1.5 rounded-lg flex items-center gap-2 group transition-all hover:bg-slate-200"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">{v.attributes.registration_number}</span>
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    removeVehicle(v.id.toString())
                                }}
                                className="text-slate-400 hover:text-rose-500 transition-colors"
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
