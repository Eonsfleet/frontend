'use client'

import { TelemetryDrawer } from '@/components/live/TelemetryDrawer'
import { TripPlaybackTimeline } from '@/components/live/TripPlaybackTimeline'
import {
    Loader2,
    Navigation,
    Truck,
    RefreshCw,
    Layers,
    Search,
    Filter,
    Clock,
    Activity,
    ChevronRight,
    PlayCircle
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import * as api from '@/lib/api/vehicles'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic'
import { normalizeGpsPacket } from '@/lib/gps'

const LiveMapComponent = dynamic(
    () => import('@/components/live/LiveMapComponent'),
    { ssr: false }
)

const MOCK_TRIPS = [
    { id: 't1', plate: 'LND-123-XY', destination: 'Lagos Terminal', eta: '14:20 PM', status: 'on-time' },
    { id: 't2', plate: 'ABJ-456-ZZ', destination: 'Abuja Depot', eta: '16:45 PM', status: 'delayed' },
    { id: 't3', plate: 'PH-789-BC', destination: 'Port Harcourt', eta: '11:15 AM', status: 'on-time' },
]

export default function LiveTrackingPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
    const [isTelemetryOpen, setIsTelemetryOpen] = useState(false)
    const [isReplayOpen, setIsReplayOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'all' | 'focused'>('all')

    const { token } = useAuthStore()

    // 1. Fetch all vehicles
    const { data: vehicleData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles', { per_page: 100 }],
        queryFn: () => api.getVehicles({ per_page: 100 }),
        enabled: !!token,
    })

    const vehicles = vehicleData?.data || []

    // 2. Fetch real-time locations for all vehicles
    const locationQueries = useQueries({
        queries: vehicles.map((v) => ({
            queryKey: ['vehicle-location', v.id],
            queryFn: () => api.getCurrentLocation(v.id),
            enabled: !!token && vehicles.length > 0,
            refetchInterval: 10000, // Refresh every 10s for live feel
        })),
    })
    // 3. Normalize and combine data
    const trackedVehicles = useMemo(() => {
        return vehicles.map((v, index) => {
            const locData = locationQueries[index]?.data
            const normalized = locData ? normalizeGpsPacket(locData) : null

            return {
                id: v.id,
                registration_number: v.attributes.registration_number,
                latitude: normalized?.latitude || 0,
                longitude: normalized?.longitude || 0,
                speed: normalized?.speed || 0,
                heading: normalized?.course || 0,
                status: normalized?.status || 'offline',
                fuel: normalized?.fuel_level_percent || 0,
                odometer: normalized?.odometer || 0,
                ignition: normalized?.ignition || false,
                address: normalized?.address || 'Locating...'
            }
        })
    }, [vehicles, locationQueries])

    // Derived selected vehicle object
    const selectedVehicle = useMemo(() =>
        trackedVehicles.find(v => v.id === selectedVehicleId) || null
        , [trackedVehicles, selectedVehicleId])

    const filteredVehicles = useMemo(() => {
        if (!searchQuery) return trackedVehicles
        return trackedVehicles.filter(v =>
            v.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [trackedVehicles, searchQuery])

    return (
        <div className="h-[calc(100vh-64px)] -m-6 md:-m-8 flex overflow-hidden bg-slate-100 relative">
            {/* Left Sidebar: Active Operations */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        Live <span className="text-blue-600">Operations</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Monitoring {vehicles.length} Active Assets
                    </p>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {/* Search & Filter */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="SEARCH FLEET..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Active Trips Section */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            Active Trips
                            <span className="text-blue-600">VIEW ALL</span>
                        </label>
                        {MOCK_TRIPS.map((trip) => (
                            <div
                                key={trip.id}
                                onClick={() => {
                                    const v = trackedVehicles.find(v => v.registration_number === trip.plate)
                                    if (v) setSelectedVehicleId(v.id)
                                }}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all cursor-pointer group",
                                    selectedVehicle?.registration_number === trip.plate
                                        ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-100"
                                        : "bg-white border-slate-100 hover:border-blue-200"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className={cn("text-[11px] font-black uppercase italic", selectedVehicle?.registration_number === trip.plate ? "text-white" : "text-slate-900")}>
                                        {trip.plate}
                                    </h4>
                                    <Badge className={cn(
                                        "text-[8px] font-black border-none",
                                        trip.status === 'on-time' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                    )}>
                                        {trip.status.toUpperCase()}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                    <Navigation className={cn("h-3 w-3", selectedVehicle?.registration_number === trip.plate ? "text-blue-200" : "text-blue-500")} />
                                    <span className={cn("truncate", selectedVehicle?.registration_number === trip.plate ? "text-blue-100" : "text-slate-500")}>TO: {trip.destination}</span>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className={cn("h-3 w-3", selectedVehicle?.registration_number === trip.plate ? "text-blue-200" : "text-slate-300")} />
                                        <span className={cn("text-[10px] font-black", selectedVehicle?.registration_number === trip.plate ? "text-white" : "text-slate-900")}>ETA: {trip.eta}</span>
                                    </div>
                                    <ChevronRight className={cn("h-3 w-3 transition-transform group-hover:translate-x-1", selectedVehicle?.registration_number === trip.plate ? "text-white" : "text-slate-300")} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="h-[1px] bg-slate-100 my-4" />

                    {/* All Vehicles Simple List */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Idle Fleet</label>
                        {filteredVehicles.map((v) => (
                            <div
                                key={v.id}
                                onClick={() => setSelectedVehicleId(v.id)}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                    selectedVehicleId === v.id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-50 hover:border-slate-200"
                                )}
                            >
                                <span className="text-[10px] font-black uppercase italic tracking-tight">{v.registration_number}</span>
                                <div className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    v.status === 'online' ? "bg-emerald-500" : "bg-slate-300"
                                )} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm">
                        <RefreshCw className="h-3 w-3" />
                        Force Sync Fleet
                    </button>
                </div>
            </div>

            {/* Main Map View */}
            <div className="flex-1 relative bg-slate-200">
                <LiveMapComponent
                    vehicles={trackedVehicles}
                    selectedVehicleId={selectedVehicleId}
                    onSelectVehicle={setSelectedVehicleId}
                />

                {/* Overlays: Selected Info Bottom Bar */}
                {selectedVehicle && (
                    <div className="absolute bottom-8 left-8 right-8 xl:left-96 z-30 pointer-events-none">
                        <div className="max-w-4xl mx-auto flex items-end justify-between gap-6 pointer-events-auto">
                            <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 flex items-center gap-8 animate-in slide-in-from-bottom-8 duration-500 flex-1">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                                        <Truck className="h-8 w-8" />
                                    </div>
                                    <div className="max-w-[150px]">
                                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight truncate">{selectedVehicle.registration_number}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STATUS:</span>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                selectedVehicle.status === 'online' ? "text-emerald-600" : "text-rose-600"
                                            )}>{selectedVehicle.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-12 w-[1px] bg-slate-100 hidden md:block" />

                                <div className="hidden md:flex flex-1 items-center justify-around">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Velocity</p>
                                        <p className="text-xl font-black text-slate-900 italic">{selectedVehicle.speed}<span className="text-[10px] font-bold text-slate-500 ml-1">KPH</span></p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fuel Remaining</p>
                                        <p className="text-xl font-black text-slate-900 italic">{selectedVehicle.fuel}<span className="text-[10px] font-bold text-slate-500 ml-1">%</span></p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ignition</p>
                                        <p className={cn("text-xl font-black italic", selectedVehicle.ignition ? "text-blue-600" : "text-slate-400")}>{selectedVehicle.ignition ? 'ON' : 'OFF'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsTelemetryOpen(true)}
                                        className="p-4 bg-slate-900 text-white rounded-2xl hover:scale-105 transition-all shadow-xl shadow-slate-200"
                                    >
                                        <Activity className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setIsReplayOpen(true)}
                                        className="p-4 bg-blue-600 text-white rounded-2xl hover:scale-105 transition-all shadow-xl shadow-blue-100"
                                    >
                                        <PlayCircle className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub-Components / Drawers */}
            <TelemetryDrawer
                isOpen={isTelemetryOpen}
                onClose={() => setIsTelemetryOpen(false)}
                vehicleId={selectedVehicleId}
                vehicle={selectedVehicle ? {
                    plate: selectedVehicle.registration_number,
                    speed: selectedVehicle.speed,
                    fuel: selectedVehicle.fuel,
                    temp: 0, // Will be fetched by TelemetryDrawer sensors but we can pass default
                    status: selectedVehicle.status,
                    voltage: '---',
                    signal: '---',
                    ignition: selectedVehicle.ignition,
                    odometer: selectedVehicle.odometer,
                    lat: selectedVehicle.latitude,
                    lng: selectedVehicle.longitude
                } : null}
            />

            <TripPlaybackTimeline
                isOpen={isReplayOpen}
                onClose={() => setIsReplayOpen(false)}
            />
        </div>
    )
}
