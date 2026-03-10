'use client'

import { useEffect, useState } from 'react'
import {
    X,
    Zap,
    Gauge,
    Fuel,
    Thermometer,
    Activity,
    Navigation,
    MapPin,
    AlertTriangle,
    Shield,
    Leaf,
    Satellite,
    Droplets,
    RotateCcw,
    Signal,
    Battery
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import * as trackingApi from '@/lib/api/tracking'
import { reverseGeocode } from '@/lib/gps'
import { useVehicleTelemetry } from '@/hooks/useVehicleTelemetry'

interface TelemetryDrawerProps {
    isOpen: boolean
    onClose: () => void
    vehicleId: string | number | null
    vehicle: {
        plate: string
        make?: string
        model?: string
        speed: number
        fuel: number
        fuel_liters?: number
        temp: number
        status: string
        voltage?: number | string
        ext_voltage?: number | string
        signal: string
        ignition?: boolean
        odometer?: number
        lat?: number
        lng?: number
        lastUpdate?: string
        address?: string
        heading?: number
        rpm?: number
        fuel_rate?: number
        eco_score?: number
        idling?: boolean
        jamming?: boolean
        immobilizer?: boolean
        driving_state?: string
    } | null
}

export function TelemetryDrawer({ isOpen, onClose, vehicleId, vehicle }: TelemetryDrawerProps) {
    const [address, setAddress] = useState<string>('Searching...')

    const { data: sensorData, isLoading: isLoadingSensors } = useQuery({
        queryKey: ['sensor-health', vehicleId],
        queryFn: () => trackingApi.getVehicleSensorHealth(vehicleId!),
        enabled: isOpen && !!vehicleId
    })

    const { telemetry } = useVehicleTelemetry(vehicleId as string, (vehicle as any)?.device_id)

    useEffect(() => {
        // Prefer backend-resolved address from telemetry; fall back to reverse geocode
        if (vehicle?.address) {
            setAddress(vehicle.address)
        } else if (isOpen && vehicle?.lat && vehicle?.lng) {
            setAddress('Geocoding...')
            reverseGeocode(vehicle.lat, vehicle.lng).then(setAddress)
        }
    }, [isOpen, vehicle?.address, vehicle?.lat, vehicle?.lng])

    if (!vehicle) return null

    // Prefer live WS telemetry > prop data
    const liveSpeed = telemetry?.speed ?? vehicle.speed
    const liveFuel = telemetry?.fuel_level_percent ?? vehicle.fuel
    const liveFuelLiters = (telemetry as any)?.fuel_level_liters ?? vehicle.fuel_liters
    const liveIgnition = telemetry ? (telemetry.ignition === 'on') : vehicle.ignition
    const liveOdo = telemetry?.odometer ?? vehicle.odometer
    const liveHeading = telemetry?.heading ?? vehicle.heading ?? 0
    const liveRpm = (telemetry as any)?.metadata?.engine_rpm ?? vehicle.rpm
    const liveFuelRate = (telemetry as any)?.metadata?.fuel_rate_gps ?? vehicle.fuel_rate
    const liveEcoScore = (telemetry as any)?.metadata?.eco_score ?? vehicle.eco_score
    const liveIdling = (telemetry as any)?.metadata?.idling ?? vehicle.idling ?? false
    const liveJamming = (telemetry as any)?.metadata?.jamming ?? vehicle.jamming ?? false
    const liveImmobilizer = (telemetry as any)?.metadata?.immobilizer ?? vehicle.immobilizer ?? false
    const liveDrivingState = (telemetry as any)?.metadata?.driving_state ?? vehicle.driving_state
    const liveSatellites = telemetry?.satellites ?? null
    const liveBatteryV = (telemetry as any)?.metadata?.battery_voltage ?? vehicle.voltage
    const liveExtV = (telemetry as any)?.metadata?.external_voltage ?? vehicle.ext_voltage

    const health = sensorData?.data || {
        battery_voltage: liveBatteryV || '---',
        signal_strength: liveSatellites != null ? `${liveSatellites} Sats` : vehicle.signal || '---',
        engine_temp: (telemetry as any)?.metadata?.engine_temperature || vehicle.temp || 0,
        obd_status: liveDrivingState || '---'
    }

    const fuelColor = liveFuel < 20 ? 'bg-rose-500' : liveFuel < 40 ? 'bg-amber-500' : 'bg-emerald-500'
    const ecoColor = liveEcoScore == null ? '' : liveEcoScore >= 70 ? 'text-emerald-600' : liveEcoScore >= 40 ? 'text-amber-600' : 'text-rose-600'
    const ecoRingColor = liveEcoScore == null ? '#e2e8f0' : liveEcoScore >= 70 ? '#16a34a' : liveEcoScore >= 40 ? '#d97706' : '#dc2626'
    const batteryWarn = liveBatteryV != null && Number(liveBatteryV) < 11.8

    const compassLabel = (deg: number) => {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        return dirs[Math.round(deg / 45) % 8]
    }

    return (
        <div className={cn(
            "fixed inset-y-0 right-0 z-50 w-[420px] bg-white shadow-2xl transition-all duration-500 transform flex flex-col",
            isOpen ? "translate-x-0" : "translate-x-full"
        )}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">
                        Asset <span className="text-blue-600">Telemetry</span>
                    </h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {vehicle.plate} {vehicle.make ? `· ${vehicle.make} ${vehicle.model}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {vehicle.status === 'offline' ? (
                        <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-100 text-rose-600">OFFLINE</span>
                    ) : (
                        <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600">ONLINE</span>
                    )}
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-full hover:bg-white flex items-center justify-center text-slate-400 transition-colors shadow-sm"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Live Position */}
                <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Live Position</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 leading-snug mb-2">{address}</h4>
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {vehicle.lat?.toFixed(6)}, {vehicle.lng?.toFixed(6)}
                        </p>
                        {liveSatellites != null && (
                            <div className="flex items-center gap-1 text-blue-500">
                                <Satellite className="h-3 w-3" />
                                <span className="text-[9px] font-black">{liveSatellites} Sats</span>
                            </div>
                        )}
                    </div>
                    {vehicle.lastUpdate && (
                        <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                            Last update: {new Date(vehicle.lastUpdate).toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {/* Alert Badges */}
                {(liveJamming || liveImmobilizer || liveIdling) && (
                    <div className="flex flex-wrap gap-2">
                        {liveJamming && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                                <AlertTriangle className="h-3 w-3" /> JAMMING
                            </span>
                        )}
                        {liveImmobilizer && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                                <Shield className="h-3 w-3" /> IMMOBILIZER
                            </span>
                        )}
                        {liveIdling && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                                <Activity className="h-3 w-3" /> IDLING
                            </span>
                        )}
                    </div>
                )}

                {/* Motion Data */}
                <div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Navigation className="h-3 w-3" /> Motion Data
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Speed */}
                        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center text-center col-span-2">
                            <Gauge className="h-5 w-5 text-blue-400 mb-1" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Velocity</span>
                            <div className="text-3xl font-black italic mt-1">{liveSpeed}<span className="text-xs text-slate-500 ml-1">KPH</span></div>
                        </div>
                        {/* Heading */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
                            <Navigation className="h-4 w-4 text-slate-400 mb-1" style={{ transform: `rotate(${liveHeading}deg)` }} />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Heading</span>
                            <div className="text-lg font-black italic text-slate-900 mt-0.5">{compassLabel(liveHeading)}</div>
                            <div className="text-[9px] text-slate-400">{liveHeading}°</div>
                        </div>
                        {/* Ignition */}
                        <div className={cn(
                            "p-4 rounded-2xl border flex flex-col items-center justify-center text-center",
                            liveIgnition ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                        )}>
                            <Zap className={cn("h-4 w-4 mb-1", liveIgnition ? "text-emerald-500" : "text-slate-400")} />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ignition</span>
                            <div className={cn("text-base font-black italic mt-0.5", liveIgnition ? "text-emerald-700" : "text-slate-400")}>
                                {liveIgnition ? 'ON' : 'OFF'}
                            </div>
                        </div>
                        {/* Movement / Driving State */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center col-span-2">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Driving State</span>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                liveDrivingState === 'normal' ? "bg-emerald-100 text-emerald-700" :
                                liveDrivingState === 'harsh' ? "bg-rose-100 text-rose-700" :
                                "bg-slate-200 text-slate-600"
                            )}>
                                {liveDrivingState || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Fuel & Engine */}
                <div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Fuel className="h-3 w-3" /> Fuel & Engine
                    </h3>
                    <div className="space-y-3">
                        {/* Fuel bar */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fuel Level</span>
                                <span className="text-sm font-black text-slate-900 italic">{liveFuel}%
                                    {liveFuelLiters != null && <span className="text-[10px] text-slate-400 ml-1 font-sans not-italic">({liveFuelLiters.toFixed(1)} L)</span>}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all duration-500", fuelColor)} style={{ width: `${Math.min(liveFuel, 100)}%` }} />
                            </div>
                            {liveFuel < 20 && <p className="text-[8px] text-rose-500 font-black mt-1 uppercase tracking-widest">⚠ Low fuel</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-white border border-slate-100">
                                <Droplets className="h-4 w-4 text-blue-400 mb-2" />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fuel Rate</span>
                                <div className="text-sm font-black text-slate-900 mt-0.5">
                                    {liveFuelRate != null ? `${liveFuelRate.toFixed(1)} L/100km` : '---'}
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white border border-slate-100">
                                <RotateCcw className="h-4 w-4 text-orange-400 mb-2" />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Engine RPM</span>
                                <div className="text-sm font-black text-slate-900 mt-0.5">
                                    {liveRpm != null ? liveRpm.toLocaleString() : '---'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-white border border-slate-100">
                                <Thermometer className={cn("h-4 w-4 mb-2", (health.engine_temp || 0) > 105 ? "text-rose-500" : "text-orange-400")} />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Engine Temp</span>
                                <div className={cn("text-sm font-black mt-0.5", (health.engine_temp || 0) > 105 ? "text-rose-600" : "text-slate-900")}>
                                    {isLoadingSensors ? '...' : `${health.engine_temp || vehicle.temp}°C`}
                                    {(health.engine_temp || 0) > 105 && <span className="text-[8px] text-rose-500 ml-1">HIGH</span>}
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white border border-slate-100">
                                <Gauge className="h-4 w-4 text-slate-400 mb-2" />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Odometer</span>
                                <div className="text-sm font-black text-slate-900 mt-0.5">
                                    {liveOdo != null ? `${liveOdo.toLocaleString()} km` : '---'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Electrical */}
                <div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Battery className="h-3 w-3" /> Electrical
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className={cn("p-4 rounded-2xl border", batteryWarn ? "bg-rose-50 border-rose-200" : "bg-white border-slate-100")}>
                            <Battery className={cn("h-4 w-4 mb-2", batteryWarn ? "text-rose-500" : "text-slate-400")} />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Battery</span>
                            <div className={cn("text-sm font-black mt-0.5", batteryWarn ? "text-rose-600" : "text-slate-900")}>
                                {liveBatteryV != null ? `${liveBatteryV}V` : '---'}
                                {batteryWarn && <span className="text-[8px] text-rose-500 ml-1">LOW</span>}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-100">
                            <Zap className="h-4 w-4 text-slate-400 mb-2" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ext. Voltage</span>
                            <div className="text-sm font-black text-slate-900 mt-0.5">
                                {liveExtV != null ? `${liveExtV}V` : '---'}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-100">
                            <Signal className="h-4 w-4 text-slate-400 mb-2" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Signal</span>
                            <div className="text-sm font-black text-slate-900 mt-0.5">
                                {isLoadingSensors ? '...' : health.signal_strength}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-100">
                            <Activity className="h-4 w-4 text-slate-400 mb-2" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">OBD Status</span>
                            <div className="text-sm font-black text-slate-900 mt-0.5 capitalize">
                                {isLoadingSensors ? '...' : (health.obd_status || '---')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Eco Score */}
                {liveEcoScore != null && (
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-5">
                        <div className="relative shrink-0">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="15.9" fill="none"
                                    stroke={ecoRingColor} strokeWidth="3"
                                    strokeDasharray={`${liveEcoScore} 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={cn("text-base font-black", ecoColor)}>{liveEcoScore}</span>
                            </div>
                        </div>
                        <div>
                            <Leaf className={cn("h-4 w-4 mb-1", ecoColor)} />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Eco Score</p>
                            <p className={cn("text-sm font-black", ecoColor)}>
                                {liveEcoScore >= 70 ? 'Efficient' : liveEcoScore >= 40 ? 'Average' : 'Poor'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 space-y-2 shrink-0">
                <button className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                    IMMOBILIZE ENGINE
                </button>
                <button className="w-full py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    SEND COMMAND OVERRIDE
                </button>
            </div>
        </div>
    )
}
