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
import dynamic from 'next/dynamic'
import { useEcho } from '@/hooks/useEcho'

// Dynamic import for the dedicated Map component
const TrackingMap = dynamic(() => import('./TrackingMap'), { ssr: false })

// Mapbox Config (Tile URL placeholder)
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const MAPBOX_STYLE = 'mapbox/dark-v11'
const TILE_URL = MAPBOX_ACCESS_TOKEN
    ? `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// Vehicle Icon Helper (Used for sidebar and map)
const getVehicleIcon = (bodyType: string = '', status: string = '') => {
    const type = bodyType.toLowerCase()
    const isAction = status === 'moving'
    const props = { className: cn("w-4 h-4 transition-transform duration-500", isAction && "animate-pulse") }

    if (type.includes('truck')) return <Truck {...props} className={cn(props.className, "text-blue-600")} />
    if (type.includes('van')) return <Truck {...props} className={cn(props.className, "text-amber-600")} />
    if (type.includes('bike')) return <Navigation {...props} className={cn(props.className, "text-emerald-600")} />
    if (type.includes('car')) return <Activity {...props} className={cn(props.className, "text-slate-600")} />
    return <Activity {...props} className={cn(props.className, "text-blue-600")} />
}

// Vehicle Marker SVG Path Helper
const getMarkerSVG = (bodyType: string = '') => {
    const type = (bodyType || '').toLowerCase()
    if (type.includes('truck')) return '<path d="M10 17h4V5H2v12h3m10 0h2v-3.34a4 4 0 0 0-1.17-2.83L13 13V5h2v8.66a2 2 0 0 1 .58 1.42V17z"></path><circle cx="7.5" cy="17.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>'
    if (type.includes('van')) return '<path d="M2 17h20v-4H2v4zM2 9h16v4H2V9z"></path><circle cx="5" cy="17" r="2"></circle><circle cx="19" cy="17" r="2"></circle>'
    if (type.includes('bike')) return '<path d="M5.58 19c.42.61 1.13 1 1.92 1s1.5-.39 1.92-1H11v-2h-1.58c-.42-.61-1.13-1-1.92-1s-1.5.39-1.92 1H2v2h3.58zM18.5 16c-.79 0-1.5.39-1.92 1H13v2h3.58c.42.61 1.13 1 1.92 1s1.5-.39 1.92-1H22v-2h-3.5z"></path>'
    return '<circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path>'
}

// Normalization utilities
const normalizeReg = (reg: string) => reg.toUpperCase()
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

export default function TrackingPage() {
    const { setSidebarCollapsed } = useUIStore()
    const { hasModule } = useSubscription()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'moving' | 'idle' | 'offline' | 'online'>('all')
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
    const [locations, setLocations] = useState<Record<string, any>>({})
    const [showGeofences, setShowGeofences] = useState(true)
    const [showClusters, setShowClusters] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isDetailView, setIsDetailView] = useState(false)
    const { subscribe } = useEcho()

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
                    const { location } = res.data
                    locMap[v.id] = {
                        ...location,
                        lat: location.latitude,
                        lng: location.longitude,
                        timestamp: new Date().toISOString()
                    }
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
        }, 30000) // Keep polling as fallback but slower
        return () => clearInterval(interval)
    }, [vehicles.length])

    // WebSocket Tracking Integration
    useEffect(() => {
        const unsubscribe = subscribe('tracking', 'vehicle.moved', (data: any) => {
            if (data.vehicle_id && data.location) {
                setLocations(prev => ({
                    ...prev,
                    [data.vehicle_id]: {
                        ...data.location,
                        lat: data.location.latitude || data.location.lat,
                        lng: data.location.longitude || data.location.lng,
                        timestamp: new Date().toISOString()
                    }
                }))
            }
        })
        return () => unsubscribe?.()
    }, [subscribe])


    // Vehicle Statistics Calculation
    const stats = useMemo(() => {
        const counts = { all: vehicles.length, moving: 0, idle: 0, offline: 0, online: 0 }
        vehicles.forEach(v => {
            const loc = locations[v.id]
            if (!loc) {
                counts.offline++
            } else {
                counts.online++
                if (loc.status === 'moving' || loc.speed > 0) counts.moving++
                else counts.idle++
            }
        })
        return counts
    }, [vehicles, locations])

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
                (statusFilter === 'offline' && isOffline) ||
                ((statusFilter as string) === 'online' && (isMoving || isIdle))

            return matchesSearch && matchesStatus
        }).sort((a, b) => {
            const locA = locations[a.id]
            const locB = locations[b.id]

            const statusA = !locA ? 3 : (locA.status === 'moving' || locA.speed > 0 ? 1 : 2)
            const statusB = !locB ? 3 : (locB.status === 'moving' || locB.speed > 0 ? 1 : 2)

            if (statusA !== statusB) return statusA - statusB
            return a.attributes.registration_number.localeCompare(b.attributes.registration_number)
        })
    }, [vehicles, searchQuery, statusFilter, locations])


    return (
        <div className="h-screen flex overflow-hidden bg-slate-900">
            {/* Control Sidebar */}
            <aside className="w-72 flex flex-col bg-white border-r border-slate-200 z-20 shadow-2xl shrink-0 transition-all duration-500">
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

                    <div className="grid grid-cols-5 gap-1">
                        {(['all', 'moving', 'idle', 'offline', 'online'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    "flex flex-col items-center py-2 rounded-lg border transition-all relative overflow-hidden",
                                    statusFilter === s
                                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                        : "bg-white border-transparent text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                <span className="text-[11px] font-black leading-none mb-1">{stats[s]}</span>
                                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70">{s}</span>
                                <div className={cn(
                                    "absolute bottom-0 left-0 right-0 h-0.5",
                                    s === 'moving' ? "bg-emerald-500" :
                                        s === 'idle' ? "bg-amber-500" :
                                            s === 'offline' ? "bg-slate-300" :
                                                s === 'online' ? "bg-blue-400" : "bg-blue-600"
                                )} />
                            </button>
                        ))}
                    </div>
                </div>

                <ScrollArea className="flex-1 bg-white h-0">
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
                                        <div className="font-bold text-slate-900 tracking-tight">
                                            {normalizeReg(v.attributes.registration_number)}
                                        </div>
                                        <Badge className={cn(
                                            "h-5 px-1.5 text-[10px] uppercase font-black",
                                            !loc ? "bg-slate-100 text-slate-500" :
                                                isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {!loc ? 'OFF' : isActive ? 'MOV' : 'IDL'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="text-[11px] text-slate-500 truncate font-semibold uppercase opacity-70">
                                            {capitalize(v.attributes.make)} {capitalize(v.attributes.model)}
                                        </div>
                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                        <div className="text-[10px] font-mono text-slate-400">
                                            ID: {v.attributes.tracker_id || 'N/A'}
                                        </div>
                                    </div>
                                    {loc ? (
                                        <div className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center">
                                                    {getVehicleIcon(v.attributes.body_type, loc.status)}
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
            <div className="flex-1 relative overflow-hidden bg-slate-200">
                <TrackingMap
                    filteredVehicles={filteredVehicles}
                    locations={locations}
                    selectedVehicle={selectedVehicle}
                    setSelectedVehicle={setSelectedVehicle}
                    vehicles={vehicles}
                    TILE_URL={TILE_URL}
                    getMarkerSVG={getMarkerSVG}
                    getVehicleIcon={getVehicleIcon}
                />

                {/* Map Controls Floating Layer */}
                <TooltipProvider>
                    <div className="absolute top-6 right-6 flex flex-col gap-3 z-20">
                        {/* Control box */}
                        <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col p-1.5 gap-1">
                            {/* ... (Geofence/Cluster/History tools kept same) */}
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
                                <TooltipContent side="left"><p className="text-xs font-bold">Toggle Geofences</p></TooltipContent>
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
                                <TooltipContent side="left"><p className="text-xs font-bold">Toggle Clusters</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href="/tracking/playback">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                            <History className="w-5 h-5" />
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="left"><p className="text-xs font-bold">Telemetry Playback</p></TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Zoom Layer */}
                        <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => (window as any).leafletMap?.zoomIn()}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 border-b border-slate-100 font-bold"
                                    >
                                        +
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left"><p className="text-xs font-bold">Zoom In</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => (window as any).leafletMap?.zoomOut()}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 font-bold"
                                    >
                                        -
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left"><p className="text-xs font-bold">Zoom Out</p></TooltipContent>
                            </Tooltip>
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-white/95 backdrop-blur shadow-xl border border-slate-200 h-10 w-10 text-slate-600"
                                    onClick={() => useUIStore.getState().toggleSidebar()}
                                >
                                    <Maximize2 className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left"><p className="text-xs font-bold">Toggle Fullscreen</p></TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>

                {/* Compact Detail Card: Shown when selected but not expanded */}
                <div className={cn(
                    "fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40 transition-all duration-500 ease-out",
                    (selectedVehicle && !isDetailView) ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
                )}>
                    {selectedVehicle && (
                        <Card className="shadow-2xl border-0 overflow-hidden bg-white/95 backdrop-blur-md animate-in slide-in-from-bottom-12">
                            <CardContent className="p-0">
                                <div className="flex">
                                    {/* Brand Panel */}
                                    <div className="bg-slate-900 p-6 w-1/3 flex flex-col justify-between text-white shrink-0">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Entity Telemetry</div>
                                            <div className="text-2xl font-black mb-1 leading-none">
                                                {normalizeReg(selectedVehicle.attributes.registration_number)}
                                            </div>
                                            <div className="text-xs font-semibold text-blue-400">
                                                {capitalize(selectedVehicle.attributes.make)} {capitalize(selectedVehicle.attributes.model)}
                                            </div>
                                        </div>
                                        <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] font-bold mt-4">REVERB SYNC ACTIVE</Badge>
                                    </div>

                                    {/* Data Panel */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div className="grid grid-cols-2 gap-8 flex-1">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Surface Speed</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-4xl font-black text-slate-900">{locations[selectedVehicle.id]?.speed || 0}</span>
                                                        <span className="text-xs font-bold text-slate-400">KM/H</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asset Heading</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-4xl font-black text-slate-900">{locations[selectedVehicle.id]?.heading || 0}°</span>
                                                        <Navigation
                                                            className="w-4 h-4 text-blue-600"
                                                            style={{ transform: `rotate(${locations[selectedVehicle.id]?.heading || 0}deg)` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                            onClick={() => setIsDetailView(true)}
                                                        >
                                                            <Maximize2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p className="text-[10px] font-bold">Deep Dive Analysis</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                                Live Sync Status
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold px-4" onClick={() => setSelectedVehicle(null)}>Dismiss</Button>
                                                <Link href={`/vehicles/${selectedVehicle.id}`}>
                                                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold px-4 shadow-sm">View Profile</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Side Detail Drawer: Known when expanded */}
                {selectedVehicle && isDetailView && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 animate-in fade-in duration-500" onClick={() => setIsDetailView(false)} />
                )}
                <div className={cn(
                    "fixed inset-y-0 right-0 w-[480px] bg-white shadow-[-12px_0_60px_rgba(0,0,0,0.2)] z-[60] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform border-l border-slate-100 flex flex-col",
                    (selectedVehicle && isDetailView) ? "translate-x-0" : "translate-x-full"
                )}>
                    {selectedVehicle && (
                        <div className="h-full flex flex-col p-10 overflow-y-auto no-scrollbar">
                            {/* Header Section */}
                            <div className="flex items-center justify-between mb-10 pb-8 border-b border-slate-100">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-lg">
                                            {getVehicleIcon(selectedVehicle.attributes.body_type, locations[selectedVehicle.id]?.status)}
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2">
                                                {normalizeReg(selectedVehicle.attributes.registration_number)}
                                            </h2>
                                            <Badge className={cn(
                                                "px-2 h-5 text-[9px] font-black uppercase tracking-widest border-0",
                                                locations[selectedVehicle.id]?.status === 'moving' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                                            )}>
                                                {locations[selectedVehicle.id]?.status === 'moving' ? 'Mission Active' : 'System Idle'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8">
                                        Asset Details
                                    </div>
                                    <div className="text-lg font-bold text-slate-800 mt-1">
                                        {capitalize(selectedVehicle.attributes.make)} {capitalize(selectedVehicle.attributes.model)}
                                        <span className="text-slate-300 mx-2">/</span>
                                        <span className="text-slate-400">{selectedVehicle.attributes.year}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-12 w-12 rounded-2xl shadow-sm hover:shadow-md transition-all shrink-0"
                                    onClick={() => setIsDetailView(false)}
                                >
                                    <Minimize2 className="w-5 h-5 text-slate-600" />
                                </Button>
                            </div>

                            {/* Detailed Stats Section */}
                            <div className="space-y-10 flex-1">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-8 rounded-[2rem] bg-blue-50/50 border border-blue-100/50 group hover:bg-blue-50 transition-colors">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 block">Surface Velocity</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black text-blue-900 tracking-tighter">{locations[selectedVehicle.id]?.speed || 0}</span>
                                            <span className="text-xs font-black text-blue-400">KM/H</span>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 group hover:bg-slate-100 transition-colors">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Relative Heading</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-5xl font-black text-slate-900 tracking-tighter">{locations[selectedVehicle.id]?.heading || 0}°</span>
                                            <div className="p-2 rounded-full bg-white shadow-sm transition-transform duration-700" style={{ transform: `rotate(${locations[selectedVehicle.id]?.heading || 0}deg)` }}>
                                                <Navigation className="w-6 h-6 text-blue-600 fill-blue-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-6">Advanced Telemetry</h3>

                                    <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl bg-blue-100/50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                <Activity className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Signal Integrity</span>
                                        </div>
                                        <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Nominal</span>
                                    </div>

                                    <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl bg-amber-100/50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Fleet Odometer</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900 tracking-tight">{selectedVehicle.attributes.total_odometer} <span className="text-[10px] text-slate-400 font-bold ml-1">KM</span></span>
                                    </div>

                                    <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl bg-purple-100/50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                                                <ArrowLeftRight className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Fuel Archetype</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{selectedVehicle.attributes.fuel_type}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
                                                <Info className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Device UUID</span>
                                        </div>
                                        <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md truncate max-w-[150px]">{selectedVehicle.attributes.tracker_id}</span>
                                    </div>

                                    {/* New Metadata Fields */}
                                    {locations[selectedVehicle.id]?.metadata && (
                                        <>
                                            <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 rounded-xl bg-orange-100/50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                                                        <Activity className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Ignition Status</span>
                                                </div>
                                                <Badge className={cn(
                                                    "px-2 h-5 text-[9px] font-black uppercase tracking-widest border-0",
                                                    locations[selectedVehicle.id].metadata.ignition === 'on' ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"
                                                )}>
                                                    {locations[selectedVehicle.id].metadata.ignition || 'OFF'}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 rounded-xl bg-blue-100/50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                        <Activity className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Vibration/Movement</span>
                                                </div>
                                                <Badge className={cn(
                                                    "px-2 h-5 text-[9px] font-black uppercase tracking-widest border-0",
                                                    locations[selectedVehicle.id].metadata.movement === 'on' ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"
                                                )}>
                                                    {locations[selectedVehicle.id].metadata.movement || 'OFF'}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 rounded-xl bg-rose-100/50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                                                        <Activity className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Engine RPM</span>
                                                </div>
                                                <span className="text-xs font-black text-slate-900 tracking-tight">{locations[selectedVehicle.id].metadata.engine_rpm || 'N/A'}</span>
                                            </div>

                                            <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 rounded-xl bg-orange-100/50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                                                        <Activity className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Engine Temp</span>
                                                </div>
                                                <span className="text-xs font-black text-slate-900 tracking-tight">{locations[selectedVehicle.id].metadata.engine_temperature || 'N/A'} <span className="text-[10px] text-slate-400 font-bold ml-1">°C</span></span>
                                            </div>

                                            <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 rounded-xl bg-emerald-100/50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Battery Voltage</span>
                                                </div>
                                                <span className="text-xs font-black text-slate-900 tracking-tight">{locations[selectedVehicle.id].metadata.battery_voltage || 'N/A'} <span className="text-[10px] text-slate-400 font-bold ml-1">V</span></span>
                                            </div>

                                            <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 rounded-xl bg-indigo-100/50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                                        <Info className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Door Status</span>
                                                </div>
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{locations[selectedVehicle.id].metadata.door_status || 'N/A'}</span>
                                            </div>

                                            <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 rounded-xl bg-blue-100/50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                        <Navigation className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Trip Distance</span>
                                                </div>
                                                <span className="text-xs font-black text-slate-900 tracking-tight">{locations[selectedVehicle.id].metadata.trip_odometer || 'N/A'} <span className="text-[10px] text-slate-400 font-bold ml-1">KM</span></span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="pt-10 mt-10 border-t border-slate-100">
                                    <div className="flex items-center gap-4 mb-8 bg-slate-50 p-7 rounded-3xl border border-slate-100 shadow-inner">
                                        <div className="p-3 rounded-2xl bg-white shadow-sm">
                                            <MapPin className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Geospatial Position</span>
                                            <span className="text-sm font-mono font-black text-slate-700 tracking-tight">
                                                {locations[selectedVehicle.id]?.lat.toFixed(8)}, {locations[selectedVehicle.id]?.lng.toFixed(8)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            variant="outline"
                                            className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest border-2 hover:bg-slate-50 transition-all"
                                            onClick={() => {
                                                setSelectedVehicle(null)
                                                setIsDetailView(false)
                                            }}
                                        >
                                            Dismiss Asset
                                        </Button>
                                        <Link href={`/vehicles/${selectedVehicle.id}`} className="w-full">
                                            <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95">
                                                View Profile
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .leaflet-container {
                    background: #0f172a !important; /* Dark map fallback */
                }
                .leaflet-marker-icon {
                    transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .marker-container {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    items-center: center;
                    justify-content: center;
                }
                .marker-base {
                    position: relative;
                    width: 32px;
                    height: 32px;
                    background: #2563eb;
                    border: 3px solid white;
                    border-radius: 50% 50% 50% 0;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.5s ease;
                }
                .marker-container.is-active .marker-base {
                    background: #10b981;
                }
                .marker-pulse {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    background: rgba(37, 99, 235, 0.2);
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                    display: none;
                }
                .marker-container.is-active .marker-pulse {
                    display: block;
                    background: rgba(16, 185, 129, 0.2);
                }
                @keyframes pulse {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    100% { transform: scale(2.4); opacity: 0; }
                }
                .custom-popup .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                }
                .custom-popup .leaflet-popup-content {
                    margin: 0;
                }
                .custom-popup .leaflet-popup-tip {
                    background: white;
                }
            `}</style>
        </div>
    )
}
