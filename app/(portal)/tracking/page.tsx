'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import * as vehicleApi from '@/lib/api/vehicles'
import * as trackingApi from '@/lib/api/tracking'
import * as geofenceApi from '@/lib/api/geofencing'
import {
    Loader2, MapPin, Navigation, Truck, RefreshCw,
    Layers, Search, Filter, History, ChevronRight,
    Maximize2, Minimize2, Activity, ShieldCheck,
    ArrowLeftRight, Info
} from 'lucide-react'
import { Vehicle } from '@/types'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'
import { useUIStore } from '@/store/uiStore'
import { useSubscription } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export default function TrackingPage() {
    const { setSidebarCollapsed } = useUIStore()
    const { hasModule } = useSubscription()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'moving' | 'idle' | 'offline'>('all')
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
    const [locations, setLocations] = useState<Record<string, any>>({})
    const [showGeofences, setShowGeofences] = useState(true)
    const [showClusters, setShowClusters] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Automatically collapse sidebar on entry
    useEffect(() => {
        setSidebarCollapsed(true)
        // return () => setSidebarCollapsed(false)
    }, [])

    // Fetch vehicles
    const { data: vehicleData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles', { per_page: 50 }],
        queryFn: () => vehicleApi.getVehicles({ per_page: 50 }),
    })

    const vehicles = vehicleData?.data || []

    // Fetch Geofences
    const { data: geofenceData } = useQuery({
        queryKey: ['geofences'],
        queryFn: () => geofenceApi.getGeofences(),
        enabled: hasModule('geofencing') || true, // Enabled for testing
    })

    const geofences = geofenceData?.data?.geofences || []

    const fetchLocations = async () => {
        setIsRefreshing(true)
        try {
            const locMap: Record<string, any> = {}
            // Fetch top active vehicles
            const visibleVehicles = vehicles.slice(0, 20)
            await Promise.all(visibleVehicles.map(async (v) => {
                try {
                    const res = await vehicleApi.getCurrentLocation(v.id)
                    locMap[v.id] = res.data
                } catch (e) { }
            }))
            setLocations(prev => ({ ...prev, ...locMap }))
        } catch (error) {
            toast.error('Failed to sync live data')
        } finally {
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        if (vehicles.length > 0) fetchLocations()
        const interval = setInterval(() => {
            if (vehicles.length > 0) fetchLocations()
        }, 15000)
        return () => clearInterval(interval)
    }, [vehicles.length])

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const matchesSearch = v.attributes.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.attributes.make.toLowerCase().includes(searchQuery.toLowerCase())

            const loc = locations[v.id]
            const isMoving = loc?.status === 'moving' || loc?.speed > 0
            const isIdle = loc && !isMoving
            const isOffline = !loc

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'moving' && isMoving) ||
                (statusFilter === 'idle' && isIdle) ||
                (statusFilter === 'offline' && isOffline)

            return matchesSearch && matchesStatus
        })
    }, [vehicles, searchQuery, statusFilter, locations])

    return (
        <div className="h-screen flex overflow-hidden bg-slate-900">
            {/* Control Sidebar */}
            <aside className="w-80 flex flex-col bg-white border-r border-slate-200 z-20 shadow-2xl shrink-0 transition-all duration-500">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-100/50">
                                <Activity className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="font-bold text-slate-900">Live Traffic</h2>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchLocations}
                            className={cn("h-8 w-8 text-slate-400 hover:text-blue-600", isRefreshing && "animate-spin")}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Fleet Search..."
                            className="bg-slate-50 border-slate-100 pl-9 h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                        {(['all', 'moving', 'idle', 'offline'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    "flex flex-col items-center py-2 rounded-lg border transition-all",
                                    statusFilter === s
                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                        : "bg-white border-transparent text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                <span className={cn(
                                    "w-2 h-2 rounded-full mb-1",
                                    s === 'moving' ? "bg-emerald-500" :
                                        s === 'idle' ? "bg-amber-500" :
                                            s === 'offline' ? "bg-slate-300" : "bg-blue-500"
                                )} />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">{s}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <ScrollArea className="flex-1 bg-white">
                    <div className="divide-y divide-slate-50">
                        {isLoadingVehicles ? (
                            <div className="p-10 flex flex-col items-center opacity-50">
                                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                <span className="text-xs font-medium">Scanning Network...</span>
                            </div>
                        ) : filteredVehicles.map(v => {
                            const loc = locations[v.id]
                            const isActive = loc?.status === 'moving' || loc?.speed > 0
                            const isSelected = selectedVehicle?.id === v.id

                            return (
                                <div
                                    key={v.id}
                                    onClick={() => setSelectedVehicle(v)}
                                    className={cn(
                                        "p-4 cursor-pointer transition-all border-l-4 hover:bg-slate-50",
                                        isSelected ? "bg-blue-50/50 border-blue-600" : "border-transparent"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-slate-900">{v.attributes.registration_number}</div>
                                        <Badge className={cn(
                                            "h-5 px-1.5 text-[10px] uppercase font-black",
                                            !loc ? "bg-slate-100 text-slate-500" :
                                                isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {!loc ? 'OFF' : isActive ? 'MOV' : 'IDL'}
                                        </Badge>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mb-2 truncate font-medium">
                                        {v.attributes.make} {v.attributes.model}
                                    </div>
                                    {loc ? (
                                        <div className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center">
                                                    <Truck className="w-3.5 h-3.5 text-blue-500" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{loc.speed} <span className="text-[10px] font-normal text-slate-400">km/h</span></span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Navigation className="w-3 h-3" style={{ transform: `rotate(${loc.heading}deg)` }} />
                                                <span className="text-[10px] font-mono">{format(new Date(loc.timestamp), 'HH:mm')}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-10 border border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50/50">
                                            <span className="text-[10px] font-bold text-slate-400">NO SIGNAL</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>

                <div className="p-3 border-t border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">
                        End of Vehicle Registry
                    </p>
                </div>
            </aside>

            {/* Map Engine Environment */}
            <div className="flex-1 relative overflow-hidden bg-slate-200 group">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 bg-[#f8f9fa] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:40px_40px]">
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=6.5244,3.3792&zoom=12&size=1600x1200&sensor=false&style=feature:all|element:labels.text.fill|color:0x333333&style=feature:landscape|element:all|color:0xf5f5f5&style=feature:poi|element:all|visibility:off&style=feature:road.highway|element:geometry|color:0xffffff&style=feature:road.arterial|element:geometry|color:0xffffff&style=feature:water|element:geometry|color:0xc2e5ff')] bg-cover" />
                </div>

                {/* Map Overlays Logic (Geofences & Clusters) */}
                {showGeofences && geofences.map(gf => (
                    <div key={gf.id} className="absolute inset-0 pointer-events-none animate-in fade-in duration-500">
                        {/* Simulated Geofence active area based on its attributes - currently using fixed demo positions for visual effect if dynamic coords not fully parsed yet */}
                        <div
                            className="absolute rounded-full border-2 border-emerald-500/30 bg-emerald-500/5 backdrop-blur-[1px] flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                top: '40%',
                                left: '35%',
                                width: '200px',
                                height: '200px'
                            }}
                        >
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-100 text-[10px] font-black uppercase">
                                {gf.attributes.name}
                            </Badge>
                        </div>
                    </div>
                ))}

                {/* Assets Mapping */}
                {filteredVehicles.map(v => {
                    const loc = locations[v.id]
                    if (!loc) return null
                    const isSelected = selectedVehicle?.id === v.id
                    const isMoving = loc.speed > 0

                    // Dynamic projection (Simulated)
                    const top = 50 + (6.52 - loc.lat) * 800
                    const left = 50 + (loc.lng - 3.37) * 800

                    return (
                        <div
                            key={v.id}
                            className={cn(
                                "absolute transition-all duration-1000 ease-in-out cursor-pointer z-10",
                                isSelected && "z-30"
                            )}
                            style={{
                                top: `${Math.max(10, Math.min(90, top))}%`,
                                left: `${Math.max(10, Math.min(90, left))}%`
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                setSelectedVehicle(v)
                            }}
                        >
                            <div className="relative flex flex-col items-center">
                                {/* Tooltip label */}
                                {isSelected && (
                                    <div className="absolute bottom-full mb-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg shadow-2xl animate-in zoom-in-75 slide-in-from-bottom-2">
                                        <div className="text-[10px] font-black tracking-widest uppercase mb-0.5 opacity-60">Vehicle Marker</div>
                                        <div className="text-sm font-bold truncate leading-tight">{v.attributes.registration_number}</div>
                                        <div className="text-[11px] font-bold text-blue-400 mt-1 flex items-center gap-1.5">
                                            <Activity className="w-3 h-3" /> {loc.speed} km/h
                                        </div>
                                        <div className="absolute top-full left-1/2 -ml-1.5 border-8 border-transparent border-t-slate-900" />
                                    </div>
                                )}

                                <div className={cn(
                                    "p-1.5 rounded-2xl shadow-xl border-2 transition-all duration-300",
                                    isSelected ? "bg-blue-600 border-white scale-110" :
                                        isMoving ? "bg-emerald-500 border-white" : "bg-amber-500 border-white"
                                )}>
                                    <Truck
                                        className="w-5 h-5 text-white"
                                        style={{ transform: `rotate(${loc.heading}deg)` }}
                                    />
                                </div>
                                {isMoving && !isSelected && (
                                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-30" />
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Map Controls Floating Layer */}
                <TooltipProvider>
                    <div className="absolute top-6 right-6 flex flex-col gap-3">
                        <div className="bg-white/90 backdrop-blur rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col p-1.5 gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showGeofences ? "secondary" : "ghost"}
                                        size="icon"
                                        className={cn("h-10 w-10 text-blue-600 hover:bg-blue-50", !showGeofences && "text-slate-400")}
                                        onClick={() => setShowGeofences(!showGeofences)}
                                    >
                                        <ShieldCheck className="w-5 h-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p className="text-xs font-bold">Toggle Geofences</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showClusters ? "secondary" : "ghost"}
                                        size="icon"
                                        className={cn("h-10 w-10 text-blue-600 hover:bg-blue-50", !showClusters && "text-slate-400")}
                                        onClick={() => setShowClusters(!showClusters)}
                                    >
                                        <Layers className="w-5 h-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p className="text-xs font-bold">Toggle Clusters</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href="/tracking/playback">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                        >
                                            <History className="w-5 h-5" />
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p className="text-xs font-bold">Telemetry Playback</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="bg-white/90 backdrop-blur rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 border-b border-slate-100 font-bold">
                                        +
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p className="text-xs font-bold">Zoom In</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 font-bold">
                                        -
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p className="text-xs font-bold">Zoom Out</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-white/90 backdrop-blur shadow-xl border border-slate-200 h-10 w-10 text-slate-600"
                                    onClick={() => useUIStore.getState().toggleSidebar()}
                                >
                                    <Maximize2 className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p className="text-xs font-bold">Toggle Fullscreen</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>

                {/* Selection Detail Overlay Map Context */}
                {selectedVehicle && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 animate-in slide-in-from-bottom-12 duration-700 z-40">
                        <Card className="shadow-2xl border-0 overflow-hidden bg-white/95 backdrop-blur-md">
                            <CardContent className="p-0">
                                <div className="flex">
                                    <div className="w-1/3 bg-slate-900 p-5 flex flex-col justify-between text-white">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Telemetry Status</div>
                                            <div className="text-2xl font-black mb-1 leading-none">{selectedVehicle.attributes.registration_number}</div>
                                            <div className="text-xs font-semibold text-blue-400">{selectedVehicle.attributes.make} {selectedVehicle.attributes.model}</div>
                                        </div>
                                        <div className="pt-6">
                                            <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0 text-[10px] font-bold">REVERB SYNC ACTIVE</Badge>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-5 space-y-5">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Surface Speed</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-black text-slate-900">{locations[selectedVehicle.id]?.speed || 0}</span>
                                                    <span className="text-sm font-bold text-slate-400">KM/H</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asset Heading</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black text-slate-900">{locations[selectedVehicle.id]?.heading || 0}&deg;</span>
                                                    <Navigation
                                                        className="w-4 h-4 text-blue-600"
                                                        style={{ transform: `rotate(${locations[selectedVehicle.id]?.heading || 0}deg)` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tight">
                                                <MapPin className="w-4 h-4 text-blue-500" />
                                                Lagos, NG ({locations[selectedVehicle.id]?.lat.toFixed(4)}, {locations[selectedVehicle.id]?.lng.toFixed(4)})
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="h-8 text-xs font-bold px-4" onClick={() => setSelectedVehicle(null)}>Hide</Button>
                                                <Link href={`/vehicles/${selectedVehicle.id}`}>
                                                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs font-bold px-4">Entity Profile</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
