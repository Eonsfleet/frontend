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
import { getClusters } from '@/lib/api/settings'
import { assignCluster } from '@/lib/api/vehicles'
import { toast } from 'sonner'
import { LayoutGrid, Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssignClusterDialogProps {
    vehicleId: string | number
    vehicleReg: string
    isOpen: boolean
    onClose: () => void
}

export function AssignClusterDialog({ vehicleId, vehicleReg, isOpen, onClose }: AssignClusterDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedClusterId, setSelectedClusterId] = React.useState<string>('')
    const queryClient = useQueryClient()

    const { data: clustersResponse, isLoading: isLoadingClusters } = useQuery({
        queryKey: ['clusters-list-simple'],
        queryFn: () => getClusters({ per_page: 100 }),
        enabled: isOpen,
    })

    const { mutate: doAssign, isPending: isAssigning } = useMutation({
        mutationFn: () => assignCluster(vehicleId, selectedClusterId),
        onSuccess: (data) => {
            toast.success(data.message || 'Cluster assigned successfully')
            queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId.toString()] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to assign cluster')
        }
    })

    const handleAssign = () => {
        if (!selectedClusterId) {
            toast.error('Please select a cluster')
            return
        }
        doAssign()
    }

    const rawClusters = clustersResponse?.data?.clusters || clustersResponse?.data || []
    const clusters = Array.isArray(rawClusters) ? rawClusters : []
    const selectedCluster = clusters.find((c: any) => c.id.toString() === selectedClusterId)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign to Cluster</DialogTitle>
                    <DialogDescription>
                        Select an operational cluster for <span className="font-bold text-slate-900">{vehicleReg}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Available Clusters</label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full justify-between font-normal border-slate-200 h-10"
                                    disabled={isLoadingClusters || isAssigning}
                                >
                                    {selectedCluster ? (
                                        <div className="flex items-center gap-2">
                                            <LayoutGrid className="h-4 w-4 text-slate-400" />
                                            <span>{selectedCluster.attributes?.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-500">
                                            {isLoadingClusters ? "Loading clusters..." : "Select a cluster"}
                                        </span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search cluster..." />
                                    <CommandList className="max-h-[200px]">
                                        <CommandEmpty>No cluster found.</CommandEmpty>
                                        <CommandGroup>
                                            {clusters.map((cluster: any) => (
                                                <CommandItem
                                                    key={cluster.id}
                                                    value={cluster.attributes?.name}
                                                    onSelect={() => {
                                                        setSelectedClusterId(cluster.id.toString())
                                                        setOpen(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedClusterId === cluster.id.toString() ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span>{cluster.attributes?.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono italic">
                                                            {cluster.attributes?.total_vehicles || 0} Assets
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
                        disabled={!selectedClusterId || isAssigning}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Cluster
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
