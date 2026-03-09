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
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/vehicles'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'

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

    const { data: vehicleData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles', { per_page: 100 }],
        queryFn: () => api.getVehicles({ per_page: 100 }),
        enabled: !!token,
    })

    const vehicles = vehicleData?.data || []

    // Derived selected vehicle object
    const selectedVehicle = useMemo(() =>
        vehicles.find(v => v.id === selectedVehicleId) || null
        , [vehicles, selectedVehicleId])

    const filteredVehicles = useMemo(() => {
        if (!searchQuery) return vehicles
        return vehicles.filter(v =>
            v.attributes.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [vehicles, searchQuery])

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
                                    const v = vehicles.find(v => v.attributes.registration_number === trip.plate)
                                    if (v) setSelectedVehicleId(v.id)
                                }}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all cursor-pointer group",
                                    selectedVehicle?.attributes.registration_number === trip.plate
                                        ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-100"
                                        : "bg-white border-slate-100 hover:border-blue-200"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className={cn("text-[11px] font-black uppercase italic", selectedVehicle?.attributes.registration_number === trip.plate ? "text-white" : "text-slate-900")}>
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
                                    <Navigation className={cn("h-3 w-3", selectedVehicle?.attributes.registration_number === trip.plate ? "text-blue-200" : "text-blue-500")} />
                                    <span className={cn("truncate", selectedVehicle?.attributes.registration_number === trip.plate ? "text-blue-100" : "text-slate-500")}>TO: {trip.destination}</span>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className={cn("h-3 w-3", selectedVehicle?.attributes.registration_number === trip.plate ? "text-blue-200" : "text-slate-300")} />
                                        <span className={cn("text-[10px] font-black", selectedVehicle?.attributes.registration_number === trip.plate ? "text-white" : "text-slate-900")}>ETA: {trip.eta}</span>
                                    </div>
                                    <ChevronRight className={cn("h-3 w-3 transition-transform group-hover:translate-x-1", selectedVehicle?.attributes.registration_number === trip.plate ? "text-white" : "text-slate-300")} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="h-[1px] bg-slate-100 my-4" />

                    {/* All Vehicles Simple List */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Idle Fleet</label>
                        {filteredVehicles.slice(0, 5).map((v) => (
                            <div
                                key={v.id}
                                onClick={() => setSelectedVehicleId(v.id)}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                    selectedVehicleId === v.id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-50 hover:border-slate-200"
                                )}
                            >
                                <span className="text-[10px] font-black uppercase italic tracking-tight">{v.attributes.registration_number}</span>
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
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
                {/* Simulated Map Engine with Better UI */}
                <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=6.5244,3.3792&zoom=11&size=1600x1200&sensor=false&style=feature:all|element:labels.text.fill|color:0x333333&style=feature:landscape|element:all|color:0xf5f5f5&style=feature:poi|element:all|visibility:off&style=feature:road.highway|element:geometry|color:0xffffff&style=feature:road.arterial|element:geometry|color:0xffffff&style=feature:water|element:geometry|color:0xc2e5ff')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-slate-400/10 backdrop-grayscale-[20%] pointer-events-none" />
                </div>

                {/* Map Controls */}
                <div className="absolute top-8 right-8 z-10 flex flex-col gap-3">
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-1 flex flex-col overflow-hidden">
                        <button className="h-10 w-10 flex items-center justify-center hover:bg-white text-slate-900 font-black transition-colors border-b border-slate-100">+</button>
                        <button className="h-10 w-10 flex items-center justify-center hover:bg-white text-slate-900 font-black transition-colors">-</button>
                    </div>
                    <button className="h-10 w-10 bg-white shadow-xl rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
                        <Layers className="h-4 w-4" />
                    </button>
                </div>

                {/* Top Center: Map Mode Indicator */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-slate-900/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 flex items-center gap-4 shadow-2xl">
                        <button
                            onClick={() => setViewMode('all')}
                            className={cn(
                                "text-[9px] font-black uppercase tracking-widest transition-all",
                                viewMode === 'all' ? "text-blue-400" : "text-slate-500 hover:text-white"
                            )}
                        >
                            Global Fleet
                        </button>
                        <div className="h-3 w-[1px] bg-white/10" />
                        <button
                            onClick={() => setViewMode('focused')}
                            className={cn(
                                "text-[9px] font-black uppercase tracking-widest transition-all",
                                viewMode === 'focused' ? "text-blue-400" : "text-slate-500 hover:text-white"
                            )}
                        >
                            Focus Tracking
                        </button>
                    </div>
                </div>

                {/* Simulated Vehicle Markers */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Placeholder for real vehicle markers */}
                    <div className={cn(
                        "absolute top-[45%] left-[55%] pointer-events-auto transition-all duration-700",
                        selectedVehicleId ? "scale-125 z-20" : "scale-100 z-10"
                    )}>
                        <div className="relative group cursor-pointer" onClick={() => setSelectedVehicleId('demo-1')}>
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center shadow-2xl border-2 transition-all",
                                selectedVehicleId ? "bg-blue-600 border-white" : "bg-white border-blue-600"
                            )}>
                                <Truck className={cn("h-5 w-5", selectedVehicleId ? "text-white" : "text-blue-600")} />
                            </div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest border border-white/10">
                                LND-123-XY • 72 KM/H
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overlays: Selected Info Bottom Bar */}
                {selectedVehicle && (
                    <div className="absolute bottom-8 left-8 right-8 xl:left-96 z-30 pointer-events-none">
                        <div className="max-w-4xl mx-auto flex items-end justify-between gap-6 pointer-events-auto">
                            <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 flex items-center gap-8 animate-in slide-in-from-bottom-8 duration-500 flex-1">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                                        <Truck className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">{selectedVehicle.attributes.registration_number}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CURRENT OPERATOR:</span>
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">MUSA IBRAHIM</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-12 w-[1px] bg-slate-100 hidden md:block" />

                                <div className="hidden md:flex flex-1 items-center justify-around">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Velocity</p>
                                        <p className="text-xl font-black text-slate-900 italic">72<span className="text-[10px] font-bold text-slate-500 ml-1">KPH</span></p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fuel Remaining</p>
                                        <p className="text-xl font-black text-slate-900 italic">64<span className="text-[10px] font-bold text-slate-500 ml-1">%</span></p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Signal (RSSI)</p>
                                        <p className="text-xl font-black text-emerald-600 italic">-62<span className="text-[10px] font-bold text-slate-500 ml-1">dBm</span></p>
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
                vehicle={selectedVehicle ? {
                    plate: selectedVehicle.attributes.registration_number,
                    speed: 72,
                    fuel: 64,
                    temp: 92,
                    status: 'active',
                    voltage: '14.2V',
                    signal: '-62 dBm'
                } : null}
            />

            <TripPlaybackTimeline
                isOpen={isReplayOpen}
                onClose={() => setIsReplayOpen(false)}
            />
        </div>
    )
}
