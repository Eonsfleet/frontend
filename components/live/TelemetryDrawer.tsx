'use client'

import React, { useEffect, useState } from 'react'
import {
    X,
    Zap,
    Gauge,
    Fuel,
    Thermometer,
    Activity,
    Navigation,
    Signal,
    Cpu,
    Battery,
    MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import * as trackingApi from '@/lib/api/tracking'
import { reverseGeocode } from '@/lib/gps'

interface TelemetryDrawerProps {
    isOpen: boolean
    onClose: () => void
    vehicleId: string | number | null
    vehicle: {
        plate: string
        speed: number
        fuel: number
        temp: number
        status: string
        voltage: string
        signal: string
        ignition?: boolean
        odometer?: number
        lat?: number
        lng?: number
        lastUpdate?: string
    } | null
}

export function TelemetryDrawer({ isOpen, onClose, vehicleId, vehicle }: TelemetryDrawerProps) {
    const [address, setAddress] = useState<string>('Searching...')

    const { data: sensorData, isLoading: isLoadingSensors } = useQuery({
        queryKey: ['sensor-health', vehicleId],
        queryFn: () => trackingApi.getVehicleSensorHealth(vehicleId!),
        enabled: isOpen && !!vehicleId
    })

    useEffect(() => {
        if (isOpen && vehicle?.lat && vehicle?.lng) {
            setAddress('Geocoding...')
            reverseGeocode(vehicle.lat, vehicle.lng).then(setAddress)
        }
    }, [isOpen, vehicle?.lat, vehicle?.lng])

    if (!vehicle) return null

    const health = sensorData?.data || {
        battery_voltage: '---',
        signal_strength: '---',
        engine_temp: 0,
        obd_status: '---'
    }

    return (
        <div className={cn(
            "fixed inset-y-0 right-0 z-50 w-[400px] bg-white shadow-2xl transition-all duration-500 transform",
            isOpen ? "translate-x-0" : "translate-x-full"
        )}>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                            Asset <span className="text-blue-600">Telemetry</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Real-time sensor stream: {vehicle.plate}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-10 w-10 rounded-full hover:bg-white flex items-center justify-center text-slate-400 transition-colors shadow-sm"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Location Card */}
                    <div className="p-6 rounded-[32px] bg-blue-50 border border-blue-100 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Current Position</span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 leading-tight mb-2">
                                {address}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {vehicle.lat?.toFixed(4)}, {vehicle.lng?.toFixed(4)}
                            </p>
                        </div>
                    </div>

                    {/* Primary Gauges Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col items-center justify-center text-center group">
                            <Gauge className="h-5 w-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Velocity</span>
                            <div className="text-3xl font-black italic mt-1">{vehicle.speed}<span className="text-xs text-slate-500 ml-1">KPH</span></div>
                        </div>
                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center group">
                            <Fuel className="h-5 w-5 text-rose-500 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fuel Level</span>
                            <div className="text-3xl font-black italic mt-1 text-slate-900">{vehicle.fuel}<span className="text-xs text-slate-400 ml-1">%</span></div>
                        </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Cpu className="h-3 w-3" />
                            Onboard Diagnostics (OBD)
                        </h3>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                                        <Thermometer className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Engine Temp</p>
                                        <h4 className="text-sm font-black text-slate-700">{isLoadingSensors ? '...' : (health.engine_temp || vehicle.temp)}°C</h4>
                                    </div>
                                </div>
                                <Activity className="h-4 w-4 text-slate-200 group-hover:text-blue-500 transition-colors" />
                            </div>

                            <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                                        vehicle.ignition ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                                    )}>
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ignition</p>
                                        <h4 className="text-sm font-black text-slate-700">{vehicle.ignition ? 'ON' : 'OFF'}</h4>
                                    </div>
                                </div>
                                <div className={cn("h-2 w-2 rounded-full", vehicle.ignition ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                            </div>

                            <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                                        <Gauge className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Odometer</p>
                                        <h4 className="text-sm font-black text-slate-700">{vehicle.odometer?.toLocaleString() || '---'} <span className="text-[10px] text-slate-400">km</span></h4>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Voltage / Signal</p>
                                        <h4 className="text-sm font-black text-slate-700">
                                            {isLoadingSensors ? '...' : `${health.battery_voltage}V / ${health.signal_strength}`}
                                        </h4>
                                    </div>
                                </div>
                                <Navigation className="h-4 w-4 text-slate-200" />
                            </div>
                        </div>
                    </div>

                    {/* Operational Status */}
                    <div className="p-6 rounded-[32px] bg-slate-900 border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Navigation className="h-20 w-20 text-blue-500 -rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <Activity className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Mission Tracker</span>
                            </div>
                            <h4 className="text-lg font-black text-white uppercase italic leading-tight mb-6">
                                {vehicle.status === 'in_transit' ? 'Mission En-route' : 'Awaiting Deployment'}
                            </h4>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Arrival</p>
                                    <p className="text-base font-black text-white italic">14:45 <span className="text-[10px] text-slate-400 ml-1 font-sans not-italic">PM</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Distance To</p>
                                    <p className="text-base font-black text-blue-400 italic">4.2 <span className="text-[10px] text-slate-400 ml-1 font-sans not-italic">KM</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-slate-100 space-y-3">
                    <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                        IMMOBILIZE ENGINE
                    </button>
                    <button className="w-full py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                        SEND COMMAND OVERRIDE
                    </button>
                </div>
            </div>
        </div>
    )
}
