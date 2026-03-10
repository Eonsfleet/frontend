'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { getGeofenceById, updateGeofence, getGeofenceVehicles, bulkAssignVehicles } from '@/lib/api/geofencing'
import { getVehicles } from '@/lib/api/vehicles'
import { toast } from 'sonner'

interface GeofenceMapProps {
    onChange: (data: { type: 'polygon' | 'circle'; coordinates: any; radius?: number }) => void
    initialGeofence?: import('@/types').Geofence
}

const GeofenceMap = dynamic<GeofenceMapProps>(
    () => import('@/components/geofencing/GeofenceMap').then(m => m.GeofenceMap),
    {
        ssr: false,
        loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-md" />,
    }
)

export default function EditGeofencePage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const id = params.id as string

    const [mapData, setMapData] = useState<{ type: 'polygon' | 'circle'; coordinates: any; radius?: number } | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        alert_type: 'both' as 'enter' | 'exit' | 'both',
        speed: 0,
        is_active: true,
        vehicle_ids: [] as string[],
    })

    const { data: geofenceData, isLoading } = useQuery({
        queryKey: ['geofence', id],
        queryFn: () => getGeofenceById(id),
    })

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles-list-simple'],
        queryFn: () => getVehicles({ per_page: 100 }),
    })

    const { data: assignedVehiclesData } = useQuery({
        queryKey: ['geofence-vehicles', id],
        queryFn: () => getGeofenceVehicles(id),
    })

    // Seed form when data loads
    useEffect(() => {
        const g = geofenceData?.data
        if (!g) return
        setFormData({
            name: g.attributes.name,
            description: g.attributes.description ?? '',
            alert_type: g.attributes.alert_type,
            speed: g.attributes.speed ?? 0,
            is_active: g.attributes.is_active,
            vehicle_ids: [],
        })
    }, [geofenceData])

    // Seed selected vehicles from existing assignments
    useEffect(() => {
        if (!assignedVehiclesData?.data) return
        setFormData(prev => ({
            ...prev,
            vehicle_ids: assignedVehiclesData.data.map((v: any) => v.id.toString()),
        }))
    }, [assignedVehiclesData])

    const { mutate: handleUpdate, isPending } = useMutation({
        mutationFn: async () => {
            const payload: any = {
                name: formData.name,
                description: formData.description,
                alert_type: formData.alert_type,
                speed: formData.speed,
                is_active: formData.is_active,
            }
            if (mapData) {
                payload.type = mapData.type
                payload.coordinates = mapData.coordinates
                if (mapData.type === 'circle' && mapData.radius != null) {
                    payload.radius = mapData.radius
                }
            }
            await updateGeofence(id, payload)
            await bulkAssignVehicles(id, formData.vehicle_ids, false)
        },
        onSuccess: () => {
            toast.success('Geofence updated successfully!')
            queryClient.invalidateQueries({ queryKey: ['geofences'] })
            queryClient.invalidateQueries({ queryKey: ['geofence', id] })
            queryClient.invalidateQueries({ queryKey: ['geofence-vehicles', id] })
            router.push(`/geofences/${id}`)
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update geofence.')
        },
    })

    const toggleVehicle = (vid: string) => {
        setFormData(prev => ({
            ...prev,
            vehicle_ids: prev.vehicle_ids.includes(vid)
                ? prev.vehicle_ids.filter(v => v !== vid)
                : [...prev.vehicle_ids, vid],
        }))
    }

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error('Geofence name is required.')
            return
        }
        handleUpdate()
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!geofenceData?.data) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <p className="text-slate-500">Geofence not found.</p>
            </div>
        )
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
                    href={`/geofences/${id}`}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back to Geofence
                </Link>

                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Geofence</h1>
                    <p className="text-slate-500 mt-0.5">Update the boundary and alerting rules for this zone.</p>
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
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                                setFormData({ ...formData, description: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Alert Rule</label>
                                        <Select
                                            value={formData.alert_type}
                                            onValueChange={(val: any) => setFormData({ ...formData, alert_type: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="both">On Entry & Exit</SelectItem>
                                                <SelectItem value="enter">On Entry Only</SelectItem>
                                                <SelectItem value="exit">On Exit Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Speed Limit (km/h)</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder="0 = No limit"
                                            value={formData.speed}
                                            onChange={e => setFormData({ ...formData, speed: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Status</label>
                                        <Select
                                            value={formData.is_active ? 'active' : 'inactive'}
                                            onValueChange={(val) => setFormData({ ...formData, is_active: val === 'active' })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="bg-white border-b border-slate-100">
                                    <CardTitle className="text-base">Associated Vehicles</CardTitle>
                                    <CardDescription>Limit this geofence to specific vehicles.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 max-h-[300px] overflow-y-auto">
                                    {isLoadingVehicles ? (
                                        <p className="text-sm text-slate-500">Loading vehicles...</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {vehiclesData?.data.map(v => (
                                                <label
                                                    key={v.id}
                                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100"
                                                >
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
                                        <span>Boundary</span>
                                        {mapData ? (
                                            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-md font-medium uppercase tracking-wider">
                                                New {mapData.type} drawn — will replace existing
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium uppercase tracking-wider">
                                                Current: {geofenceData.data.attributes.type}
                                            </span>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        Redraw the boundary to update. Leave unchanged to keep the existing boundary.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 min-h-[500px] relative z-0">
                                    <GeofenceMap
                                        onChange={setMapData}
                                        initialGeofence={geofenceData.data}
                                    />
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <Button type="button" variant="outline" asChild>
                                    <Link href={`/geofences/${id}`}>Cancel</Link>
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 w-36"
                                    disabled={isPending}
                                >
                                    {isPending
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                                    }
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </UpgradeGate>
    )
}
