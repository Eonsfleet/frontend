'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, Route, Truck, User, Calendar, MapPin, CheckCircle2, Loader2, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getVehicles } from '@/lib/api/vehicles'
import { getDrivers } from '@/lib/api/drivers'
import { createTrip } from '@/lib/api/trips'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function NewTripPage() {
    const router = useRouter()
    const [step, setStep] = React.useState(1)
    const [formData, setFormData] = React.useState({
        vehicle_id: '',
        driver_id: '',
        start_location: '',
        end_location: '',
        planned_start_time: '',
        planned_end_time: '',
    })

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles-list-simple'],
        queryFn: () => getVehicles({ per_page: 100, status: 'active' }),
    })

    const { data: driversData, isLoading: isLoadingDrivers } = useQuery({
        queryKey: ['drivers-list-simple'],
        queryFn: () => getDrivers({ per_page: 100 }),
    })

    const { mutate: handleDispatch, isPending: isDispatching } = useMutation({
        mutationFn: createTrip,
        onSuccess: (response) => {
            toast.success('Trip created and dispatched successfully!')
            router.push(`/trips/${response.data.id}`)
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to dispatch trip')
        }
    })

    const nextStep = () => setStep(s => s + 1)
    const prevStep = () => setStep(s => s - 1)

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const isStep1Valid = formData.vehicle_id && formData.driver_id
    const isStep2Valid = formData.start_location && formData.end_location && formData.planned_start_time

    const selectedVehicle = vehiclesData?.data.find(v => v.id.toString() === formData.vehicle_id)
    const selectedDriver = driversData?.data.find(d => d.id.toString() === formData.driver_id)

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
                    {[
                        { id: 1, title: 'Asset Assignment', desc: 'Select vehicle and driver', icon: Truck },
                        { id: 2, title: 'Route & Schedule', desc: 'Locations and timing', icon: MapPin },
                        { id: 3, title: 'Review & Dispatch', desc: 'Final check and launch', icon: CheckCircle2 },
                    ].map((s) => (
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
                                {step === 3 && 'Review Trip Details'}
                            </CardTitle>
                            <CardDescription>Step {step} of 3</CardDescription>
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
                                    {!selectedVehicle && !isLoadingVehicles && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
                                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                            <p>Select both a vehicle and a driver to proceed to location settings.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Route */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Origin</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input
                                                    className="pl-10 h-12"
                                                    placeholder="Starting point..."
                                                    value={formData.start_location}
                                                    onChange={(e) => updateField('start_location', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Destination</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input
                                                    className="pl-10 h-12"
                                                    placeholder="Ending point..."
                                                    value={formData.end_location}
                                                    onChange={(e) => updateField('end_location', e.target.value)}
                                                />
                                            </div>
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
                                                    className="pl-10 h-12"
                                                    value={formData.planned_end_time}
                                                    onChange={(e) => updateField('planned_end_time', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Review */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
                                        <div className="pb-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Asset</p>
                                                <p className="text-sm font-semibold text-slate-900 mt-1">{selectedVehicle?.attributes.registration_number}</p>
                                                <p className="text-xs text-slate-500">{selectedVehicle?.attributes.make} {selectedVehicle?.attributes.model}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Driver</p>
                                                <p className="text-sm font-semibold text-slate-900 mt-1">{selectedDriver?.attributes.full_name}</p>
                                                <p className="text-xs text-slate-500">{selectedDriver?.attributes.email}</p>
                                            </div>
                                        </div>
                                        <div className="py-4">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Route</p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                                                    <div className="w-px h-6 bg-slate-200" />
                                                    <div className="h-2 w-2 rounded-full border border-blue-600" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <p className="text-sm font-medium text-slate-700">{formData.start_location}</p>
                                                    <p className="text-sm font-medium text-slate-700 mt-2">{formData.end_location}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Departure</p>
                                                <p className="text-sm font-semibold text-slate-900 mt-1">
                                                    {formData.planned_start_time ? new Date(formData.planned_start_time).toLocaleString() : 'Not set'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Arrival (Est)</p>
                                                <p className="text-sm font-semibold text-slate-900 mt-1">
                                                    {formData.planned_end_time ? new Date(formData.planned_end_time).toLocaleString() : 'Not set'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4">
                                        <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-900">Ready to Dispatch</h4>
                                            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                                                Once confirmed, this trip will be scheduled and the driver will be notified via their terminal.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-100">
                                <Button
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={step === 1 || isDispatching}
                                    className="text-slate-500"
                                >
                                    Back
                                </Button>

                                {step < 3 ? (
                                    <Button
                                        onClick={nextStep}
                                        disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                                        className="bg-blue-600 hover:bg-blue-700 px-6 gap-2"
                                    >
                                        Next Step <ChevronRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleDispatch(formData)}
                                        disabled={isDispatching}
                                        className="bg-blue-600 hover:bg-blue-700 px-8 gap-2"
                                    >
                                        {isDispatching ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" /> Dispatching...
                                            </>
                                        ) : (
                                            <>
                                                Confirm & Dispatch <Route className="h-4 w-4" />
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
