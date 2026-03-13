'use client'

import { useState, useMemo, useEffect } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Loader2,
    Navigation,
    Truck,
    RefreshCw,
    Layers,
    Search,
    Activity,
    History,
    Eye,
    EyeOff,
    X,
    MapPin,
    Crosshair,
    ShieldCheck,
    Map as MapIcon,
    SlidersHorizontal,
    Check
} from 'lucide-react'
import { Vehicle } from '@/types'
import { cn, normalizeTelemetry } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useEcho } from '@/hooks/useEcho'
import { getEcho } from '@/lib/echo'
import * as api from '@/lib/api/vehicles'
import * as tripApi from '@/lib/api/trips'
import * as trackingApi from '@/lib/api/tracking'
import { getClusters } from '@/lib/api/settings'
import { getGeofences } from '@/lib/api/geofencing'
import TrackingMap from './TrackingMap'
import { TelemetryDrawer } from '@/components/live/TelemetryDrawer'
import { TripPlaybackTimeline } from '@/components/live/TripPlaybackTimeline'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const getMarkerSVG = (bodyType: string) => {
    switch (bodyType?.toLowerCase()) {
        case 'truck': return '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h3a5 5 0 0 0 5-5v-1h-8v6Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'
        case 'van': return '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M18 18h2"/><path d="M4 18h2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M7 6v12"/><path d="M17 6v12"/>'
        default: return '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.3 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>'
    }
}

const getVehicleIcon = (bodyType: string, status: string) => {
    const isMoving = status === 'moving'
    switch (bodyType?.toLowerCase()) {
        case 'truck': return <Truck className={cn("h-4 w-4", isMoving ? "text-emerald-500" : "text-slate-400")} />
        case 'van': return <Layers className={cn("h-4 w-4", isMoving ? "text-emerald-500" : "text-slate-400")} />
        default: return <Navigation className={cn("h-4 w-4", isMoving ? "text-emerald-500" : "text-slate-400")} />
    }
}

