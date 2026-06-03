'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getTripById, getTripCheckpoints } from '@/lib/api/trips'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TripMapOverview } from '@/components/trips/TripMapOverview'
import { VehicleCapacityCard } from '@/components/trips/VehicleCapacityCard'
import { TripProgressTimeline } from '@/components/trips/TripProgressTimeline'
import { TripStatsCards } from '@/components/trips/TripStatsCards'
import { TripChatPanel } from '@/components/trips/TripChatPanel'
import { CargoPhotoReports } from '@/components/trips/CargoPhotoReports'
import { TripDriverInfo } from '@/components/trips/TripDriverInfo'
import { TripVehicleInfo } from '@/components/trips/TripVehicleInfo'
import { Loader2 } from 'lucide-react'

export default function TripDetailPage() {
    const params = useParams()
    const id = params.id as string

    const { data: response, isLoading } = useQuery({
        queryKey: ['trips', id],
        queryFn: () => getTripById(id),
    })

    const { data: checkpointsData } = useQuery({
        queryKey: ['trip-checkpoints', id],
        queryFn: () => getTripCheckpoints(id),
        enabled: !!id,
    })

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!response?.data) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <p className="text-slate-500">Trip not found</p>
            </div>
        )
    }

    const trip = response.data

    // Parse locations
    const startLocation = typeof trip.attributes.start_location === 'object' && trip.attributes.start_location?.coords
        ? {
            latitude: trip.attributes.start_location.coords.latitude,
            longitude: trip.attributes.start_location.coords.longitude,
            name: trip.attributes.start_location.name,
        }
        : undefined

    const endLocation = typeof trip.attributes.end_location === 'object' && trip.attributes.end_location?.coords
        ? {
            latitude: trip.attributes.end_location.coords.latitude,
            longitude: trip.attributes.end_location.coords.longitude,
            name: trip.attributes.end_location.name,
        }
        : undefined

    // Build checkpoints for timeline
    const timelineCheckpoints = [
        {
            name: typeof trip.attributes.start_location === 'string' 
                ? trip.attributes.start_location 
                : trip.attributes.start_location?.name || 'Start',
            timestamp: trip.attributes.started_at,
            completed: !!trip.attributes.started_at,
        },
        ...(checkpointsData?.data || []).map((cp: any) => ({
            name: cp.name || cp.location || 'Checkpoint',
            timestamp: cp.reached_at || cp.timestamp,
            completed: !!cp.reached_at || cp.status === 'completed',
        })),
        {
            name: typeof trip.attributes.end_location === 'string'
                ? trip.attributes.end_location
                : trip.attributes.end_location?.name || 'Destination',
            timestamp: trip.attributes.completed_at,
            completed: !!trip.attributes.completed_at,
        },
    ]

    // Mock data for demonstration (replace with real data from API)
    const mockMessages = [
        {
            id: 1,
            sender: 'driver' as const,
            text: 'Hi Olamide',
            timestamp: new Date().toISOString(),
            read: true,
        },
        {
            id: 2,
            sender: 'driver' as const,
            text: 'Hi Olamide',
            timestamp: new Date().toISOString(),
            read: true,
        },
        {
            id: 3,
            sender: 'user' as const,
            text: 'Hello Jumoke',
            timestamp: new Date().toISOString(),
            read: true,
        },
        {
            id: 4,
            sender: 'user' as const,
            text: 'Its nice matching up with, by the way you are very beautiful',
            timestamp: new Date().toISOString(),
            read: true,
        },
    ]

    const mockPhotos = [
        { id: 1, checkpoint: 'Point 1', location: '232, Agege, Iju-Ishaga Lagos' },
        { id: 2, checkpoint: 'Point 1', location: '232, Agege, Iju-Ishaga Lagos' },
        { id: 3, checkpoint: 'Point 1', location: '232, Agege, Iju-Ishaga Lagos' },
    ]

    return (
        <div className="p-6 lg:p-8 space-y-6 bg-slate-50 min-h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - 2/3 width */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Map Overview */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-slate-600 mb-4">Map Overview</h3>
                        <div className="h-[300px] rounded-lg overflow-hidden">
                            <TripMapOverview
                                startLocation={startLocation}
                                endLocation={endLocation}
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="driver" className="w-full">
                        <TabsList className="bg-white border border-slate-200 p-1 w-full justify-start">
                            <TabsTrigger value="driver">Driver Info</TabsTrigger>
                            <TabsTrigger value="tracking">Tracking details</TabsTrigger>
                            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                        </TabsList>

                        <TabsContent value="driver" className="mt-6">
                            <TripDriverInfo driver={trip.relationships?.driver} />
                        </TabsContent>

                        <TabsContent value="tracking" className="mt-6 space-y-6">
                            {/* Progress Timeline */}
                            <TripProgressTimeline checkpoints={timelineCheckpoints} />

                            {/* Stats Cards */}
                            <TripStatsCards
                                currentLocation={timelineCheckpoints.find(c => c.completed)?.name || 'Unknown'}
                                avgSpeed={trip.attributes.avg_speed || 58}
                                distanceCovered={trip.attributes.distance_covered_km || 370}
                                distanceRemaining={trip.attributes.distance_remaining_km || 370}
                            />

                            {/* Cargo Photo Reports */}
                            <CargoPhotoReports
                                photos={mockPhotos}
                                onRequestPhoto={() => console.log('Request photo')}
                            />
                        </TabsContent>

                        <TabsContent value="vehicle" className="mt-6">
                            <TripVehicleInfo vehicle={trip.relationships?.vehicle} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column - 1/3 width */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Vehicle Capacity */}
                    <VehicleCapacityCard
                        currentLoad={trip.attributes.current_load || 15000}
                        maxLoad={trip.attributes.max_load || 20000}
                        loadCategory={trip.attributes.load_category || 'Electronics'}
                    />

                    {/* Chat Panel */}
                    <TripChatPanel
                        driverName="Olamide"
                        messages={mockMessages}
                        onSendMessage={(msg) => console.log('Send:', msg)}
                    />
                </div>
            </div>
        </div>
    )
}
