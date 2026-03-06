'use client'

import React, { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2, MapPin, Search } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getGeofenceById, getGeofenceVehicles } from '@/lib/api/geofencing'

export default function GeofenceDetailPage() {
    const params = useParams()
    const id = params.id as string

    const { data, isLoading } = useQuery({
        queryKey: ['geofence', id],
        queryFn: () => getGeofenceById(id),
    })

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['geofence-vehicles', id],
        queryFn: () => getGeofenceVehicles(id),
    })

    const geofence = data?.data

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!geofence) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <p className="text-slate-500">Geofence not found.</p>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-full">
            <Link
                href="/geofences"
                className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Geofences
            </Link>

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        {geofence.attributes.name}
                        <Badge variant={geofence.attributes.is_active ? 'default' : 'secondary'} className={geofence.attributes.is_active ? 'bg-green-100 text-green-800' : ''}>
                            {geofence.attributes.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{geofence.attributes.type}</Badge>
                    </h1>
                    {geofence.attributes.description && (
                        <p className="text-slate-500 mt-1">{geofence.attributes.description}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-white border-b border-slate-100">
                            <CardTitle className="text-base">Boundary Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Alert Rule</p>
                                    <p className="font-medium text-slate-900 capitalize px-2 py-1 bg-slate-100 rounded-md inline-block">
                                        Trigger {geofence.attributes.alert_type === 'both' ? 'On Entry & Exit' : `On ${geofence.attributes.alert_type} Only`}
                                    </p>
                                </div>
                                {geofence.attributes.type === 'circle' && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Radius (Meters)</p>
                                        <p className="font-medium text-slate-900">{geofence.attributes.radius}</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Map Preview</p>
                                <div className="h-[300px] w-full bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center overflow-hidden relative">
                                    <div className="absolute inset-0 bg-[url('https://maps.wikimedia.org/osm-intl/12/697/1594.png')] opacity-50 mix-blend-multiply bg-center bg-cover pointer-events-none filter grayscale" />
                                    <Badge variant="outline" className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm z-10 shadow-sm border-slate-200 text-blue-700">
                                        <MapPin className="h-3 w-3 mr-1" /> Boundary Rendered
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-sm border-slate-200 relative overflow-hidden h-full flex flex-col">
                        <CardHeader className="bg-white border-b border-slate-100 shrink-0">
                            <CardTitle className="text-base flex items-center justify-between">
                                Associated Vehicles
                                <Badge variant="secondary">{vehiclesData?.data?.length || 0}</Badge>
                            </CardTitle>
                            <CardDescription>Vehicles monitored by this geofence.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-y-auto">
                            {isLoadingVehicles ? (
                                <div className="p-6 flex justify-center text-slate-500">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            ) : vehiclesData?.data?.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                                    <Search className="h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-sm font-medium text-slate-700">No Vehicles Linked</p>
                                    <p className="text-xs mt-1">This geofence applies globally, monitoring all active fleet vehicles.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {vehiclesData?.data?.map(v => (
                                        <div key={v.id} className="p-4 hover:bg-slate-50 flex items-center justify-between group">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-900">{v.attributes.registration_number}</span>
                                                <span className="text-xs text-slate-500">{v.attributes.make} {v.attributes.model}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 group-hover:bg-white transition-colors">
                                                {v.attributes.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
