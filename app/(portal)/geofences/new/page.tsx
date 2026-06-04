'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createGeofence } from '@/lib/api/geofencing'
import { getVehicles } from '@/lib/api/vehicles'
import { toast } from 'sonner'
import { GeofenceMap } from '@/components/geofencing/GeofenceMap'

import { MultiVehicleSelector } from '@/components/shared/MultiVehicleSelector'
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete'
import { Navigation } from 'lucide-react'

export default function NewGeofencePage() {
    const router = useRouter()
    const [mapData, setMapData] = useState<{ type: 'polygon' | 'circle', coordinates: any, radius?: number } | null>(null)
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        trigger_type: 'both' as 'enter' | 'exit' | 'both',
        location_name: '',
        vehicle_ids: [] as string[]
    })

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles-list-simple'],
        queryFn: () => getVehicles({ per_page: 100 }),
    })

    const { mutate: handleSave, isPending } = useMutation({
        mutationFn: async (payload: any) => {
            const created = await createGeofence(payload)
            if (formData.vehicle_ids.length > 0) {
                const { bulkAssignVehicles } = await import('@/lib/api/geofencing')
                await bulkAssignVehicles(created.data.id, formData.vehicle_ids)
            }
            return created
        },
        onSuccess: () => {
            toast.success('Geofence created successfully!')
            router.push('/geofences')
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create geofence.')
        }
    })

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!mapData) {
            toast.error('Please draw a circle or polygon on the map.')
            return
        }
        if (!formData.name) {
            toast.error('Geofence name is required.')
            return
        }

        const payload = {
            name: formData.name,
            description: formData.description,
            trigger_type: formData.trigger_type,
            type: mapData.type,
            coordinates: mapData.coordinates,
            location: formData.location_name || 'Mapped Location',
            radius: mapData.radius,
            status: true,
        }

        handleSave(payload)
    }

    return (
        <UpgradeGate
            module="geofence"
            featureName="Geofencing"
            description="Create virtual boundaries and receive alerts when vehicles enter or exit defined zones."
            requiredPlan="growth"
        >
            <div className="p-8 space-y-6 bg-slate-50 min-h-full">
                <Link
                    href="/geofences"
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back to Geofences
                </Link>

                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Geofence</h1>
                    <p className="text-slate-500 mt-0.5">Define a virtual boundary and configure alerting rules.</p>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="bg-white border-b border-slate-100">
                                    <CardTitle className="text-base">Geofence Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Name</label>
                                        <Input
                                            placeholder="e.g. Central Warehouse"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 italic">Location Label</label>
                                        <LocationAutocomplete
                                            value={formData.location_name}
                                            onSelect={(loc) => {
                                                setFormData({ ...formData, location_name: loc.name })
                                                setMapCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude })
                                            }}
                                            placeholder="Search location address..."
                                            icon={<Navigation className="h-4 w-4 text-blue-600" />}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Description</label>
                                        <Textarea
                                            placeholder="Optional description"
                                            value={formData.description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Alert Rule</label>
                                        <Select
                                            value={formData.trigger_type}
                                            onValueChange={(val: any) => setFormData({ ...formData, trigger_type: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="When to trigger alert" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="both">On Entry & Exit</SelectItem>
                                                <SelectItem value="enter">On Entry Only</SelectItem>
                                                <SelectItem value="exit">On Exit Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="bg-white border-b border-slate-100">
                                    <CardTitle className="text-base">Target Vehicles</CardTitle>
                                    <CardDescription>Select assets to be monitored by this boundary.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <MultiVehicleSelector
                                        vehicles={vehiclesData?.data || []}
                                        selectedIds={formData.vehicle_ids}
                                        onChange={(ids) => setFormData({ ...formData, vehicle_ids: ids })}
                                        placeholder="Search and select vehicles..."
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm border-slate-200 min-h-[500px] flex flex-col">
                                <CardHeader className="bg-white border-b border-slate-100 relative z-10">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>Draw Boundary</span>
                                        {mapData && <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-md font-medium uppercase tracking-wider">{mapData.type} Captured</span>}
                                    </CardTitle>
                                    <CardDescription>Use the tools on the map to draw a circular or polygonal boundary.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 relative z-0">
                                    <GeofenceMap
                                        onChange={setMapData}
                                        center={mapCenter}
                                        vehicles={vehiclesData?.data?.filter(v => formData.vehicle_ids.includes(v.id.toString())) || []}
                                    />
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/geofences">Cancel</Link>
                                </Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-32 shadow-lg shadow-blue-100" disabled={isPending}>
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Geofence</>}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </UpgradeGate>
    )
}
