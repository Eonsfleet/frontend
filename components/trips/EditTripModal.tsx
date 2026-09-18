'use client'

import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    Route,
    Truck,
    User,
    Calendar,
    MapPin,
    CheckCircle2,
    Loader2,
    ChevronRight,
    ChevronLeft,
    Plus,
    Trash2,
    Clock,
    Navigation,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useActiveVehiclesDropdown } from '@/hooks/useVehiclesDropdown'
import { getDrivers } from '@/lib/api/drivers'
import { updateTrip, calculateTripEstimate } from '@/lib/api/trips'
import { toast } from 'sonner'
import { cn, extractApiError } from '@/lib/utils'
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete'
import { addMinutes, format } from 'date-fns'
import { Trip } from '@/types'

interface Waypoint {
    id: string
    location_name: string
    latitude: number
    longitude: number
    expected_arrival_time: string
    is_checkpoint: boolean
    is_stop_point: boolean
}

interface EditTripModalProps {
    isOpen: boolean
    onClose: () => void
    trip: Trip | null
}

const wizardSteps = [
    { id: 1, title: 'Asset Assignment', desc: 'Select vehicle and driver', icon: Truck },
    { id: 2, title: 'Route & Schedule', desc: 'Locations and timing', icon: MapPin },
    { id: 3, title: 'Checkpoints', desc: 'Manage intermediate stops', icon: Route },
    { id: 4, title: 'Review & Save', desc: 'Final check and update', icon: CheckCircle2 },
]

/** Normalise a datetime string to the format datetime-local inputs expect */
function toDatetimeLocal(val: string | null | undefined): string {
    if (!val) return ''
    try {
        return format(new Date(val), "yyyy-MM-dd'T'HH:mm")
    } catch {
        return ''
    }
}

