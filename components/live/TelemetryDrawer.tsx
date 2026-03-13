'use client'

import { useEffect, useState } from 'react'
import {
    X, Zap, Gauge, Fuel, Thermometer, Activity, Navigation, MapPin,
    AlertTriangle, Shield, Leaf, Satellite, Droplets, RotateCcw,
    Signal, Battery, MountainSnow, ArrowUpDown, Radio, Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import * as trackingApi from '@/lib/api/tracking'
import { getVehicleCurrentFuel } from '@/lib/api/fuel'
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
        altitude?: number | null
        movement?: string | null
        device_id?: string | null
        imei?: string | null
    } | null
}

function StatTile({
    icon: Icon,
    label,
    value,
    unit,
    warn = false,
    highlight = false,
    className,
}: {
    icon: any
    label: string
    value: React.ReactNode
    unit?: string
    warn?: boolean
    highlight?: boolean
    className?: string
}) {
    return (
        <div className={cn(
            "p-4 rounded-2xl border flex flex-col gap-1",
            warn ? "bg-rose-50 border-rose-200" :
            highlight ? "bg-emerald-50 border-emerald-100" :
            "bg-white border-slate-100",
            className
        )}>
            <Icon className={cn("h-4 w-4", warn ? "text-rose-500" : highlight ? "text-emerald-500" : "text-slate-400")} />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className={cn("text-sm font-black mt-0.5", warn ? "text-rose-600" : highlight ? "text-emerald-700" : "text-slate-900")}>
                {value}{unit && <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">{unit}</span>}
            </div>
        </div>
    )
}

export function TelemetryDrawer({ isOpen, onClose, vehicleId, vehicle }: TelemetryDrawerProps) {
    const [address, setAddress] = useState<string>('Searching...')

    const { data: sensorData, isLoading: isLoadingSensors } = useQuery({
        queryKey: ['sensor-health', vehicleId],
        queryFn: () => trackingApi.getVehicleSensorHealth(vehicleId!),
        enabled: isOpen && !!vehicleId,
    })

    const { data: currentFuelData, isLoading: isFuelLoading } = useQuery({
        queryKey: ['vehicle-current-fuel', vehicleId],
        queryFn: () => getVehicleCurrentFuel(Number(vehicleId)),
        enabled: isOpen && !!vehicleId,
        refetchInterval: 30_000,
    })

    const { telemetry, deviceStatus } = useVehicleTelemetry(
        vehicleId as string,
        vehicle?.device_id,
        vehicle?.imei
    )

    useEffect(() => {
        const liveAddress = telemetry?.address ?? vehicle?.address
        if (liveAddress) {
            setAddress(liveAddress)
        } else if (isOpen) {
            const lat = telemetry?.latitude ?? vehicle?.lat
            const lng = telemetry?.longitude ?? vehicle?.lng
            if (lat && lng) {
                setAddress('Geocoding...')
                reverseGeocode(lat, lng).then(setAddress)
            }
        }
    }, [isOpen, telemetry?.address, telemetry?.latitude, telemetry?.longitude, vehicle?.address, vehicle?.lat, vehicle?.lng])

    if (!vehicle) return null

    // ── Resolved values: WS telemetry > prop fallback ──────────────────────
    const liveSpeed      = telemetry?.speed        ?? vehicle.speed
    const liveHeading    = telemetry?.heading       ?? vehicle.heading   ?? 0
    const liveIgnition   = telemetry ? telemetry.ignition === 'on' || telemetry.ignition === '1' : vehicle.ignition
    const liveMovement   = telemetry?.movement      ?? vehicle.movement
    const liveStatus     = telemetry?.status        ?? vehicle.status
    const liveLat        = telemetry?.latitude      ?? vehicle.lat
    const liveLng        = telemetry?.longitude     ?? vehicle.lng
    const liveAltitude   = telemetry?.altitude      ?? vehicle.altitude
    const liveSatellites = telemetry?.satellites    ?? null
    const liveOdo        = telemetry?.odometer      ?? vehicle.odometer
    const liveLastUpdate = telemetry?.gps_datetime  ?? vehicle.lastUpdate

    // Metadata fields (flattened by backend into top-level after normalization,
    // but raw WS packet keeps them under metadata — handle both)
    const meta           = telemetry?.metadata ?? {}
    const liveRpm        = meta.engine_rpm          ?? vehicle.rpm
    const liveFuelRate   = meta.fuel_rate_gps       ?? vehicle.fuel_rate
    const liveEcoScore   = meta.eco_score           ?? vehicle.eco_score
    const liveIdling     = meta.idling              ?? vehicle.idling   ?? false
    const liveJamming    = meta.jamming             ?? vehicle.jamming  ?? false
    const liveImmobilizer = meta.immobilizer        ?? vehicle.immobilizer ?? false
    const liveDrivingState = meta.driving_state     ?? vehicle.driving_state
    const liveBatteryV   = meta.battery_voltage     ?? vehicle.voltage
    const liveExtV       = meta.external_voltage    ?? vehicle.ext_voltage
    const liveEngineTemp = meta.engine_temperature  ?? vehicle.temp     ?? 0
    const liveRssi       = meta.rssi                ?? null
    const liveHdop       = meta.hdop                ?? null
    const liveMileage    = meta.mileage             ?? null

    // Fuel — API endpoint > WS telemetry > prop
    const apiFuel        = currentFuelData?.data?.fuel_level
    const liveFuel       = apiFuel?.fuel_level_percent ?? telemetry?.fuel_level_percent ?? vehicle.fuel
    const liveFuelLiters = apiFuel?.fuel_level_liters  ?? telemetry?.fuel_level_liters  ?? vehicle.fuel_liters
    const fuelTankCap    = apiFuel?.tank_capacity      ?? null
    const fuelQuality    = apiFuel?.data_quality_score ?? null
    const fuelLastUpdate = apiFuel?.last_updated       ?? null
    const deviceHasFuel  = currentFuelData?.data?.vehicle?.device_has_fuel ?? null

    // Device status from WS > vehicle status prop
    const isDeviceOnline = deviceStatus === 'online' ? true
                         : deviceStatus === 'offline' ? false
                         : vehicle.status !== 'offline'

    // ── Derived helpers ────────────────────────────────────────────────────
    const fuelColor    = (liveFuel ?? 0) < 20 ? 'bg-rose-500' : (liveFuel ?? 0) < 40 ? 'bg-amber-500' : 'bg-emerald-500'
    const ecoColor     = liveEcoScore == null ? '' : liveEcoScore >= 70 ? 'text-emerald-600' : liveEcoScore >= 40 ? 'text-amber-600' : 'text-rose-600'
    const ecoRingColor = liveEcoScore == null ? '#e2e8f0' : liveEcoScore >= 70 ? '#16a34a' : liveEcoScore >= 40 ? '#d97706' : '#dc2626'
    const batteryWarn  = liveBatteryV != null && Number(liveBatteryV) < 11.8
    const tempWarn     = liveEngineTemp > 105

    const compassLabel = (deg: number) => {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        return dirs[Math.round(deg / 45) % 8]
    }

    const statusLabel = (s: string) => {
        if (s === 'in_transit') return 'Moving'
        if (s === 'stopped' || s === 'parked') return 'Stopped'
        if (s === 'idle') return 'Idling'
        if (s === 'offline') return 'Offline'
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Online'
    }

    const statusPill = (s: string) => {
        if (!isDeviceOnline) return 'bg-rose-100 text-rose-600'
        if (s === 'in_transit') return 'bg-emerald-100 text-emerald-700'
        if (s === 'stopped' || s === 'parked') return 'bg-slate-200 text-slate-600'
        if (s === 'idle') return 'bg-amber-100 text-amber-700'
        return 'bg-blue-100 text-blue-700'
    }

    const health = sensorData?.data || {
        battery_voltage: liveBatteryV || '---',
        signal_strength: liveRssi != null ? `${liveRssi} dBm` : liveSatellites != null ? `${liveSatellites} Sats` : vehicle.signal || '---',
        engine_temp: liveEngineTemp,
        obd_status: liveDrivingState || '---',
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
                        {vehicle.plate}{vehicle.make ? ` · ${vehicle.make} ${vehicle.model}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", statusPill(liveStatus))}>
                        {isDeviceOnline ? statusLabel(liveStatus) : 'Offline'}
                    </span>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-full hover:bg-white flex items-center justify-center text-slate-400 transition-colors shadow-sm"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Alert Badges */}
                {(liveJamming || liveImmobilizer || liveIdling) && (
                    <div className="flex flex-wrap gap-2">
                        {liveJamming && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                                <AlertTriangle className="h-3 w-3" /> Jamming
                            </span>
                        )}
                        {liveImmobilizer && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                                <Shield className="h-3 w-3" /> Immobilizer
                            </span>
                        )}
                        {liveIdling && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                                <Activity className="h-3 w-3" /> Idling
                            </span>
                        )}
                    </div>
                )}

                {/* Live Position */}
                <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Live Position</span>
                        {liveSatellites != null && (
                            <div className="ml-auto flex items-center gap-1 text-blue-500">
                                <Satellite className="h-3 w-3" />
                                <span className="text-[9px] font-black">{liveSatellites} Sats</span>
                            </div>
                        )}
                    </div>
                    <h4 className="text-sm font-black text-slate-900 leading-snug mb-2">{address}</h4>
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold text-slate-500 font-mono">
                            {liveLat?.toFixed(6)}, {liveLng?.toFixed(6)}
                        </p>
                        {liveAltitude != null && (
                            <div className="flex items-center gap-1 text-blue-500">
                                <MountainSnow className="h-3 w-3" />
                                <span className="text-[9px] font-black">{liveAltitude.toFixed(0)} m</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        {liveLastUpdate && (
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(liveLastUpdate).toLocaleTimeString()}
                            </p>
                        )}
                        {liveHdop != null && (
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                HDOP {liveHdop}
                            </p>
                        )}
                    </div>
                </div>

                {/* Motion Data */}
                <div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Navigation className="h-3 w-3" /> Motion
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Speed — full width hero tile */}
                        <div className="col-span-2 p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                            <div>
                                <Gauge className="h-5 w-5 text-blue-400 mb-1" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Speed</span>
                                <div className="text-3xl font-black italic mt-1">
                                    {liveSpeed ?? 0}
                                    <span className="text-xs text-slate-500 ml-1">KPH</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <Navigation
                                    className="h-8 w-8 text-blue-400 ml-auto mb-2"
                                    style={{ transform: `rotate(${liveHeading}deg)` }}
                                />
                                <div className="text-lg font-black italic">{compassLabel(liveHeading)}</div>
                                <div className="text-[9px] text-slate-500">{liveHeading}°</div>
                            </div>
                        </div>

                        {/* Ignition */}
                        <StatTile
                            icon={Zap}
                            label="Ignition"
                            value={liveIgnition ? 'ON' : 'OFF'}
                            highlight={!!liveIgnition}
                        />

                        {/* Movement */}
                        <StatTile
                            icon={ArrowUpDown}
                            label="Movement"
                            value={liveMovement === 'on' ? 'Active' : liveMovement === 'off' ? 'Still' : '---'}
                            highlight={liveMovement === 'on'}
                        />

                        {/* Driving State */}
                        {liveDrivingState && (
                            <div className={cn(
                                "col-span-2 p-4 rounded-2xl border flex items-center justify-between",
                                liveDrivingState === 'harsh' ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"
                            )}>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Driving State</span>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                    liveDrivingState === 'normal' ? "bg-emerald-100 text-emerald-700" :
                                    liveDrivingState === 'harsh'  ? "bg-rose-100 text-rose-700" :
                                    "bg-slate-200 text-slate-600"
                                )}>
                                    {liveDrivingState}
                                </span>
                            </div>
                        )}

                        {/* Odometer */}
                        <StatTile
                            icon={Gauge}
                            label="Odometer"
                            value={liveOdo != null ? liveOdo.toLocaleString() : '---'}
                            unit={liveOdo != null ? 'km' : undefined}
                            className="col-span-2"
                        />

                        {/* Trip mileage (if available) */}
                        {liveMileage != null && (
                            <StatTile
                                icon={Navigation}
                                label="Trip Distance"
                                value={liveMileage.toLocaleString()}
                                unit="km"
                                className="col-span-2"
                            />
                        )}
                    </div>
                </div>

                {/* Fuel & Engine */}
                <div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Fuel className="h-3 w-3" /> Fuel & Engine
                        {isFuelLoading && <span className="text-[8px] text-slate-300 font-bold normal-case tracking-normal ml-1">refreshing...</span>}
                    </h3>
                    <div className="space-y-3">
                        {/* Fuel bar */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fuel Level</span>
                                <span className="text-sm font-black text-slate-900 italic">
                                    {liveFuel != null ? `${liveFuel}%` : '---'}
                                    {liveFuelLiters != null && (
                                        <span className="text-[10px] text-slate-400 ml-1 font-sans not-italic">
                                            ({liveFuelLiters.toFixed(1)} L{fuelTankCap ? ` / ${fuelTankCap} L` : ''})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-500", fuelColor)}
                                    style={{ width: `${Math.min(liveFuel ?? 0, 100)}%` }}
                                />
                            </div>
                            {liveFuel != null && liveFuel < 20 && (
                                <p className="text-[8px] text-rose-500 font-black mt-1 uppercase tracking-widest">⚠ Low fuel</p>
                            )}
                            {(fuelQuality != null || fuelLastUpdate != null) && (
                                <div className="flex items-center justify-between mt-2">
                                    {fuelQuality != null && (
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-widest",
                                            fuelQuality >= 80 ? "text-emerald-500" : fuelQuality >= 50 ? "text-amber-500" : "text-rose-500"
                                        )}>
                                            Quality {fuelQuality}%
                                        </span>
                                    )}
                                    {fuelLastUpdate && (
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(fuelLastUpdate).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                            )}
                            {deviceHasFuel === false && (
                                <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-widest">No fuel sensor on device</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <StatTile icon={Droplets} label="Fuel Rate" value={liveFuelRate != null ? `${liveFuelRate.toFixed(1)}` : '---'} unit={liveFuelRate != null ? 'L/100km' : undefined} />
                            <StatTile icon={RotateCcw} label="Engine RPM" value={liveRpm != null ? liveRpm.toLocaleString() : '---'} />
                            <StatTile icon={Thermometer} label="Engine Temp" value={`${liveEngineTemp}°C`} warn={tempWarn} />
                            <StatTile icon={Gauge} label="Altitude" value={liveAltitude != null ? `${liveAltitude.toFixed(0)}` : '---'} unit={liveAltitude != null ? 'm' : undefined} />
                        </div>
                    </div>
                </div>

                {/* Electrical & Signal */}
                <div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Battery className="h-3 w-3" /> Electrical & Signal
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <StatTile icon={Battery} label="Battery" value={liveBatteryV != null ? `${liveBatteryV}V` : '---'} warn={batteryWarn} />
                        <StatTile icon={Zap} label="Ext. Voltage" value={liveExtV != null ? `${liveExtV}V` : '---'} />
                        <StatTile
                            icon={Signal}
                            label="Signal"
                            value={isLoadingSensors ? '...' : liveRssi != null ? `${liveRssi} dBm` : health.signal_strength}
                        />
                        <StatTile
                            icon={Radio}
                            label="GPS Accuracy"
                            value={liveHdop != null ? `HDOP ${liveHdop}` : liveSatellites != null ? `${liveSatellites} Sats` : '---'}
                        />
                        <StatTile
                            icon={Activity}
                            label="OBD Status"
                            value={isLoadingSensors ? '...' : (health.obd_status || '---')}
                            className="col-span-2"
                        />
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
                    Immobilize Engine
                </button>
                <button className="w-full py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    Send Command Override
                </button>
            </div>
        </div>
    )
}
