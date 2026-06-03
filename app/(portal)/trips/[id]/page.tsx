'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, MapPin, Calendar, Clock, Truck, User } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export default function TripDetailPage() {
    const params = useParams()
    const router = useRouter()
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

    // Status badge config
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' }
            case 'ongoing':
                return { label: 'Ongoing', className: 'bg-blue-50 text-blue-700 border-blue-200' }
            case 'completed':
                return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
            case 'cancelled':
                return { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' }
            default:
                return { label: status, className: 'bg-slate-50 text-slate-700 border-slate-200' }
        }
    }

    const statusConfig = getStatusConfig(trip.attributes.status)

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
            name: cp.attributes?.location_name || cp.name || cp.location || 'Checkpoint',
            timestamp: cp.attributes?.checkpoint_passed_at || cp.reached_at || cp.timestamp,
            completed: !!(cp.attributes?.checkpoint_passed_at || cp.reached_at) || cp.checkpoint_status === 'completed',
        })),
        {
            name: typeof trip.attributes.end_location === 'string'
                ? trip.attributes.end_location
                : trip.attributes.end_location?.name || 'Destination',
            timestamp: trip.attributes.completed_at,
            completed: !!trip.attributes.completed_at,
        },
    ]

    // Extract waypoints from checkpoints for map
    const waypoints = (checkpointsData?.data || []).map((cp: any) => ({
        latitude: cp.attributes?.coordinates?.latitude || 0,
        longitude: cp.attributes?.coordinates?.longitude || 0,
        name: cp.attributes?.location_name || 'Checkpoint',
    })).filter((wp: any) => wp.latitude !== 0 && wp.longitude !== 0)

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
            {/* Back Button */}
            <Link
                href="/trips"
                className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to Trips
            </Link>

            {/* Trip Details Header */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Trip #{trip.id}
                            </h1>
                            <Badge className={`${statusConfig.className} border px-3 py-1`}>
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-slate-500">
                            {typeof trip.attributes.start_location === 'string' 
                                ? trip.attributes.start_location 
                                : trip.attributes.start_location?.name || 'Start'} 
                            {' → '}
                            {typeof trip.attributes.end_location === 'string'
                                ? trip.attributes.end_location
                                : trip.attributes.end_location?.name || 'Destination'}
                        </p>
                    </div>
                </div>

                {/* Trip Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Vehicle */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Truck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</p>
                            <p className="text-sm font-bold text-slate-900 truncate mt-1">
                                {trip.relationships?.vehicle?.registration_number || trip.relationships?.vehicle?.attributes?.registration_number || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {trip.relationships?.vehicle?.make || trip.relationships?.vehicle?.attributes?.make} {trip.relationships?.vehicle?.model || trip.relationships?.vehicle?.attributes?.model}
                            </p>
                        </div>
                    </div>

                    {/* Driver */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</p>
                            <p className="text-sm font-bold text-slate-900 truncate mt-1">
                                {trip.relationships?.driver?.name || trip.relationships?.driver?.attributes?.full_name || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {trip.relationships?.driver?.attributes?.phone_number || 'No phone'}
                            </p>
                        </div>
                    </div>

                    {/* Start Time */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Time</p>
                            <p className="text-sm font-bold text-slate-900 truncate mt-1">
                                {trip.attributes.planned_start_time 
                                    ? format(new Date(trip.attributes.planned_start_time), 'MMM dd, yyyy')
                                    : 'Not set'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {trip.attributes.planned_start_time 
                                    ? format(new Date(trip.attributes.planned_start_time), 'h:mm a')
                                    : ''}
                            </p>
                        </div>
                    </div>

                    {/* ETA */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ETA</p>
                            <p className="text-sm font-bold text-slate-900 truncate mt-1">
                                {trip.attributes.planned_end_time 
                                    ? format(new Date(trip.attributes.planned_end_time), 'MMM dd, yyyy')
                                    : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {trip.attributes.planned_end_time 
                                    ? format(new Date(trip.attributes.planned_end_time), 'h:mm a')
                                    : ''}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

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
                                waypoints={waypoints}
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="driver" className="w-full">
                        <TabsList className="bg-white border border-slate-200 p-1 w-full justify-start">
                            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                            <TabsTrigger value="driver">Driver Info</TabsTrigger>
                            <TabsTrigger value="tracking">Tracking details</TabsTrigger>
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
                                avgSpeed={trip.attributes?.avg_speed || 58}
                                distanceCovered={trip.attributes?.distance_covered_km || 370}
                                distanceRemaining={trip.attributes?.distance_remaining_km || 370}
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
