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
import { updateTrip, calculateTripEstimate } from '@/lib/api/trips'
import { toast } from 'sonner'
import { Loader2, MapPin, Calendar, Navigation } from 'lucide-react'
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete'
import { addMinutes, format } from 'date-fns'
import { cn } from '@/lib/utils'

interface EditTripModalProps {
    isOpen: boolean
    onClose: () => void
    trip: Trip | null
}

export function EditTripModal({ isOpen, onClose, trip }: EditTripModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = React.useState({
        start_location: {
            name: '',
            coords: { latitude: 0, longitude: 0 }
        },
        end_location: {
            name: '',
            coords: { latitude: 0, longitude: 0 }
        },
        planned_start_time: '',
        planned_end_time: '',
    })
    const [isCalculatingEta, setIsCalculatingEta] = React.useState(false)
    const [etaMinutes, setEtaMinutes] = React.useState<number | null>(null)

    React.useEffect(() => {
        if (trip) {
            const startLoc = typeof trip.attributes.start_location === 'string'
                ? { name: trip.attributes.start_location, coords: { latitude: 6.5244, longitude: 3.3792 } }
                : trip.attributes.start_location || { name: '', coords: { latitude: 0, longitude: 0 } }

            const endLoc = typeof trip.attributes.end_location === 'string'
                ? { name: trip.attributes.end_location, coords: { latitude: 6.4281, longitude: 3.4276 } }
                : trip.attributes.end_location || { name: '', coords: { latitude: 0, longitude: 0 } }

            setFormData({
                start_location: startLoc,
                end_location: endLoc,
                planned_start_time: trip.attributes.planned_start_time ? new Date(trip.attributes.planned_start_time).toISOString().slice(0, 16) : '',
                planned_end_time: trip.attributes.planned_end_time ? new Date(trip.attributes.planned_end_time).toISOString().slice(0, 16) : '',
            })
        }
    }, [trip])

    const updateField = (field: string, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value }

            // Auto-update end time if start time or ETA changes
            if ((field === 'planned_start_time' || field === 'etaMinutes') && newData.planned_start_time && etaMinutes) {
                const startTime = new Date(newData.planned_start_time)
                const endTime = addMinutes(startTime, etaMinutes)
                newData.planned_end_time = format(endTime, "yyyy-MM-dd'T'HH:mm")
            }

            return newData
        })
    }

    const handleLocationSelect = async (type: 'start' | 'end', location: any) => {
        const newFormData = {
            ...formData,
            [type === 'start' ? 'start_location' : 'end_location']: location
        }
        setFormData(newFormData)

        if (newFormData.start_location.coords.latitude !== 0 && newFormData.end_location.coords.latitude !== 0) {
            setIsCalculatingEta(true)
            try {
                const response = await calculateTripEstimate({
                    start_location: newFormData.start_location,
                    end_location: newFormData.end_location
                })

                const parsedMinutes = 120 // Fallback/Mock
                setEtaMinutes(parsedMinutes)

                if (newFormData.planned_start_time) {
                    const startTime = new Date(newFormData.planned_start_time)
                    const endTime = addMinutes(startTime, parsedMinutes)
                    setFormData(prev => ({
                        ...prev,
                        [type === 'start' ? 'start_location' : 'end_location']: location,
                        planned_end_time: format(endTime, "yyyy-MM-dd'T'HH:mm")
                    }))
                }
                toast.success(`Estimated arrival: ${response.data.eta}`)
            } catch (error) {
                console.error('Failed to calculate ETA', error)
            } finally {
                setIsCalculatingEta(false)
            }
        }
    }

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
                            <LocationAutocomplete
                                value={formData.start_location.name}
                                onSelect={(loc) => handleLocationSelect('start', loc)}
                                placeholder="Search origin..."
                                icon={<Navigation className="h-4 w-4 text-blue-600" />}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Destination</Label>
                            <LocationAutocomplete
                                value={formData.end_location.name}
                                onSelect={(loc) => handleLocationSelect('end', loc)}
                                placeholder="Search destination..."
                                icon={<MapPin className="h-4 w-4 text-emerald-600" />}
                            />
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
                                    className={cn("pl-10 h-11", isCalculatingEta && "opacity-50")}
                                    value={formData.planned_end_time}
                                    onChange={(e) => updateField('planned_end_time', e.target.value)}
                                />
                                {isCalculatingEta && (
                                    <div className="absolute right-3 top-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    </div>
                                )}
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
