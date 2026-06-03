'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    ChevronLeft,
    Route,
    Truck,
    User,
    Calendar,
    MapPin,
    CheckCircle2,
    Loader2,
    ChevronRight,
    AlertCircle,
    Plus,
    Trash2,
    Clock,
    GripVertical,
    Navigation
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getVehicles } from '@/lib/api/vehicles'
import { getDrivers } from '@/lib/api/drivers'
import { createTrip, calculateTripEstimate, generateTripRoute } from '@/lib/api/trips'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete'
import { addMinutes, format } from 'date-fns'

interface Waypoint {
    id: string
    location_name: string
    latitude: number
    longitude: number
    expected_arrival_time: string
    is_checkpoint: boolean
    is_stop_point: boolean
}

export default function NewTripPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        vehicle_id: '',
        driver_id: '',
        start_location: {
            name: '',
            coords: { latitude: 6.5244, longitude: 3.3792 }
        },
        end_location: {
            name: '',
            coords: { latitude: 6.4281, longitude: 3.4276 }
        },
        planned_start_time: '',
        planned_end_time: '',
        recurring_type: 'one_time',
        status: 'scheduled',
        note: '',
        distance_km: null as number | null,
        recurring_end_date: null as string | null,
    })

    const [waypoints, setWaypoints] = useState<Waypoint[]>([])
    const [isCalculatingEta, setIsCalculatingEta] = useState(false)
    const [isGeneratingRoute, setIsGeneratingRoute] = useState(false)
    const [etaMinutes, setEtaMinutes] = useState<number | null>(null)

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles-list-simple'],
        queryFn: () => getVehicles({ per_page: 100, status: 'active' }),
    })

    const { data: driversData, isLoading: isLoadingDrivers } = useQuery({
        queryKey: ['drivers-list-simple'],
        queryFn: () => getDrivers({ per_page: 100 }),
    })

    const { mutate: handleDispatch, isPending: isDispatching } = useMutation({
        mutationFn: (data: any) => {
            // Format routes for API - filter out waypoints without location names
            const formattedRoutes = waypoints
                .filter(wp => wp.location_name && wp.location_name.trim() !== '')
                .map((wp, index) => ({
                    route_order: index + 1,
                    location_name: wp.location_name,
                    coordinates: {
                        latitude: wp.latitude,
                        longitude: wp.longitude
                    },
                    expected_arrival_time: wp.expected_arrival_time,
                    is_checkpoint: wp.is_checkpoint,
                    is_stop_point: wp.is_stop_point
                }))

            // Build payload matching API requirements exactly
            const payload: any = {
                vehicle_id: Number(data.vehicle_id),
                driver_id: Number(data.driver_id),
                status: data.status || 'scheduled',
                recurring_type: data.recurring_type || 'one_time',
                eta: etaMinutes ? `${Math.floor(etaMinutes / 60)} hours ${etaMinutes % 60} minutes` : "To be calculated",
                planned_start_time: data.planned_start_time,
                planned_end_time: data.planned_end_time,
                start_location: {
                    name: data.start_location.name,
                    coords: {
                        latitude: data.start_location.coords.latitude,
                        longitude: data.start_location.coords.longitude
                    }
                },
                end_location: {
                    name: data.end_location.name,
                    coords: {
                        latitude: data.end_location.coords.latitude,
                        longitude: data.end_location.coords.longitude
                    }
                }
            }

            // Only add routes if there are valid waypoints
            if (formattedRoutes.length > 0) {
                payload.routes = formattedRoutes
            }

            // Add optional fields if present
            if (data.recurring_end_date) {
                payload.recurring_end_date = data.recurring_end_date
            }
            
            if (data.note) {
                payload.note = data.note
            }

            if (data.distance_km) {
                payload.distance_km = data.distance_km.toString()
            }

            // Add metadata if needed
            payload.metadata = {}

            console.log('📦 Trip Payload with Routes:', JSON.stringify(payload, null, 2))
            console.log('🛣️ Total waypoints in state:', waypoints.length)
            console.log('✅ Valid routes being sent:', formattedRoutes.length)

            return createTrip(payload)
        },
        onSuccess: (response) => {
            toast.success('Trip created and dispatched successfully!')
            router.push(`/trips`)
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to dispatch trip')
        }
    })

    const nextStep = () => setStep(s => s + 1)
    const prevStep = () => setStep(s => s - 1)

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

        // If both are selected, try to calculate ETA (optional feature)
        if (newFormData.start_location.coords.latitude !== 0 && newFormData.end_location.coords.latitude !== 0) {
            setIsCalculatingEta(true)
            try {
                const response = await calculateTripEstimate({
                    start_location: newFormData.start_location,
                    end_location: newFormData.end_location
                })

                // Parse ETA - assume API returns distance and we estimate time
                const estimatedMinutes = response.data.distance_km ? Math.ceil(response.data.distance_km * 2) : 120

                setEtaMinutes(estimatedMinutes)

                if (newFormData.planned_start_time) {
                    const startTime = new Date(newFormData.planned_start_time)
                    const endTime = addMinutes(startTime, estimatedMinutes)
                    setFormData(prev => ({
                        ...prev,
                        [type === 'start' ? 'start_location' : 'end_location']: location,
                        planned_end_time: format(endTime, "yyyy-MM-dd'T'HH:mm")
                    }))
                }
                
                if (response.data.eta) {
                    toast.success(`Estimated time: ${response.data.eta}`)
                }
            } catch (error: any) {
                // ETA calculation is optional - don't block the user
                console.warn('Could not calculate ETA automatically:', error)
                // Set a default ETA of 2 hours
                const defaultMinutes = 120
                setEtaMinutes(defaultMinutes)
                
                if (newFormData.planned_start_time) {
                    const startTime = new Date(newFormData.planned_start_time)
                    const endTime = addMinutes(startTime, defaultMinutes)
                    setFormData(prev => ({
                        ...prev,
                        planned_end_time: format(endTime, "yyyy-MM-dd'T'HH:mm")
                    }))
                }
            } finally {
                setIsCalculatingEta(false)
            }
        }
    }

    const handleGenerateRoute = async () => {
        setIsGeneratingRoute(true)
        try {
            // Prepare waypoints if any exist (convert to lat,lng format)
            const existingWaypoints = waypoints.length > 0 
                ? waypoints.map(wp => ({ latitude: wp.latitude, longitude: wp.longitude }))
                : undefined

            const response = await generateTripRoute({
                start_location: formData.start_location,
                end_location: formData.end_location,
                waypoints: existingWaypoints
            })

            if (response.data.waypoints) {
                const newWps = response.data.waypoints.map((wp: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    location_name: wp.name,
                    latitude: wp.coords.latitude,
                    longitude: wp.coords.longitude,
                    expected_arrival_time: wp.eta_minutes?.toString() || '30',
                    is_checkpoint: wp.is_checkpoint || false,
                    is_stop_point: wp.is_stop_point || false
                }))
                setWaypoints(newWps)
                toast.success('Optimized route generated with checkpoints')
            }
        } catch (error) {
            toast.error('Failed to generate optimized route')
        } finally {
            setIsGeneratingRoute(false)
        }
    }

    const addWaypoint = () => {
        const newWp: Waypoint = {
            id: Math.random().toString(36).substr(2, 9),
            location_name: '',
            latitude: 0,
            longitude: 0,
            expected_arrival_time: '30',
            is_checkpoint: false,
            is_stop_point: false
        }
        setWaypoints([...waypoints, newWp])
    }

    const removeWaypoint = (id: string) => {
        setWaypoints(waypoints.filter(w => w.id !== id))
    }

    const updateWaypoint = (id: string, field: keyof Waypoint, value: any) => {
        setWaypoints(waypoints.map(w => w.id === id ? { ...w, [field]: value } : w))
    }

    const isStep1Valid = formData.vehicle_id && formData.driver_id
    const isStep2Valid = formData.start_location.name && formData.end_location.name && formData.planned_start_time
    // Step 3 (Waypoints) is skippable as per requirement

    const selectedVehicle = vehiclesData?.data.find(v => v.id.toString() === formData.vehicle_id)
    const selectedDriver = driversData?.data.find(d => d.id.toString() === formData.driver_id)

    const wizardSteps = [
        { id: 1, title: 'Asset Assignment', desc: 'Select vehicle and driver', icon: Truck },
        { id: 2, title: 'Route & Schedule', desc: 'Locations and timing', icon: MapPin },
        { id: 3, title: 'Checkpoint & Optimization', desc: 'Manage intermediate stops', icon: Route },
        { id: 4, title: 'Review & Dispatch', desc: 'Final check and launch', icon: CheckCircle2 },
    ]

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-full">
            <Link
                href="/trips"
                className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Trips
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <Route className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Trip</h1>
                        <p className="text-slate-500 mt-0.5">Set up a new journey, assign assets, and define the route.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Steps Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    {wizardSteps.map((s) => (
                        <div
                            key={s.id}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                                step === s.id
                                    ? "bg-white border-blue-200 shadow-md scale-[1.02]"
                                    : step > s.id
                                        ? "bg-slate-50 border-slate-200 opacity-80"
                                        : "bg-transparent border-transparent opacity-50"
                            )}
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center font-bold",
                                step === s.id ? "bg-blue-600 text-white" : step > s.id ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-500"
                            )}>
                                {step > s.id ? <CheckCircle2 className="h-5 w-5" /> : s.id}
                            </div>
                            <div>
                                <h3 className={cn("text-sm font-bold", step === s.id ? "text-slate-900" : "text-slate-500")}>{s.title}</h3>
                                <p className="text-xs text-slate-400">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Wizard Area */}
                <div className="lg:col-span-2">
                    <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-100">
                            <CardTitle className="text-lg">
                                {step === 1 && 'Select Vehicle & Driver'}
                                {step === 2 && 'Set Route & Schedule'}
                                {step === 3 && 'Waypoint & Optimization (Optional)'}
                                {step === 4 && 'Review Trip Details'}
                            </CardTitle>
                            <CardDescription>Step {step} of 4</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Step 1: Assets */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Vehicle</label>
                                        <Select
                                            value={formData.vehicle_id}
                                            onValueChange={(val) => updateField('vehicle_id', val)}
                                            disabled={isLoadingVehicles}
                                        >
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder={isLoadingVehicles ? "Loading..." : "Assign an active vehicle"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehiclesData?.data.map(v => (
                                                    <SelectItem key={v.id} value={v.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <Truck className="h-4 w-4 text-slate-400" />
                                                            <span>{v.attributes.registration_number} - {v.attributes.make} {v.attributes.model}</span>
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
                                            onValueChange={(val) => updateField('driver_id', val)}
                                            disabled={isLoadingDrivers}
                                        >
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder={isLoadingDrivers ? "Loading..." : "Assign a driver"} />
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

                            {/* Step 2: Route */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 italic">Origin Base</label>
                                            <LocationAutocomplete
                                                value={formData.start_location.name}
                                                onSelect={(loc) => handleLocationSelect('start', loc)}
                                                placeholder="Search starting point..."
                                                icon={<Navigation className="h-4 w-4 text-blue-600" />}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 italic">Target Destination</label>
                                            <LocationAutocomplete
                                                value={formData.end_location.name}
                                                onSelect={(loc) => handleLocationSelect('end', loc)}
                                                placeholder="Search ending point..."
                                                icon={<MapPin className="h-4 w-4 text-emerald-600" />}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Planned Start Time</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input
                                                    type="datetime-local"
                                                    className="pl-10 h-12"
                                                    value={formData.planned_start_time}
                                                    onChange={(e) => updateField('planned_start_time', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Planned End Time (ETA)</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input
                                                    type="datetime-local"
                                                    className={cn("pl-10 h-12", isCalculatingEta && "opacity-50")}
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
                            )}

                            {/* Step 3: Route Optimization / Waypoints */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Route Optimization Strategy</h3>
                                            <p className="text-[11px] text-slate-500 font-medium">Auto-generate checkpoints or manually define mission stops.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGenerateRoute}
                                                disabled={isGeneratingRoute}
                                                className="h-9 text-[10px] font-black uppercase tracking-widest border-slate-200"
                                            >
                                                {isGeneratingRoute ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Route className="h-3.5 w-3.5 mr-2" />}
                                                Generate Optimal
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={addWaypoint}
                                                className="bg-slate-900 hover:bg-slate-800 h-9 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-2" /> Add Stop
                                            </Button>
                                        </div>
                                    </div>

                                    {waypoints.length === 0 ? (
                                        <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center px-6">
                                            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                                <Route className="h-6 w-6 text-slate-300" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400">Direct Route Selected</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">You can skip this step for direct trips, or add stops to optimize the mission.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {waypoints.map((wp, idx) => (
                                                <div key={wp.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <LocationAutocomplete
                                                                    value={wp.location_name}
                                                                    onSelect={(loc) => {
                                                                        updateWaypoint(wp.id, 'location_name', loc.name)
                                                                        updateWaypoint(wp.id, 'latitude', loc.coords.latitude)
                                                                        updateWaypoint(wp.id, 'longitude', loc.coords.longitude)
                                                                    }}
                                                                    placeholder="Search stop point..."
                                                                    className="border-none shadow-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeWaypoint(wp.id)}
                                                            className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                                        >
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
                                                                    onChange={(e) => updateWaypoint(wp.id, 'expected_arrival_time', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" htmlFor={`check-${wp.id}`}>
                                                                    Checkpoint
                                                                </label>
                                                                <Switch
                                                                    id={`check-${wp.id}`}
                                                                    checked={wp.is_checkpoint}
                                                                    onCheckedChange={(val) => updateWaypoint(wp.id, 'is_checkpoint', val)}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" htmlFor={`stop-${wp.id}`}>
                                                                    Stop Point
                                                                </label>
                                                                <Switch
                                                                    id={`stop-${wp.id}`}
                                                                    checked={wp.is_stop_point}
                                                                    onCheckedChange={(val) => updateWaypoint(wp.id, 'is_stop_point', val)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 4: Review */}
                            {step === 4 && (
                                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-200">
                                        <div className="pb-5 grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Asset Deployment</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                                                        <Truck className="h-4.5 w-4.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 italic leading-tight">{selectedVehicle?.attributes.registration_number}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold">{selectedVehicle?.attributes.make} {selectedVehicle?.attributes.model}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Assigned Operative</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                                                        <User className="h-4.5 w-4.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 leading-tight">{selectedDriver?.attributes.full_name}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold">ID: 52011</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="py-5">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-4">Mission Route Segmented</p>
                                            <div className="relative space-y-6 pl-4 border-l-2 border-slate-200 border-dashed">
                                                <div className="relative">
                                                    <div className="absolute -left-[21px] top-0 h-4 w-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                                                    <p className="text-xs font-black text-slate-900">{formData.start_location.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Origin Base</p>
                                                </div>

                                                {waypoints.map((wp) => (
                                                    <div key={wp.id} className="relative">
                                                        <div className={cn(
                                                            "absolute -left-[21px] top-0 h-4 w-4 rounded-full border-4 border-white shadow-sm",
                                                            wp.is_checkpoint ? "bg-amber-500" : "bg-slate-300"
                                                        )} />
                                                        <p className="text-xs font-black text-slate-900">{wp.location_name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            {wp.is_checkpoint ? 'CHECKPOINT' : 'WAYPOINT'} • {wp.expected_arrival_time} MIN ETA
                                                        </p>
                                                    </div>
                                                ))}

                                                <div className="relative">
                                                    <div className="absolute -left-[21px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                                                    <p className="text-xs font-black text-slate-900">{formData.end_location.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Final Destination</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-5 grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Scheduled Launch</p>
                                                <p className="text-sm font-black text-slate-900 italic mt-1.5">
                                                    {formData.planned_start_time ? new Date(formData.planned_start_time).toLocaleString() : 'PENDING'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated Retrieval</p>
                                                <p className="text-sm font-black text-slate-900 italic mt-1.5">
                                                    {formData.planned_end_time ? new Date(formData.planned_end_time).toLocaleString() : 'PENDING'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <Navigation className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Protocol Check Complete</h4>
                                            <p className="text-[10px] text-blue-700 mt-1 leading-relaxed font-bold">
                                                MISSION DATA IS SYNCHRONIZED. ON DISPATCH, THE ONBOARD TERMINAL WILL DOWNLOAD THESE PARAMETERS.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Additional Notes */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Additional Notes (Optional)</Label>
                                        <Textarea
                                            className="rounded-xl border-slate-200 bg-slate-50 min-h-[80px] font-medium text-sm focus:ring-slate-900"
                                            placeholder="e.g., Handle with care — fragile goods"
                                            value={formData.note}
                                            onChange={(e) => updateField('note', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-100">
                                <Button
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={step === 1 || isDispatching}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                                >
                                    ROLL BACK
                                </Button>

                                {step < 4 ? (
                                    <Button
                                        onClick={nextStep}
                                        disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                                        className="bg-slate-900 hover:bg-slate-800 px-8 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200"
                                    >
                                        PROCEED TO {wizardSteps[step].title.toUpperCase()} <ChevronRight className="h-3.5 w-3.5 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleDispatch(formData)}
                                        disabled={isDispatching}
                                        className="bg-blue-600 hover:bg-blue-700 px-10 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-100 animate-pulse-slow"
                                    >
                                        {isDispatching ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> DISPATCHING...
                                            </>
                                        ) : (
                                            <>
                                                INITIALIZE MISSION <Route className="h-3.5 w-3.5 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
