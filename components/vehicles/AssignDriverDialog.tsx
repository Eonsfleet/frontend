'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDrivers } from '@/lib/api/drivers'
import { assignDriver } from '@/lib/api/vehicles'
import { toast } from 'sonner'
import { User, Loader2, Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssignDriverDialogProps {
    vehicleId: string | number
    vehicleReg: string
    isOpen: boolean
    onClose: () => void
}

export function AssignDriverDialog({ vehicleId, vehicleReg, isOpen, onClose }: AssignDriverDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedDriverId, setSelectedDriverId] = React.useState<string>('')
    const queryClient = useQueryClient()

    const { data: driversResponse, isLoading: isLoadingDrivers } = useQuery({
        queryKey: ['drivers-list-simple'],
        queryFn: () => getDrivers({ per_page: 100 }),
        enabled: isOpen,
    })

    const { mutate: doAssign, isPending: isAssigning } = useMutation({
        mutationFn: () => assignDriver(vehicleId, selectedDriverId),
        onSuccess: (data) => {
            toast.success(data.message || 'Driver assigned successfully')
            queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId.toString()] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to assign driver')
        }
    })

    const handleAssign = () => {
        if (!selectedDriverId) {
            toast.error('Please select a driver')
            return
        }
        doAssign()
    }

    const selectedDriver = driversResponse?.data.find(
        (driver) => driver.id.toString() === selectedDriverId
    )

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Driver</DialogTitle>
                    <DialogDescription>
                        Select a driver to assign to vehicle <span className="font-bold text-slate-900">{vehicleReg}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Available Drivers</label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full justify-between font-normal border-slate-200 h-10"
                                    disabled={isLoadingDrivers || isAssigning}
                                >
                                    {selectedDriver ? (
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-slate-400" />
                                            <span>{selectedDriver.attributes.full_name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-500">
                                            {isLoadingDrivers ? "Loading drivers..." : "Select a driver"}
                                        </span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search driver..." />
                                    <CommandList className="max-h-[200px]">
                                        <CommandEmpty>No driver found.</CommandEmpty>
                                        <CommandGroup>
                                            {driversResponse?.data.map((driver) => (
                                                <CommandItem
                                                    key={driver.id}
                                                    value={driver.attributes.full_name}
                                                    onSelect={() => {
                                                        setSelectedDriverId(driver.id.toString())
                                                        setOpen(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedDriverId === driver.id.toString() ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span>{driver.attributes.full_name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono italic">
                                                            {driver.attributes.email}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isAssigning}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={!selectedDriverId || isAssigning}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Assignment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
