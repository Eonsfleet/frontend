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

export default function NewGeofencePage() {
    const router = useRouter()
    const [mapData, setMapData] = useState<{ type: 'polygon' | 'circle', coordinates: any, radius?: number } | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        alert_type: 'both' as 'enter' | 'exit' | 'both',
        vehicle_ids: [] as string[]
    })

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles-list-simple'],
        queryFn: () => getVehicles({ per_page: 100 }),
    })

    const { mutate: handleSave, isPending } = useMutation({
        mutationFn: async (payload: Parameters<typeof createGeofence>[0]) => {
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
            alert_type: formData.alert_type,
            type: mapData.type,
            coordinates: mapData.coordinates,
            radius: mapData.radius,
            is_active: true,
        }

        handleSave(payload)
    }

    const toggleVehicle = (id: string) => {
        setFormData(prev => ({
            ...prev,
            vehicle_ids: prev.vehicle_ids.includes(id)
                ? prev.vehicle_ids.filter(v => v !== id)
                : [...prev.vehicle_ids, id]
        }))
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
                        {/* Left Column: Form Details */}
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
                                        <label className="text-sm font-medium text-slate-700">Description</label>
                                        <Textarea
                                            placeholder="Optional description"
                                            value={formData.description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Alert Rule</label>
                                        <span className="text-xs text-slate-400 block mb-1">When to trigger alert</span>
                                        <Select
                                            value={formData.alert_type}
                                            onValueChange={(val: any) => setFormData({ ...formData, alert_type: val })}
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
                                    <CardTitle className="text-base">Associated Vehicles</CardTitle>
                                    <CardDescription>Optional: Limit this geofence to specific vehicles.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 max-h-[300px] overflow-y-auto">
                                    {isLoadingVehicles ? (
                                        <p className="text-sm text-slate-500">Loading vehicles...</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {vehiclesData?.data.map(v => (
                                                <label key={v.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                        checked={formData.vehicle_ids.includes(v.id.toString())}
                                                        onChange={() => toggleVehicle(v.id.toString())}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-900">{v.attributes.registration_number}</span>
                                                        <span className="text-xs text-slate-500">{v.attributes.make} {v.attributes.model}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Map Editor */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm border-slate-200 h-full flex flex-col">
                                <CardHeader className="bg-white border-b border-slate-100 relative z-10">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>Draw Boundary</span>
                                        {mapData && <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-md font-medium uppercase tracking-wider">{mapData.type} Captured</span>}
                                    </CardTitle>
                                    <CardDescription>Use the tools on the map to draw a circular or polygonal boundary.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 min-h-[500px] relative z-0">
                                    <GeofenceMap onChange={setMapData} />
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/geofences">Cancel</Link>
                                </Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-32" disabled={isPending}>
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
