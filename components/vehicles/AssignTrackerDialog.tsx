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
import { getDevices } from '@/lib/api/tracking'
import { assignDevice } from '@/lib/api/vehicles'
import { toast } from 'sonner'
import { Cpu, Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssignTrackerDialogProps {
    vehicleId: string | number
    vehicleReg: string
    isOpen: boolean
    onClose: () => void
}

export function AssignTrackerDialog({ vehicleId, vehicleReg, isOpen, onClose }: AssignTrackerDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>('')
    const queryClient = useQueryClient()

    const { data: devicesResponse, isLoading: isLoadingDevices } = useQuery({
        queryKey: ['devices-list-simple'],
        queryFn: () => getDevices({ per_page: 100 }),
        enabled: isOpen,
    })

    const { mutate: doAssign, isPending: isAssigning } = useMutation({
        mutationFn: () => assignDevice(vehicleId, selectedDeviceId),
        onSuccess: (data) => {
            toast.success(data.message || 'Tracker assigned successfully')
            queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId.toString()] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to assign tracker')
        }
    })

    const handleAssign = () => {
        if (!selectedDeviceId) {
            toast.error('Please select a device')
            return
        }
        doAssign()
    }

    const rawDevices = devicesResponse?.data?.devices || devicesResponse?.data || []
    const devices = Array.isArray(rawDevices) ? rawDevices : []
    const selectedDevice = devices.find((d: any) => (d.attributes?.device_id || d.device_id) === selectedDeviceId)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign GPS Tracker</DialogTitle>
                    <DialogDescription>
                        Link a hardware device to vehicle <span className="font-bold text-slate-900">{vehicleReg}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Available Trackers</label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full justify-between font-normal border-slate-200 h-10"
                                    disabled={isLoadingDevices || isAssigning}
                                >
                                    {selectedDevice ? (
                                        <div className="flex items-center gap-2">
                                            <Cpu className="h-4 w-4 text-slate-400" />
                                            <span>{selectedDevice.attributes?.device_id || selectedDevice.device_id}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-500">
                                            {isLoadingDevices ? "Loading devices..." : "Select a tracker"}
                                        </span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search serial or IMEI..." />
                                    <CommandList className="max-h-[200px]">
                                        <CommandEmpty>No device found.</CommandEmpty>
                                        <CommandGroup>
                                            {devices.map((device: any) => (
                                                <CommandItem
                                                    key={device.id}
                                                    value={device.attributes?.device_id || device.device_id}
                                                    onSelect={() => {
                                                        setSelectedDeviceId(device.attributes?.device_id || device.device_id)
                                                        setOpen(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedDeviceId === (device.attributes?.device_id || device.device_id) ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span>{device.attributes?.device_id || device.device_id}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono italic">
                                                            {device.attributes?.phone_number || 'No Phone'} • {device.attributes?.status || device.status}
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
                        disabled={!selectedDeviceId || isAssigning}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