export function EditTripModal({ isOpen, onClose, trip }: EditTripModalProps) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState(1)
    const [isCalculatingEta, setIsCalculatingEta] = useState(false)
    const [etaMinutes, setEtaMinutes] = useState<number | null>(null)

    // ── Derive initial form state from the trip ──────────────────────────────
    const buildInitialForm = () => ({
        vehicle_id: trip?.attributes.vehicle_id?.toString() ?? trip?.relationships?.vehicle?.id?.toString() ?? '',
        driver_id: trip?.attributes.driver_id?.toString() ?? '',
        start_location: !trip ? { name: '', coords: { latitude: 6.5244, longitude: 3.3792 } }
            : typeof trip.attributes.start_location === 'string'
                ? { name: trip.attributes.start_location, coords: { latitude: 6.5244, longitude: 3.3792 } }
                : { ...trip.attributes.start_location },
        end_location: !trip ? { name: '', coords: { latitude: 6.4281, longitude: 3.4276 } }
            : typeof trip.attributes.end_location === 'string'
                ? { name: trip.attributes.end_location, coords: { latitude: 6.4281, longitude: 3.4276 } }
                : { ...trip.attributes.end_location },
        planned_start_time: toDatetimeLocal(trip?.attributes.planned_start_time),
        planned_end_time: toDatetimeLocal(trip?.attributes.planned_end_time),
        recurring_type: trip?.attributes.recurring_type ?? 'one_time',
    })

    const buildInitialWaypoints = (): Waypoint[] =>
        (trip?.attributes.routes ?? []).map((r, i) => ({
            id: `existing-${i}`,
            location_name: r.location_name,
            latitude: r.coordinates.latitude,
            longitude: r.coordinates.longitude,
            expected_arrival_time: r.expected_arrival_time,
            is_checkpoint: r.is_checkpoint,
            is_stop_point: r.is_stop_point,
        }))

    const [formData, setFormData] = useState(buildInitialForm)
    const [waypoints, setWaypoints] = useState<Waypoint[]>(buildInitialWaypoints)

    // Re-seed whenever the modal opens with a (possibly different) trip
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setFormData(buildInitialForm())
            setWaypoints(buildInitialWaypoints())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, trip?.id])

    // ── Data queries ─────────────────────────────────────────────────────────
    const { data: vehiclesData, isLoading: isLoadingVehicles } = useActiveVehiclesDropdown(isOpen)

    const { data: driversData, isLoading: isLoadingDrivers } = useQuery({
        queryKey: ['drivers-list-simple'],
        queryFn: () => getDrivers({ per_page: 100 }),
        enabled: isOpen,
    })

    // ── Mutation ─────────────────────────────────────────────────────────────
    const { mutate: handleSave, isPending: isSaving } = useMutation({
        mutationFn: () => {
            if (!trip) return Promise.reject(new Error('No trip'))
            const routes = waypoints.map((wp, index) => ({
                route_order: index + 1,
                location_name: wp.location_name,
                coordinates: { latitude: wp.latitude, longitude: wp.longitude },
                expected_arrival_time: wp.expected_arrival_time,
                is_checkpoint: wp.is_checkpoint,
                is_stop_point: wp.is_stop_point,
            }))
            return updateTrip(trip.id, {
                ...formData,
                vehicle_id: formData.vehicle_id || undefined,
                driver_id: formData.driver_id || undefined,
                planned_end_time: formData.planned_end_time || null,
                routes,
            } as any)
        },
        onSuccess: () => {
            toast.success('Trip updated successfully.')
            queryClient.invalidateQueries({ queryKey: ['trips', trip?.id] })
            queryClient.invalidateQueries({ queryKey: ['trips'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error(extractApiError(error, 'Failed to update trip.'))
        },
    })

    // ── Helpers ───────────────────────────────────────────────────────────────
    const updateField = (field: string, value: any) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value }
            if ((field === 'planned_start_time') && next.planned_start_time && etaMinutes) {
                const end = addMinutes(new Date(next.planned_start_time), etaMinutes)
                next.planned_end_time = format(end, "yyyy-MM-dd'T'HH:mm")
            }
            return next
        })
    }

    const handleLocationSelect = async (type: 'start' | 'end', location: any) => {
        const key = type === 'start' ? 'start_location' : 'end_location'
        const newForm = { ...formData, [key]: location }
        setFormData(newForm)

        if (
            newForm.start_location.coords.latitude !== 0 &&
            newForm.end_location.coords.latitude !== 0
        ) {
            setIsCalculatingEta(true)
            try {
                const res = await calculateTripEstimate({
                    start_location: newForm.start_location,
                    end_location: newForm.end_location,
                })
                const mins = 120 // fallback; parse res.data.eta if API returns numeric
                setEtaMinutes(mins)
                if (newForm.planned_start_time) {
                    const end = addMinutes(new Date(newForm.planned_start_time), mins)
                    setFormData(f => ({ ...f, [key]: location, planned_end_time: format(end, "yyyy-MM-dd'T'HH:mm") }))
                }
                toast.success(`Estimated arrival: ${res.data.eta}`)
            } catch {
                // silent — ETA is optional
            } finally {
                setIsCalculatingEta(false)
            }
        }
    }

    const addWaypoint = () =>
        setWaypoints(prev => [...prev, {
            id: Math.random().toString(36).slice(2),
            location_name: '', latitude: 0, longitude: 0,
            expected_arrival_time: '30', is_checkpoint: false, is_stop_point: false,
        }])

    const removeWaypoint = (id: string) => setWaypoints(prev => prev.filter(w => w.id !== id))

    const updateWaypoint = (id: string, field: keyof Waypoint, value: any) =>
        setWaypoints(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w))

    const isStep1Valid = !!formData.vehicle_id && !!formData.driver_id
    const isStep2Valid = !!formData.start_location.name && !!formData.end_location.name && !!formData.planned_start_time

    const selectedVehicle = vehiclesData?.data.find(v => v.id.toString() === formData.vehicle_id)
    const selectedDriver = driversData?.data.find(d => d.id.toString() === formData.driver_id)

    if (!trip) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Route className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black uppercase tracking-tight italic text-white">
                                Edit Trip
                            </DialogTitle>
                            <DialogDescription className="text-white/50 text-xs font-bold uppercase tracking-widest">
                                {trip.attributes.trip_number} · Step {step} of 4
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-52 shrink-0 bg-slate-50 border-r border-slate-100 p-4 space-y-2 overflow-y-auto">
                        {wizardSteps.map(s => (
                            <div
                                key={s.id}
                                className={cn(
                                    'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                                    step === s.id
                                        ? 'bg-white border-blue-200 shadow-sm'
                                        : step > s.id
                                            ? 'bg-slate-50 border-slate-200 opacity-70'
                                            : 'bg-transparent border-transparent opacity-40'
                                )}
                                onClick={() => {
                                    // allow going back freely; forward only if current step valid
                                    if (s.id < step) setStep(s.id)
                                    else if (s.id === step + 1 && (step !== 1 || isStep1Valid) && (step !== 2 || isStep2Valid)) setStep(s.id)
                                }}
                            >
                                <div className={cn(
                                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                                    step === s.id ? 'bg-blue-600 text-white' : step > s.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                                )}>
                                    {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                                </div>
                                <div className="min-w-0">
                                    <p className={cn('text-xs font-bold truncate', step === s.id ? 'text-slate-900' : 'text-slate-500')}>{s.title}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* ── Step 1: Assets ── */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Vehicle</label>
                                    <Select
                                        value={formData.vehicle_id}
                                        onValueChange={val => updateField('vehicle_id', val)}
                                        disabled={isLoadingVehicles}
                                    >
                                        <SelectTrigger className="h-12">
                                            <SelectValue placeholder={isLoadingVehicles ? 'Loading...' : 'Assign an active vehicle'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehiclesData?.data.map(v => (
                                                <SelectItem key={v.id} value={v.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <Truck className="h-4 w-4 text-slate-400" />
                                                        <span>{v.attributes.registration_number} — {v.attributes.make} {v.attributes.model}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Driver</label>
                                    <Select
                                        value={formData.driver_id}
                                        onValueChange={val => updateField('driver_id', val)}
                                        disabled={isLoadingDrivers}
                                    >
                                        <SelectTrigger className="h-12">
                                            <SelectValue placeholder={isLoadingDrivers ? 'Loading...' : 'Assign a driver'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {driversData?.data.map(d => (
                                                <SelectItem key={d.id} value={d.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                        <span>{d.attributes.full_name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Route & Schedule ── */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 italic">Origin</label>
                                        <LocationAutocomplete
                                            value={formData.start_location.name}
                                            onSelect={loc => handleLocationSelect('start', loc)}
                                            placeholder="Search starting point..."
                                            icon={<Navigation className="h-4 w-4 text-blue-600" />}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 italic">Destination</label>
                                        <LocationAutocomplete
                                            value={formData.end_location.name}
                                            onSelect={loc => handleLocationSelect('end', loc)}
                                            placeholder="Search ending point..."
                                            icon={<MapPin className="h-4 w-4 text-emerald-600" />}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Planned Start Time</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                type="datetime-local"
                                                className="pl-10 h-12"
                                                value={formData.planned_start_time}
                                                onChange={e => updateField('planned_start_time', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Planned End Time (ETA)</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                type="datetime-local"
                                                className={cn('pl-10 h-12', isCalculatingEta && 'opacity-50')}
                                                value={formData.planned_end_time}
                                                onChange={e => updateField('planned_end_time', e.target.value)}
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
                        )}

                        {/* ── Step 3: Waypoints ── */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Intermediate Stops</h3>
                                        <p className="text-[11px] text-slate-500">Optional — skip for direct trips.</p>
                                    </div>
                                    <Button size="sm" onClick={addWaypoint} className="bg-slate-900 hover:bg-slate-800 h-9 text-[10px] font-black uppercase tracking-widest">
                                        <Plus className="w-3.5 h-3.5 mr-2" /> Add Stop
                                    </Button>
                                </div>

                                {waypoints.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center px-6">
                                        <Route className="h-8 w-8 text-slate-200 mb-3" />
                                        <p className="text-sm font-bold text-slate-400">No stops added</p>
                                        <p className="text-xs text-slate-400 mt-1">Direct route from origin to destination.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {waypoints.map((wp, idx) => (
                                            <div key={wp.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <LocationAutocomplete
                                                                value={wp.location_name}
                                                                onSelect={loc => {
                                                                    updateWaypoint(wp.id, 'location_name', loc.name)
                                                                    updateWaypoint(wp.id, 'latitude', loc.coords.latitude)
                                                                    updateWaypoint(wp.id, 'longitude', loc.coords.longitude)
                                                                }}
                                                                placeholder="Search stop point..."
                                                                className="border-none shadow-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => removeWaypoint(wp.id)}
                                                        className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ETA (Minutes)</label>
                                                        <div className="relative">
                                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                                            <Input
                                                                type="number"
                                                                className="pl-8 h-9 text-xs font-bold"
                                                                value={wp.expected_arrival_time}
                                                                onChange={e => updateWaypoint(wp.id, 'expected_arrival_time', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-3 pt-6">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" htmlFor={`chk-${wp.id}`}>
                                                            Checkpoint
                                                        </label>
                                                        <Switch
                                                            id={`chk-${wp.id}`}
                                                            checked={wp.is_checkpoint}
                                                            onCheckedChange={val => updateWaypoint(wp.id, 'is_checkpoint', val)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Step 4: Review ── */}
                        {step === 4 && (
                            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-200">
                                    {/* Assets */}
                                    <div className="pb-5 grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Vehicle</p>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                                                    <Truck className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 italic leading-tight">
                                                        {selectedVehicle?.attributes.registration_number ?? formData.vehicle_id}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">
                                                        {selectedVehicle?.attributes.make} {selectedVehicle?.attributes.model}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Driver</p>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 leading-tight">
                                                        {selectedDriver?.attributes.full_name ?? formData.driver_id}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Route */}
                                    <div className="py-5">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-4">Route</p>
                                        <div className="relative space-y-5 pl-4 border-l-2 border-dashed border-slate-200">
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-0 h-4 w-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                                                <p className="text-xs font-black text-slate-900">{formData.start_location.name || '—'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Origin</p>
                                            </div>
                                            {waypoints.map(wp => (
                                                <div key={wp.id} className="relative">
                                                    <div className={cn('absolute -left-[21px] top-0 h-4 w-4 rounded-full border-4 border-white shadow-sm', wp.is_checkpoint ? 'bg-amber-500' : 'bg-slate-300')} />
                                                    <p className="text-xs font-black text-slate-900">{wp.location_name || '—'}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                        {wp.is_checkpoint ? 'CHECKPOINT' : 'WAYPOINT'} · {wp.expected_arrival_time} MIN ETA
                                                    </p>
                                                </div>
                                            ))}
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                                                <p className="text-xs font-black text-slate-900">{formData.end_location.name || '—'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Destination</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Times */}
                                    <div className="pt-5 grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Planned Start</p>
                                            <p className="text-sm font-black text-slate-900 italic mt-1">
                                                {formData.planned_start_time ? new Date(formData.planned_start_time).toLocaleString() : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Planned End</p>
                                            <p className="text-sm font-black text-slate-900 italic mt-1">
                                                {formData.planned_end_time ? new Date(formData.planned_end_time).toLocaleString() : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Navigation ── */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <Button
                                variant="ghost"
                                onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
                                disabled={isSaving}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                            >
                                {step === 1 ? 'Cancel' : <><ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back</>}
                            </Button>

                            {step < 4 ? (
                                <Button
                                    onClick={() => setStep(s => s + 1)}
                                    disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                                    className="bg-slate-900 hover:bg-slate-800 px-8 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest"
                                >
                                    {wizardSteps[step].title} <ChevronRight className="h-3.5 w-3.5 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleSave()}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 px-10 rounded-xl h-11 text-[10px] font-black uppercase tracking-widest"
                                >
                                    {isSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Saving...</> : 'Save Changes'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
