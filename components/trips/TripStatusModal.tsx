'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trip } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTripStatus } from '@/lib/api/trips'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/utils'
import { Loader2, AlertCircle, CheckCircle2, PlayCircle, StopCircle, XCircle } from 'lucide-react'

interface TripStatusModalProps {
    isOpen: boolean
    onClose: () => void
    trip: Trip | null
}

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft', icon: AlertCircle, color: 'text-slate-500' },
    { value: 'scheduled', label: 'Scheduled', icon: CheckCircle2, color: 'text-blue-500' },
    { value: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'text-amber-500' },
    { value: 'completed', label: 'Completed', icon: StopCircle, color: 'text-green-500' },
    { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-rose-500' },
]

export function TripStatusModal({ isOpen, onClose, trip }: TripStatusModalProps) {
    const [status, setStatus] = React.useState<string>('')
    const queryClient = useQueryClient()

    React.useEffect(() => {
        if (trip) {
            setStatus(trip.attributes.status)
        }
    }, [trip])

    const { mutate: handleUpdate, isPending } = useMutation({
        mutationFn: () => updateTripStatus(trip!.id, status),
        onSuccess: () => {
            toast.success('Trip status updated successfully')
            queryClient.invalidateQueries({ queryKey: ['trips'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error(extractApiError(error, 'Failed to update status'))
        }
    })

    if (!trip) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Change Trip Status</DialogTitle>
                    <DialogDescription>
                        Update the lifecycle state for trip <span className="font-bold text-slate-900">{trip.attributes.trip_number}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Current Status</label>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                            <span className="text-sm font-semibold capitalize text-slate-600">
                                {trip.attributes.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">New Status</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select new status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        <div className="flex items-center gap-2">
                                            <opt.icon className={`h-4 w-4 ${opt.color}`} />
                                            <span>{opt.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleUpdate()}
                        disabled={isPending || status === trip.attributes.status}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                            </>
                        ) : (
                            'Update Status'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
