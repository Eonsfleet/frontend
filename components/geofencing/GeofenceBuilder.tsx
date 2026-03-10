'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { Save, Bell, Navigation, Info, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createGeofence, bulkAssignVehicles } from '@/lib/api/geofencing'
import { getVehicles } from '@/lib/api/vehicles'
import { toast } from 'sonner'

// Import MapEditor dynamically to avoid SSR issues with Leaflet
const GeofenceMapEditor = dynamic(() => import('./GeofenceMapEditor'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Initializing Spatial Engine...</div>
})

export function GeofenceBuilder({
    isOpen,
    onClose
}: {
    isOpen: boolean
    onClose: () => void
}) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        alert_type: 'both' as 'enter' | 'exit' | 'both',
        speed: 0,
        shape: null as { type: 'polygon' | 'circle'; coordinates: any; radius?: number } | null,
        vehicle_ids: [] as string[],
    })

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles-builder', { per_page: 100 }],
        queryFn: () => getVehicles({ per_page: 100 }),
        enabled: isOpen,
    })

    const { mutate: save, isPending } = useMutation({
        mutationFn: async () => {
            if (!formData.shape) throw new Error('Please draw a boundary on the map.')
            if (!formData.name.trim()) throw new Error('Geofence name is required.')

            const payload: any = {
                name: formData.name.trim(),
                alert_type: formData.alert_type,
                speed: formData.speed,
                type: formData.shape.type,
                coordinates: formData.shape.coordinates,
                is_active: true,
            }
            if (formData.shape.type === 'circle' && formData.shape.radius != null) {
                payload.radius = formData.shape.radius
            }

            const created = await createGeofence(payload)
            const geofenceId = created.data.id

            if (formData.vehicle_ids.length > 0) {
                await bulkAssignVehicles(geofenceId, formData.vehicle_ids)
            }

            return created
        },
        onSuccess: () => {
            toast.success('Geofence activated successfully!')
            queryClient.invalidateQueries({ queryKey: ['geofences'] })
            setFormData({ name: '', alert_type: 'both', speed: 0, shape: null, vehicle_ids: [] as string[] })
            onClose()
        },
        onError: (err: any) => {
            toast.error(err.message || err.response?.data?.message || 'Failed to create geofence.')
        },
    })

    const toggleVehicle = (id: string) => {
        setFormData(prev => ({
            ...prev,
            vehicle_ids: prev.vehicle_ids.includes(id)
                ? prev.vehicle_ids.filter(v => v !== id)
                : [...prev.vehicle_ids, id],
        }))
    }

    if (!isOpen) return null

    const alertTypeToDisplay = {
        both: 'Entry & Exit',
        enter: 'Entry Only',
        exit: 'Exit Only',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">

                {/* Left Side: Form & Settings */}
                <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
                    <div className="p-8 border-b border-slate-100">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                            Zone <span className="text-blue-600">Builder</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Spatial Configuration Utility
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* Identity Section */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Info className="h-3 w-3" />
                                Zone Identity
                            </label>
                            <input
                                type="text"
                                placeholder="E.G. MAIN WAREHOUSE"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* Speed Limit */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                Speed Limit (km/h)
                            </label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0 = No limit"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                value={formData.speed}
                                onChange={(e) => setFormData({ ...formData, speed: Number(e.target.value) })}
                            />
                        </div>

                        {/* Alert Logic */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Bell className="h-3 w-3" />
                                Alert Logic
                            </label>
                            <div className="space-y-2">
                                {(['both', 'enter', 'exit'] as const).map((type) => (
                                    <label key={type} className={cn(
                                        "flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors",
                                        formData.alert_type === type
                                            ? "bg-blue-600 border-blue-600"
                                            : "bg-white border-slate-100 hover:border-blue-200"
                                    )}>
                                        <span className={cn(
                                            "text-[11px] font-bold uppercase tracking-widest",
                                            formData.alert_type === type ? "text-white" : "text-slate-600"
                                        )}>
                                            {alertTypeToDisplay[type]}
                                        </span>
                                        <input
                                            type="radio"
                                            name="alert_type"
                                            checked={formData.alert_type === type}
                                            onChange={() => setFormData({ ...formData, alert_type: type })}
                                            className="sr-only"
                                        />
                                        <div className={cn(
                                            "h-4 w-4 rounded-full border-2 transition-all",
                                            formData.alert_type === type ? "bg-white border-white" : "border-slate-300"
                                        )} />
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Vehicle Assignment */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Navigation className="h-3 w-3" />
                                Assign Vehicles
                                <span className="ml-auto text-blue-600">{formData.vehicle_ids.length} selected</span>
                            </label>
                            <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1">
                                {isLoadingVehicles ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                                    </div>
                                ) : (vehiclesData?.data || []).map((v) => (
                                    <label key={v.id} className={cn(
                                        "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors text-[10px] font-bold uppercase tracking-widest",
                                        formData.vehicle_ids.includes(v.id.toString())
                                            ? "bg-blue-50 border-blue-200 text-blue-700"
                                            : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                                    )}>
                                        <input
                                            type="checkbox"
                                            checked={formData.vehicle_ids.includes(v.id.toString())}
                                            onChange={() => toggleVehicle(v.id.toString())}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        {v.attributes.registration_number}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Spatial Data Summary */}
                        <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-600/10 space-y-2">
                            <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Spatial Summary</label>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                <span>TYPE:</span>
                                <span className="text-blue-600 uppercase">{formData.shape?.type || 'UNSET'}</span>
                            </div>
                            {formData.shape?.radius && (
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                    <span>RADIUS:</span>
                                    <span className="text-blue-600">{(formData.shape.radius / 1000).toFixed(2)} KM</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8 space-y-3">
                        <button
                            onClick={() => save()}
                            disabled={isPending}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-60 disabled:shadow-none"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isPending ? 'ACTIVATING...' : 'ACTIVATE ZONE'}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isPending}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-60"
                        >
                            DISCARD
                        </button>
                    </div>
                </div>

                {/* Right Side: Interactive Map */}
                <div className="flex-1 relative bg-slate-100">
                    <div className="absolute top-8 left-8 z-10">
                        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                            <Navigation className="h-3 w-3 text-blue-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">MAP DRAWING ACTIVE</span>
                        </div>
                    </div>

                    <div className="h-full w-full">
                        <GeofenceMapEditor
                            height="100%"
                            onChange={(shape) => setFormData((prev) => ({ ...prev, shape }))}
                        />
                    </div>

                    {/* Instructions Overlay */}
                    {!formData.shape && (
                        <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none">
                            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-2xl max-w-sm ml-auto">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight italic">Drawing Instructions</h4>
                                <ul className="mt-3 space-y-2">
                                    <li className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] shrink-0">1</div>
                                        SELECT CIRCLE OR POLYGON TOOL
                                    </li>
                                    <li className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] shrink-0">2</div>
                                        DRAW YOUR BOUNDARY ON THE MAP
                                    </li>
                                    <li className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] shrink-0">3</div>
                                        SAVE TO ACTIVATE MONITORING
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