export default function TrackingPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'moving' | 'stopped' | 'online' | 'offline'>('all')
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
    const [isTelemetryOpen, setIsTelemetryOpen] = useState(false)
    const [isReplayOpen, setIsReplayOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'all' | 'focused'>('all')
    const [locations, setLocations] = useState<Record<string, any>>({})
    const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'hybrid'>('standard')
    const [clusterModalOpen, setClusterModalOpen] = useState(false)
    const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([])
    const [showGeofences, setShowGeofences] = useState(false)
    const [zoomResetKey, setZoomResetKey] = useState(0)

    const resetZoom = () => setZoomResetKey(prev => prev + 1)

    // Playback state
    const [playbackData, setPlaybackData] = useState<any[]>([])
    const [playbackIndex, setPlaybackIndex] = useState(0)
    const [isPlayingPlayback, setIsPlayingPlayback] = useState(false)
    const [isLoadingPlayback, setIsLoadingPlayback] = useState(false)
    const [playbackType, setPlaybackType] = useState<'trip' | 'history'>('trip')
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfDay(subDays(new Date(), 1)),
        to: endOfDay(new Date())
    })

    const MAP_LAYERS = {
        standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        hybrid: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // Needs special handling for Google
    }

    const { token } = useAuthStore()
    const { setSidebarCollapsed } = useUIStore()

    // Auto-collapse nav menu logic moved to main effect for cleanup

    const { data: vehicleData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles-tracking'],
        queryFn: () => api.getVehiclesBatched(),
        enabled: !!token,
        refetchInterval: 60_000,
    })

    // Seed all vehicle locations on load — /vehicles/locations returns full telemetry for every vehicle
    const { data: vehicleLocationsData } = useQuery({
        queryKey: ['vehicles-locations-seed'],
        queryFn: () => api.getVehiclesLocationsBatched(),
        enabled: !!token,
        refetchInterval: 30_000,
        staleTime: 0,
    })

    const { data: currentLocData } = useQuery({
        queryKey: ['vehicle-current-location', selectedVehicleId],
        queryFn: () => api.getCurrentLocation(selectedVehicleId!),
        enabled: !!selectedVehicleId,
        staleTime: 0,
    })

    const { data: clustersData } = useQuery({
        queryKey: ['clusters-tracking'],
        queryFn: () => getClusters({ per_page: 100 }),
        enabled: !!token,
    })

    const { data: tripData, isLoading: isLoadingTrips } = useQuery({
        queryKey: ['trips', { status: 'in_progress' }],
        queryFn: () => tripApi.getTrips({ status: 'in_progress' }),
        enabled: !!token && viewMode === 'focused',
    })

    const { data: geofencesData } = useQuery({
        queryKey: ['geofences-tracking'],
        queryFn: () => getGeofences({ per_page: 100 }),
        enabled: !!token && showGeofences,
    })

    const vehicles = useMemo(() => (vehicleData as any) || [], [vehicleData])
    const ongoingTrips = useMemo(() => tripData?.data?.trips || [], [tripData])
    const clusters = useMemo(() => (clustersData as any)?.data?.clusters || [], [clustersData])
    const geofences = useMemo(() => (geofencesData as any)?.data?.geofences || [], [geofencesData])

    const selectedVehicle = useMemo(() =>
        vehicles.find((v: Vehicle) => String(v.id) === String(selectedVehicleId)) || null
        , [vehicles, selectedVehicleId])

    const filteredVehicles = useMemo(() => {
        let result = vehicles
        // Cluster filter
        if (selectedClusterIds.length > 0) {
            result = result.filter((v: Vehicle) => {
                const clusterId = String(v.relationships?.cluster?.data?.id || '')
                return selectedClusterIds.includes(clusterId)
            })
        }
        if (searchQuery) {
            result = result.filter((v: Vehicle) =>
                v.attributes.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        if (statusFilter !== 'all') {
            result = result.filter((v: Vehicle) => {
                const loc = locations[v.id]
                if (statusFilter === 'moving') return loc?.status === 'in_transit'
                if (statusFilter === 'stopped') return loc?.status === 'stopped' || loc?.status === 'parked'
                if (statusFilter === 'online') return loc?.is_online === true
                if (statusFilter === 'offline') return !loc?.is_online
                return false
            })
        }
        if (selectedVehicleId && !result.find((v: Vehicle) => String(v.id) === String(selectedVehicleId))) {
            const sv = vehicles.find((v: Vehicle) => String(v.id) === String(selectedVehicleId))
            if (sv) result = [...result, sv]
        }
        return result
    }, [vehicles, searchQuery, statusFilter, locations, selectedVehicleId, selectedClusterIds])

    const ongoingTripsData = useMemo(() => {
        return ongoingTrips.map((trip: any) => {
            // API Structure confirmed via raw dump: trip.relationships.vehicle.id (direct)
            const relVehicle = trip.relationships?.vehicle as any
            const bestVehicleId = relVehicle?.id || (trip.attributes as any)?.vehicleId || (trip.attributes as any)?.vehicle_id

            // Link to fleet vehicle if possible for live telemetry synchronization
            const fleetVehicle = bestVehicleId ? vehicles.find((v: Vehicle) => String(v.id) === String(bestVehicleId)) : null

            return {
                ...trip,
                vehiclePlate: fleetVehicle?.attributes.registration_number || relVehicle?.registration_number || 'N/A',
                vehicleId: bestVehicleId ? String(bestVehicleId) : null,
                startTime: trip.attributes.planned_start_time || (trip.attributes as any)?.created_at,
                endTime: trip.attributes.planned_end_time || new Date().toISOString()
            }
        })
    }, [ongoingTrips, vehicles])

    // Unified Playback Fetch Logic
    useEffect(() => {
        const fetchPlayback = async () => {
            if (!isReplayOpen || !selectedVehicleId) {
                setPlaybackData([])
                setPlaybackIndex(0)
                setIsPlayingPlayback(false)
                return
            }

            setIsLoadingPlayback(true)
            try {
                const selectedTrip = ongoingTripsData.find(t => t.vehicleId === selectedVehicleId)

                if (playbackType === 'trip' && selectedTrip) {
                    console.log('--- FETCHING TRIP PLAYBACK ---', { vehicleId: selectedVehicleId, tripId: selectedTrip.id })
                    const res = await trackingApi.getTripPlayback(selectedVehicleId, selectedTrip.id)
                    setPlaybackData(res.data?.gps_points || [])
                } else {
                    // Fallback to tracking playback (defaults to selected range or last 24h)
                    console.log('--- FETCHING TRACKING HISTORY ---', { vehicleId: selectedVehicleId, range: dateRange })
                    const start = dateRange?.from?.toISOString() || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                    const end = dateRange?.to?.toISOString() || new Date().toISOString()
                    const res = await trackingApi.getVehiclePlayback(selectedVehicleId, start, end)
                    const raw: any[] = res.data || []
                    setPlaybackData(raw.map((p: any) => ({
                        lat: p.latitude,
                        lng: p.longitude,
                        speed: p.speed,
                        heading: 0,
                        timestamp: p.timestamp,
                    })))
                }
                setPlaybackIndex(0)
            } catch (err) {
                console.error('Failed to fetch playback telemetry:', err)
            } finally {
                setIsLoadingPlayback(false)
            }
        }
        fetchPlayback()
    }, [isReplayOpen, selectedVehicleId, playbackType, ongoingTripsData])

    // Seed locations from /vehicles/locations (full telemetry, always populated)
    useEffect(() => {
        const list = vehicleLocationsData as any
        if (!list?.length) return
        setLocations(prev => {
            const next = { ...prev }
            list.forEach((vl: any) => {
                const telemetry = vl.attributes?.telemetry || vl.location || vl.attributes?.current_location
                if (!telemetry) return

                const loc = normalizeTelemetry(telemetry, {
                    deviceStatus: vl.attributes?.deviceStatus || vl.attributes?.device_status || vl.device?.status
                })
                if (!loc?.lat) return

                // Priority Check: Only update if no live WS data already present for this vehicle
                // or if the seeded data is reasonably fresh and WS hasn't received anything yet.
                next[vl.id] = {
                    ...loc,
                    ...next[vl.id],
                    lat: next[vl.id]?.lat ?? loc.lat,
                    lng: next[vl.id]?.lng ?? loc.lng,
                    speed: next[vl.id]?.speed ?? loc.speed ?? 0,
                    heading: next[vl.id]?.heading ?? loc.heading ?? 0,
                    status: next[vl.id]?.status ?? loc.status ?? 'active',
                    is_online: next[vl.id]?.is_online ?? loc.is_online ?? vl.attributes?.is_online ?? (vl.attributes?.deviceStatus === 'online'),
                    lastUpdate: next[vl.id]?.lastUpdate ?? loc.gps_datetime,
                    ignition: next[vl.id]?.ignition ?? (loc.ignition === 'on' || loc.ignition === '1'),
                }
            })
            return next
        })
    }, [vehicleLocationsData])

    // Also seed from vehicle.relationships.current_location if available
    useEffect(() => {
        if (vehicles.length > 0) {
            setLocations(prev => {
                const next = { ...prev }
                let changed = false
                vehicles.forEach((v: Vehicle) => {
                    const tel = v.relationships?.current_location as any
                    const attrs = v.attributes as any

                    if (tel?.latitude && !next[v.id]) {
                        next[v.id] = {
                            lat: tel.latitude,
                            lng: tel.longitude,
                            speed: tel.speed || 0,
                            heading: tel.heading || 0,
                            status: tel.status || 'active',
                            is_online: attrs.is_online || false,
                            fuel: tel.fuel_level_percent,
                            fuel_liters: tel.fuel_level_liters,
                            odometer: tel.odometer,
                            lastUpdate: tel.gps_datetime,
                            satellites: tel.satellites,
                            address: tel.address,
                            ignition: tel.ignition === 'on',
                            metadata: tel.metadata,
                        }
                        changed = true
                    }
                })
                return changed ? next : prev
            })
        }
    }, [vehicles])

    // Merge per-vehicle current location when a vehicle is selected
    useEffect(() => {
        if (!currentLocData || !selectedVehicleId) return
        const loc = (currentLocData as any).location || currentLocData
        if (!loc?.latitude) return
        setLocations(prev => ({
            ...prev,
            [selectedVehicleId]: {
                ...prev[selectedVehicleId],
                lat: loc.latitude,
                lng: loc.longitude,
                speed: loc.speed || 0,
                heading: loc.heading || 0,
                status: loc.status || 'active',
                is_online: true,
                fuel: loc.fuel_level_percent,
                fuel_liters: loc.fuel_level_liters,
                odometer: loc.odometer,
                lastUpdate: loc.gps_datetime,
                satellites: loc.satellites,
                address: loc.address,
                ignition: loc.ignition === 'on',
                metadata: loc.metadata,
            }
        }))
    }, [currentLocData, selectedVehicleId])

    // WebSocket Telemetry Subscription
    const { organization } = useAuthStore()
    const { subscribePrivate } = useEcho()

    useEffect(() => {
        const orgIdentifier = organization?.attributes?.identifier || organization?.id
        if (!token || !orgIdentifier) return

        // 1. Subscribe to Org-wide location updates
        const locationUnsubscribe = subscribePrivate(`location.organization.${orgIdentifier}`, '.current.recent', (packet: any) => {
            if (packet.vehicle_id) {
                const normalized = normalizeTelemetry(packet)
                setLocations(prev => ({
                    ...prev,
                    [packet.vehicle_id]: {
                        // Old data as base, new WS data on top so fresh values always win
                        ...prev[packet.vehicle_id],
                        ...normalized,
                        is_online: true,
                        lastUpdate: packet.gps_datetime || packet.timestamp_utc,
                        ignition: normalized.ignition === 'on' || normalized.ignition === '1',
                    }
                }))
            }
        })

        // 2. Subscribe to Vehicle Status Changes
        const statusUnsubscribe = subscribePrivate(`vehicle.status.${orgIdentifier}`, '.vehicle.status.changed', (data: any) => {
            if (data.vehicle_id) {
                setLocations(prev => ({
                    ...prev,
                    [data.vehicle_id]: {
                        ...prev[data.vehicle_id],
                        status: data.new_status,
                    }
                }))
            }
        })

        // 3. Subscribe to Fuel Alerts
        const fuelUnsubscribe = subscribePrivate(`fuel.alerts.${orgIdentifier}`, '.fuel.event', (alert: any) => {
            // Optional: Show toast or update local state for fuel warnings
            console.log('Fuel Event:', alert)
        })

        return () => {
            if (locationUnsubscribe) locationUnsubscribe()
            if (statusUnsubscribe) statusUnsubscribe()
            if (fuelUnsubscribe) fuelUnsubscribe()
        }
    }, [token, organization?.attributes?.identifier, subscribePrivate, queryClient])

    // Reconnect: refetch vehicle locations when WS reconnects
    useEffect(() => {
        if (!token || !organization?.attributes?.identifier) return
        const echo = getEcho()
        if (!echo?.connector?.pusher) return

        const pusher = echo.connector.pusher
        const handleReconnect = () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles-locations-seed'] })
        }
        pusher.connection.bind('connected', handleReconnect)
        return () => {
            pusher.connection.unbind('connected', handleReconnect)
        }
    }, [token, organization?.attributes?.identifier, queryClient])

    // Auto-collapse sidebar on mount
    useEffect(() => {
        setSidebarCollapsed(true)
        return () => setSidebarCollapsed(false)
    }, [setSidebarCollapsed])

    return (
        <UpgradeGate
            module="geofence"
            featureName="Live Tracking"
            description="Monitor your fleet in real-time with precise telemetry and location data."
        >
            <div className="h-screen w-full flex overflow-hidden bg-slate-100 relative">
                {/* Immersive Background Map */}
                <div className="absolute inset-0 z-0 h-full w-full">
                    <TrackingMap
                        filteredVehicles={filteredVehicles}
                        locations={locations}
                        selectedVehicle={selectedVehicle}
                        setSelectedVehicle={(v) => setSelectedVehicleId(v.id)}
                        vehicles={vehicles}
                        TILE_URL={MAP_LAYERS[mapStyle]}
                        getMarkerSVG={getMarkerSVG}
                        getVehicleIcon={getVehicleIcon}
                        statusFilter={statusFilter}
                        zoomResetKey={zoomResetKey}
                        showGeofences={showGeofences}
                        geofences={geofences}
                    />
                </div>

                {/* Dynamic Sidebar Overlay */}
                <div className="absolute left-6 top-6 bottom-6 z-20 flex flex-col pointer-events-none">
                    <div className={cn(
                        "w-72 h-full border border-white/20 rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden pointer-events-auto transition-all duration-500 ease-in-out",
                        viewMode === 'focused' ? "bg-white" : "bg-white/95 backdrop-blur-xl"
                    )}>
                        {/* Sidebar Header */}
                        <div className="p-6 border-b border-slate-100/50">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                    {viewMode === 'all' ? 'Fleet' : 'Active'} <span className="text-blue-600">{viewMode === 'all' ? 'Listing' : 'Trips'}</span>
                                </h2>
                                <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black uppercase tracking-widest">
                                    {viewMode === 'all' ? `${vehicles.length} Assets` : `${ongoingTrips.length} Active`}
                                </Badge>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={viewMode === 'all' ? "SEARCH ASSETS..." : "SEARCH TRIPS..."}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Sidebar Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                            {viewMode === 'all' ? (
                                <>
                                    {/* Status Quick Filters */}
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                        {([
                                            { key: 'all',     label: 'All' },
                                            { key: 'moving',  label: 'Moving' },
                                            { key: 'stopped', label: 'Stopped' },
                                            { key: 'online',  label: 'Online' },
                                            { key: 'offline', label: 'Offline' },
                                        ] as const).map(({ key: s, label }) => {
                                            const count = s === 'all'
                                                ? vehicles.length
                                                : vehicles.filter((v: Vehicle) => {
                                                    const loc = locations[v.id]
                                                    if (s === 'moving')  return loc?.status === 'in_transit'
                                                    if (s === 'stopped') return loc?.status === 'stopped' || loc?.status === 'parked'
                                                    if (s === 'online')  return loc?.is_online === true
                                                    if (s === 'offline') return !loc?.is_online
                                                    return false
                                                }).length

                                            const activeColor =
                                                s === 'moving'  ? "bg-emerald-600 border-emerald-600 text-white" :
                                                s === 'stopped' ? "bg-slate-500 border-slate-500 text-white" :
                                                s === 'online'  ? "bg-blue-600 border-blue-600 text-white" :
                                                s === 'offline' ? "bg-rose-600 border-rose-600 text-white" :
                                                                  "bg-slate-900 border-slate-900 text-white"

                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => setStatusFilter(s)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                                                        statusFilter === s ? activeColor : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                                    )}
                                                >
                                                    {label} ({count})
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="space-y-2">
                                        {isLoadingVehicles ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                                                <Loader2 className="h-8 w-8 animate-spin" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Fleet...</span>
                                            </div>
                                        ) : filteredVehicles.map((v: Vehicle) => {
                                            const loc = locations[v.id]
                                            const isSelected = String(selectedVehicleId) === String(v.id)
                                            const status = loc?.status || (v as any).location?.status
                                            const rawUpdate = loc?.lastUpdate || (v as any).location?.gps_datetime
                                            const lastUpdate = rawUpdate ? new Date(rawUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'
                                            const fuel = loc?.fuel_level_percent ?? null
                                            const statusLabel =
                                                !loc?.is_online           ? 'Offline' :
                                                status === 'in_transit'   ? 'Moving' :
                                                (status === 'stopped' || status === 'parked') ? 'Stopped' :
                                                status === 'idle'         ? 'Idling' : 'Online'

                                            return (
                                                <div
                                                    key={v.id}
                                                    onClick={() => setSelectedVehicleId(isSelected ? null : v.id)}
                                                    className={cn(
                                                        "group flex flex-col p-3 rounded-xl border transition-all cursor-pointer gap-2",
                                                        isSelected
                                                            ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.01]"
                                                            : "bg-white border-slate-50 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "p-2 rounded-lg transition-colors",
                                                                isSelected ? "bg-white/20" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                                                            )}>
                                                                <Truck className="h-3.5 w-3.5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[10px] font-black uppercase italic tracking-tight leading-none mb-1">
                                                                    {v.attributes.registration_number}
                                                                </h4>
                                                                <p className={cn("text-[8px] font-bold uppercase", isSelected ? "text-blue-100" : "text-slate-400")}>
                                                                    {v.attributes.make} {v.attributes.model}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                                                                isSelected ? "bg-white/20 text-white" :
                                                                !loc?.is_online         ? "bg-rose-100 text-rose-600" :
                                                                status === 'in_transit' ? "bg-emerald-100 text-emerald-700" :
                                                                (status === 'stopped' || status === 'parked') ? "bg-slate-100 text-slate-500" :
                                                                status === 'idle'       ? "bg-amber-100 text-amber-700" :
                                                                                          "bg-blue-100 text-blue-700"
                                                            )}>
                                                                {statusLabel}
                                                            </span>
                                                            <div className={cn(
                                                                "h-1.5 w-1.5 rounded-full shadow-[0_0_8px]",
                                                                !loc?.is_online                                    ? "bg-rose-500 shadow-rose-500/50" :
                                                                status === 'in_transit'                            ? "bg-emerald-500 shadow-emerald-500/50" :
                                                                (status === 'stopped' || status === 'parked')      ? "bg-slate-400 shadow-slate-400/50" :
                                                                                                                    "bg-blue-500 shadow-blue-500/50"
                                                            )} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                                        <span className={cn("text-[7px] font-black uppercase tracking-widest", isSelected ? "text-blue-200" : "text-slate-400")}>
                                                            {lastUpdate}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            {fuel != null && (
                                                                <span className={cn(
                                                                    "text-[7px] font-black uppercase tracking-widest",
                                                                    isSelected ? "text-blue-200" : fuel < 20 ? "text-rose-500" : "text-slate-400"
                                                                )}>
                                                                    ⛽ {fuel}%
                                                                </span>
                                                            )}
                                                            <span className={cn("text-[7px] font-black uppercase tracking-widest", isSelected ? "text-blue-200" : "text-slate-400")}>
                                                                {loc?.speed ?? 0} KPH
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    {isLoadingTrips ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Scanning Missions...</span>
                                        </div>
                                    ) : ongoingTripsData.length === 0 ? (
                                        <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                            <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No ongoing missions</p>
                                        </div>
                                    ) : (
                                        ongoingTripsData.map((trip) => {
                                            const isSelected = String(selectedVehicleId) === String(trip.vehicleId)
                                            return (
                                                <div
                                                    key={trip.id}
                                                    onClick={() => {
                                                        if (trip.vehicleId) {
                                                            setSelectedVehicleId(trip.vehicleId)
                                                            setIsReplayOpen(true)
                                                        }
                                                    }}
                                                    className={cn(
                                                        "group p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                                                        isSelected
                                                            ? "bg-blue-50 border-blue-200 shadow-sm scale-[1.01]"
                                                            : "bg-white border-slate-100 hover:border-blue-100 shadow-sm"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className={cn(
                                                                "text-[10px] font-black uppercase tracking-tighter",
                                                                isSelected ? "text-blue-600" : "text-slate-400"
                                                            )}>
                                                                {trip.vehiclePlate}
                                                            </h4>
                                                            <Badge className={cn(
                                                                "text-[8px] font-black border-none px-2 mt-1",
                                                                isSelected ? "bg-blue-100 text-blue-700" : "bg-emerald-500/10 text-emerald-600"
                                                            )}>
                                                                ETA: {trip.attributes.eta || 'N/A'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={cn("text-[8px] font-black uppercase tracking-widest", isSelected ? "text-blue-400" : "text-slate-400")}>Mission #</p>
                                                            <p className={cn("text-[10px] font-black italic", isSelected ? "text-blue-700" : "text-slate-900")}>{trip.attributes.trip_number}</p>
                                                        </div>
                                                    </div>

                                                    <div className={cn("relative h-1.5 w-full rounded-full overflow-hidden mb-3", isSelected ? "bg-blue-200/50" : "bg-slate-100")}>
                                                        <div
                                                            className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-1000", isSelected ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-blue-400")}
                                                            style={{ width: '65%' }}
                                                        />
                                                    </div>
                                                    <div className={cn("flex justify-between items-center text-[7px] font-black uppercase tracking-widest mt-1", isSelected ? "text-blue-500" : "text-slate-400")}>
                                                        <span>{locations[trip.vehicleId!]?.speed || 0} KPH</span>
                                                        <span>TRACKING ACTIVE</span>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side Controls Command Deck */}
                <div className="absolute right-6 top-6 z-30 flex flex-col gap-4">
                    <TooltipProvider delayDuration={0}>
                        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-2 overflow-hidden items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setViewMode('all')}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            viewMode === 'all' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
                                        )}
                                    >
                                        <MapIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Global Fleet Tracking
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setViewMode('focused')}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            viewMode === 'focused' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
                                        )}
                                    >
                                        <Crosshair className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Focus Mission Tracking
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-2 overflow-hidden items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="h-12 w-12 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-emerald-500 transition-all group">
                                        <ShieldCheck className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Toggle Active Geofences
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            if (viewMode === 'all') {
                                                router.push('/tracking/playback')
                                            }
                                        }}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            viewMode === 'all' ? "text-slate-400 hover:bg-slate-50 hover:text-purple-500" : "text-slate-200 cursor-not-allowed"
                                        )}
                                    >
                                        <History className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Fleet Playback Router
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setMapStyle(mapStyle === 'standard' ? 'satellite' : 'standard')}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            mapStyle === 'satellite' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
                                        )}
                                    >
                                        <MapIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Toggle Satellite View
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => queryClient.invalidateQueries({ queryKey: ['vehicles-tracking'] })}
                                        className="h-12 w-12 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all group"
                                    >
                                        <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Re-Sync Fleet Data
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setClusterModalOpen(true)}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            selectedClusterIds.length > 0
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                                : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
                                        )}
                                    >
                                        <SlidersHorizontal className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Filter by Cluster
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setShowGeofences(!showGeofences)}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                                            showGeofences
                                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                                                : "text-slate-400 hover:bg-slate-50 hover:text-emerald-600"
                                        )}
                                    >
                                        <ShieldCheck className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest">
                                    Toggle Geofences
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-1 overflow-hidden items-center">
                            <button className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-900 font-black hover:bg-slate-50 transition-colors border-b border-slate-50">+</button>
                            <button className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-900 font-black hover:bg-slate-50 transition-colors">-</button>
                        </div>
                    </TooltipProvider>
                </div>


                {/* Overlays: Selected Info Bottom Bar */}
                {selectedVehicle && !isReplayOpen && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in slide-in-from-bottom-5 duration-500 delay-100 w-full max-w-xl">
                        <div className="bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.3)] border border-white/50 p-4 flex items-center gap-6 pointer-events-auto">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tighter truncate">
                                            {selectedVehicle.attributes.registration_number}
                                        </h3>
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full shrink-0",
                                            (locations[selectedVehicle.id]?.status === 'moving' || locations[selectedVehicle.id]?.speed > 0) ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                                        )} />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-2.5 w-2.5 text-blue-500" />
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">
                                            {locations[selectedVehicle.id]?.lastUpdate || 'SYNCED REAL-TIME'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-10 w-[1px] bg-slate-100 shrink-0" />

                            <div className="flex items-center gap-5 shrink-0 px-2">
                                <div className="text-center">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Velocity</p>
                                    <p className="text-base font-black text-slate-900 italic tracking-tighter leading-none">
                                        {locations[selectedVehicle.id]?.speed || 0}<span className="text-[8px] font-bold text-slate-400 ml-0.5 font-sans not-italic">KPH</span>
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Fuel</p>
                                    <p className="text-base font-black text-slate-900 italic tracking-tighter leading-none">
                                        {locations[selectedVehicle.id]?.fuel || 0}<span className="text-[8px] font-bold text-slate-400 ml-0.5 font-sans not-italic">%</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => {
                                                    const hasTrip = ongoingTripsData.some(t => t.vehicleId === selectedVehicleId)
                                                    setPlaybackType(hasTrip ? 'trip' : 'history')
                                                    setIsReplayOpen(true)
                                                }}
                                                className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center border border-blue-100"
                                            >
                                                <History className="h-4 w-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-none font-black text-[9px] uppercase tracking-widest">Replay</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => setIsTelemetryOpen(true)}
                                                className="h-10 w-10 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg"
                                            >
                                                <Activity className="h-4 w-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-none font-black text-[9px] uppercase tracking-widest">Sensors</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <div className="h-8 w-[1px] bg-slate-100 mx-1" />

                                <button
                                    onClick={() => {
                                        setSelectedVehicleId(null)
                                        resetZoom()
                                    }}
                                    className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub-Components / Drawers */}
            <TelemetryDrawer
                isOpen={isTelemetryOpen}
                onClose={() => {
                    setIsTelemetryOpen(false)
                    resetZoom()
                }}
                vehicleId={selectedVehicleId}
                vehicle={selectedVehicle ? (() => {
                    const loc = locations[selectedVehicle.id]
                    const rel = selectedVehicle.relationships?.current_location as any
                    return {
                        plate: selectedVehicle.attributes.registration_number,
                        make: selectedVehicle.attributes.make,
                        model: selectedVehicle.attributes.model,
                        device_id: selectedVehicle.attributes.device_id ?? null,
                        imei: (selectedVehicle.relationships?.device as any)?.data?.imei ?? null,
                        altitude: loc?.altitude ?? null,
                        movement: loc?.movement ?? null,
                        speed:         loc?.speed                ?? rel?.speed                          ?? 0,
                        // normalizeTelemetry flattens metadata to top-level on loc
                        fuel:          loc?.fuel_level_percent   ?? rel?.fuel_level_percent             ?? 0,
                        fuel_liters:   loc?.fuel_level_liters    ?? rel?.fuel_level_liters,
                        temp:          loc?.engine_temperature   ?? rel?.metadata?.engine_temperature   ?? 0,
                        status:        loc?.status               ?? rel?.status,
                        voltage:       loc?.battery_voltage      ?? rel?.metadata?.battery_voltage,
                        ext_voltage:   loc?.external_voltage     ?? rel?.metadata?.external_voltage,
                        signal:        loc?.satellites != null   ? `${loc.satellites} Sats` : rel?.satellites != null ? `${rel.satellites} Sats` : '---',
                        ignition:      loc?.ignition             ?? (rel?.ignition === 'on'),
                        odometer:      loc?.odometer             ?? rel?.odometer,
                        lat:           loc?.lat                  ?? rel?.latitude,
                        lng:           loc?.lng                  ?? rel?.longitude,
                        lastUpdate:    loc?.lastUpdate           ?? rel?.gps_datetime,
                        address:       loc?.address              ?? rel?.address,
                        heading:       loc?.heading              ?? rel?.heading                        ?? 0,
                        rpm:           loc?.engine_rpm           ?? rel?.metadata?.engine_rpm,
                        fuel_rate:     loc?.fuel_rate_gps        ?? rel?.metadata?.fuel_rate_gps,
                        eco_score:     loc?.eco_score            ?? rel?.metadata?.eco_score,
                        idling:        loc?.idling               ?? rel?.metadata?.idling               ?? false,
                        jamming:       loc?.jamming              ?? rel?.metadata?.jamming              ?? false,
                        immobilizer:   loc?.immobilizer          ?? rel?.metadata?.immobilizer          ?? false,
                        driving_state: loc?.driving_state        ?? rel?.metadata?.driving_state,
                    }
                })() : null}
            />

            {/* Cluster Filter Modal */}
            <Dialog open={clusterModalOpen} onOpenChange={setClusterModalOpen}>
                <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-slate-100">
                        <DialogTitle className="text-sm font-black uppercase tracking-tight italic flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                            Filter by <span className="text-blue-600">Cluster</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                        {clusters.length === 0 ? (
                            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-8">No clusters found</p>
                        ) : clusters.map((c: any) => {
                            const id = String(c.id)
                            const isSelected = selectedClusterIds.includes(id)
                            return (
                                <button
                                    key={id}
                                    onClick={() => setSelectedClusterIds(prev =>
                                        isSelected ? prev.filter(x => x !== id) : [...prev, id]
                                    )}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left",
                                        isSelected
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "bg-white border-slate-100 text-slate-700 hover:border-blue-200"
                                    )}
                                >
                                    <span className="text-[11px] font-black uppercase tracking-widest">
                                        {c.attributes?.name || c.name || `Cluster ${id}`}
                                    </span>
                                    {isSelected && <Check className="h-3.5 w-3.5" />}
                                </button>
                            )
                        })}
                    </div>
                    <div className="p-4 border-t border-slate-100 flex gap-2">
                        <button
                            onClick={() => setSelectedClusterIds([])}
                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => setClusterModalOpen(false)}
                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all"
                        >
                            Apply ({selectedClusterIds.length})
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <TripPlaybackTimeline
                isOpen={isReplayOpen}
                onClose={() => setIsReplayOpen(false)}
                data={playbackData}
                currentIndex={playbackIndex}
                onIndexChange={setPlaybackIndex}
                isPlaying={isPlayingPlayback}
                setIsPlaying={setIsPlayingPlayback}
                isLoading={isLoadingPlayback}
                title={playbackType === 'trip' ? 'TRIP REPLAY' : 'HISTORY REPLAY'}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
            />

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </UpgradeGate>
    )
}
