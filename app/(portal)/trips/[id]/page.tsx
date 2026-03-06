'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getTripById } from '@/lib/api/trips'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TripStatusBadge } from '@/components/trips/TripStatusBadge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, MapPin, Clock } from 'lucide-react'
import Link from 'next/link'

export default function TripDetailPage() {
    const params = useParams()
    const id = params.id as string

    const { data: response, isLoading } = useQuery({
        queryKey: ['trips', id],
        queryFn: () => getTripById(id),
    })

    if (isLoading) return <div className="p-8">Loading trip details...</div>
    if (!response?.data) return <div className="p-8 text-rose-500">Trip not found</div>

    const trip = response.data

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
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Trip {trip.attributes.trip_number}
                            </h1>
                            <TripStatusBadge status={trip.attributes.status} />
                        </div>
                        <p className="text-slate-500 font-mono text-xs mt-0.5">ID: {trip.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="border-slate-200">Edit Trip</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">Update Status</Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-slate-100 p-1 w-full justify-start overflow-x-auto h-auto no-scrollbar">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="route">Route & Map</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                    <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
                    <TabsTrigger value="pod">Proof of Delivery</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg">Route Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Origin</p>
                                        <p className="text-slate-900 font-medium">{typeof trip.attributes.start_location === 'string' ? trip.attributes.start_location : trip.attributes.start_location?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                        <MapPin className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Destination</p>
                                        <p className="text-slate-900 font-medium">{typeof trip.attributes.end_location === 'string' ? trip.attributes.end_location : trip.attributes.end_location?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg">Assignment</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</p>
                                    <p className="text-slate-900 font-medium capitalize">Vehicle ID: {trip.attributes.vehicle_id}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Driver</p>
                                    <p className="text-slate-900 font-medium capitalize">Driver ID: {trip.attributes.driver_id}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="route" className="mt-6">
                    <Card className="h-[500px] flex items-center justify-center bg-slate-100 border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 text-sm">Trip Route Visualization (Coming Soon)</p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
