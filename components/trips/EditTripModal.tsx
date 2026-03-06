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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trip } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTrip } from '@/lib/api/trips'
import { toast } from 'sonner'
import { Loader2, MapPin, Calendar } from 'lucide-react'

interface EditTripModalProps {
    isOpen: boolean
    onClose: () => void
    trip: Trip | null
}

export function EditTripModal({ isOpen, onClose, trip }: EditTripModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = React.useState({
        start_location: '',
        end_location: '',
        planned_start_time: '',
        planned_end_time: '',
    })

    React.useEffect(() => {
        if (trip) {
            const startLoc = typeof trip.attributes.start_location === 'string'
                ? trip.attributes.start_location
                : trip.attributes.start_location?.name || ''
            const endLoc = typeof trip.attributes.end_location === 'string'
                ? trip.attributes.end_location
                : trip.attributes.end_location?.name || ''

            setFormData({
                start_location: startLoc,
                end_location: endLoc,
                planned_start_time: trip.attributes.planned_start_time ? new Date(trip.attributes.planned_start_time).toISOString().slice(0, 16) : '',
                planned_end_time: trip.attributes.planned_end_time ? new Date(trip.attributes.planned_end_time).toISOString().slice(0, 16) : '',
            })
        }
    }, [trip])

    const { mutate: handleUpdate, isPending } = useMutation({
        mutationFn: () => updateTrip(trip!.id, formData),
        onSuccess: () => {
            toast.success('Trip updated successfully')
            queryClient.invalidateQueries({ queryKey: ['trips'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update trip')
        }
    })

    if (!trip) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Trip Details</DialogTitle>
                    <DialogDescription>
                        Update the route and schedule for trip <span className="font-bold text-slate-900">{trip.attributes.trip_number}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Origin</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    className="pl-10 h-11"
                                    value={formData.start_location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, start_location: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Destination</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    className="pl-10 h-11"
                                    value={formData.end_location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, end_location: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Planned Start</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    type="datetime-local"
                                    className="pl-10 h-11"
                                    value={formData.planned_start_time}
                                    onChange={(e) => setFormData(prev => ({ ...prev, planned_start_time: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Planned End (ETA)</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    type="datetime-local"
                                    className="pl-10 h-11"
                                    value={formData.planned_end_time}
                                    onChange={(e) => setFormData(prev => ({ ...prev, planned_end_time: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleUpdate()}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
