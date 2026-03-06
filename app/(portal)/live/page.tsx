'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/vehicles'
import { Loader2, MapPin, Navigation, Truck, RefreshCw, Layers } from 'lucide-react'
import { Vehicle } from '@/types'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'

// Map component utilizing native Leaflet (if loaded globally) or a placeholder UI
export default function LiveTrackingPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
    const [locations, setLocations] = useState<Record<string, any>>({})
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Fetch all vehicles
    const { data: vehicleData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['vehicles', { per_page: 100 }],
        queryFn: () => api.getVehicles({ per_page: 100 }),
    })

    const vehicles = vehicleData?.data || []

    const fetchLocations = async () => {
        setIsRefreshing(true)
        try {
            const locMap: Record<string, any> = {}
            // In a real production app we'd fetch this via a bulk endpoint or websockets
            // Since the endpoint is per-vehicle, we'll fetch for visible/active ones or sequentially
            for (const v of vehicles.slice(0, 15)) { // Limit concurrent requests locally to prevent blocking
                try {
                    const res = await api.getCurrentLocation(v.id)
                    locMap[v.id] = res.data
                } catch (e) {
                    // Fail silently for vehicles without location pings
                }
            }
            setLocations(locMap)
        } catch (error) {
            toast.error('Failed to update live coordinates')
        } finally {
            setIsRefreshing(false)
        }
    }

    // Ping location on mount and periodic refresh
    useEffect(() => {
        if (vehicles.length > 0) {
            fetchLocations()
        }

        const interval = setInterval(() => {
            if (vehicles.length > 0) fetchLocations()
        }, 15000) // Poll every 15s

        return () => clearInterval(interval)
    }, [vehicles.length])

    const filteredVehicles = useMemo(() => {
        if (!searchQuery) return vehicles
        const lowerQ = searchQuery.toLowerCase()
        return vehicles.filter(v =>
            v.attributes.registration_number.toLowerCase().includes(lowerQ) ||
            v.attributes.make.toLowerCase().includes(lowerQ) ||
            v.attributes.model.toLowerCase().includes(lowerQ)
        )
    }, [vehicles, searchQuery])

    const activeCount = Object.keys(locations).filter(id => locations[id]?.status === 'moving' || locations[id]?.status === 'active').length

    return (
        <div className="h-[calc(100vh-80px)] -m-6 md:-m-8 flex flex-col xl:flex-row overflow-hidden bg-slate-100">
            {/* Sidebar (Vehicle List) */}
            <div className="w-full xl:w-96 flex flex-col bg-white border-r border-slate-200 z-10 shrink-0 shadow-xl h-1/2 xl:h-full">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-indigo-600" />
                            Live Telemetry
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{vehicles.length} Assets &bull; {activeCount} Moving</p>
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchLocations} disabled={isRefreshing} className="h-8 w-8 bg-white">
                        <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="p-3 border-b border-slate-100">
                    <Input
                        placeholder="Search plate or model..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-slate-50 border-slate-200 h-9"
                    />
                </div>

                <ScrollArea className="flex-1">
                    {isLoadingVehicles ? (
                        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    ) : filteredVehicles.length === 0 ? (
                        <div className="text-center p-8 text-slate-400 text-sm">No vehicles found</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {filteredVehicles.map(v => {
                                const loc = locations[v.id]
                                const isMoving = loc?.status === 'moving' || loc?.speed > 0
                                const isSelected = selectedVehicle?.id === v.id

                                return (
                                    <div
                                        key={v.id}
                                        onClick={() => setSelectedVehicle(v)}
                                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${isSelected ? 'border-l-indigo-500 bg-indigo-50/50' : 'border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-bold text-slate-900">{v.attributes.registration_number || v.attributes.display_number}</div>
                                            {loc ? (
                                                <Badge variant="secondary" className={`text-[9px] h-4 px-1 uppercase tracking-wider ${isMoving ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {isMoving ? 'Moving' : 'Idle'}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-wider text-slate-400 border-slate-200">Offline</Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2 truncate">{v.attributes.make} {v.attributes.model} ({v.attributes.year})</div>

                                        {loc && (
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600 bg-white border border-slate-100 rounded-md p-2 shadow-sm">
                                                <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-indigo-400" /> {loc.speed || 0} km/h</span>
                                                <span className="flex items-center gap-1"><Navigation className="w-3 h-3 text-slate-400" style={{ transform: `rotate(${loc.heading || 0}deg)` }} /> {loc.heading || 0}&deg;</span>
                                                {/* Mock distance/fuel for UI flair */}
                                                <span className="text-slate-400 ml-auto">{format(new Date(loc.timestamp), 'HH:mm')}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=6.5244,3.3792&zoom=11&size=1600x1200&sensor=false&style=feature:all|element:labels.text.fill|color:0x333333&style=feature:landscape|element:all|color:0xf5f5f5&style=feature:poi|element:all|visibility:off&style=feature:road.highway|element:geometry|color:0xffffff&style=feature:road.arterial|element:geometry|color:0xffffff&style=feature:water|element:geometry|color:0xc2e5ff')] bg-cover bg-center">

                {/* Visual overlay gradient */}
                <div className="absolute inset-0 bg-slate-300/20 pointer-events-none" />

                {/* Simulated markers if no react-leaflet */}
                {Object.keys(locations).map(vId => {
                    const loc = locations[vId]
                    if (!loc) return null
                    const v = vehicles.find(v => String(v.id) === String(vId))
                    if (!v) return null

                    const isSelected = selectedVehicle?.id === v.id
                    const isMoving = loc.status === 'moving' || loc.speed > 0

                    // Generate pseudo random position based on actual lat/lng relative to Lagos (6.52, 3.37)
                    // For demo purposes, we extrapolate a CSS position since we don't have a real map engine initialized
                    const topPos = 40 + (6.5244 - loc.lat) * 500
                    const leftPos = 50 + (loc.lng - 3.3792) * 500

                    return (
                        <div
                            key={vId}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-700 ease-in-out z-10`}
                            style={{
                                top: `${Math.max(10, Math.min(90, topPos))}%`,
                                left: `${Math.max(10, Math.min(90, leftPos))}%`
                            }}
                            onClick={() => setSelectedVehicle(v)}
                        >
                            <div className="relative group">
                                <div className={`w-8 h-8 rounded-full shadow-lg border-2 flex items-center justify-center transition-transform ${isSelected ? 'scale-125 border-indigo-600 bg-indigo-500 z-20' : isMoving ? 'border-emerald-500 bg-emerald-400' : 'border-amber-500 bg-amber-400'}`}>
                                    <Truck className={`w-4 h-4 text-white`} style={{ transform: `rotate(${loc.heading || 0}deg)` }} />
                                </div>

                                {/* Ping ripple for moving vehicles */}
                                {isMoving && !isSelected && (
                                    <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                                )}

                                {/* Hover tooltip */}
                                <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max bg-slate-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-md shadow-xl transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'}`}>
                                    {v.attributes.registration_number || v.attributes.display_number} &bull; {loc.speed} km/h
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900" />
                                </div>
                            </div>
                        </div>
                    )
                })}

                {/* Selected Vehicle Info Card Overlay */}
                {selectedVehicle && (
                    <div className="absolute bottom-6 left-6 right-6 xl:right-auto xl:w-[400px] z-30 animate-in slide-in-from-bottom-5">
                        <Card className="shadow-2xl border-0 overflow-hidden">
                            <div className="h-12 bg-slate-900 px-4 flex items-center justify-between">
                                <div className="font-bold text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-indigo-400" />
                                    {selectedVehicle.attributes.registration_number || selectedVehicle.attributes.display_number}
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800" asChild>
                                    <Link href={`/vehicles/${selectedVehicle.id}`}>View Details</Link>
                                </Button>
                            </div>
                            <CardContent className="p-0">
                                {locations[selectedVehicle.id] ? (
                                    <div className="p-4 grid grid-cols-2 gap-4 bg-white/95 backdrop-blur">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Speed</p>
                                            <p className="text-2xl font-black text-slate-900">
                                                {locations[selectedVehicle.id].speed} <span className="text-sm font-semibold text-slate-500">km/h</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Direction</p>
                                            <p className="text-2xl font-black text-slate-900 flex items-center gap-1">
                                                {locations[selectedVehicle.id].heading}&deg;
                                                <Navigation className="w-4 h-4 text-slate-400" style={{ transform: `rotate(${locations[selectedVehicle.id].heading}deg)` }} />
                                            </p>
                                        </div>
                                        <div className="col-span-2 pt-3 border-t border-slate-100 text-sm text-slate-600 flex items-start gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                            <span className="font-medium">{locations[selectedVehicle.id].lat.toFixed(6)}, {locations[selectedVehicle.id].lng.toFixed(6)}</span>
                                        </div>
                                        <div className="col-span-2 text-xs text-slate-400 mt-1 pl-6">
                                            Last transmitted: {format(new Date(locations[selectedVehicle.id].timestamp), 'MMM dd, HH:mm:ss a')}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-white/95 backdrop-blur">
                                        <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                        <p className="font-medium text-slate-900">No Signal Detected</p>
                                        <p className="text-sm text-slate-500 mt-1">Telemetry endpoint has not broadcasted any location packets for this vehicle recently.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Map Controls placeholder */}
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    <Button variant="secondary" size="icon" className="shadow-lg bg-white/90 backdrop-blur hover:bg-white"><Layers className="w-4 h-4" /></Button>
                    <div className="bg-white/90 backdrop-blur shadow-lg rounded-md overflow-hidden flex flex-col">
                        <button className="w-10 h-10 flex items-center justify-center border-b border-slate-100 hover:bg-slate-50 text-slate-600 font-bold text-lg">+</button>
                        <button className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 text-slate-600 font-bold text-lg">-</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
