'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Truck, Gauge, Droplet, Calendar, Hash, Palette, Wrench } from 'lucide-react'
import { format } from 'date-fns'
import type { VehicleOdometer } from '@/types/odometer'
import { OdometerValue } from '@/components/odometer/OdometerBadge'
import { summariseOdometer } from '@/lib/odometer'

interface TripVehicleInfoProps {
    vehicle?: {
        id?: string | number
        attributes?: {
            make?: string
            model?: string
            image?: string
            year?: string | number
            registration_number?: string
            display_number?: string
            chasis_number?: string
            body_type?: string
            type?: string
            color?: string
            device_id?: string
            status?: string | null
            device_status?: string | null
            is_online?: boolean
            device_connected?: boolean
            is_allocated?: boolean
            last_packet_received_at?: string | null
            fuel_type?: string
            fuel_capacity?: number
            fuel_capacity_unit?: string
            fuel_sensor_conversion_factor?: number | null
            odometer?: VehicleOdometer | null
            tire_psi?: number | null
            gvm?: number | null
            created_at?: string
            updated_at?: string
        }
        relationships?: {
            device?: any
            current_driver?: any[]
        }
    } | null | undefined
}

export function TripVehicleInfo({ vehicle }: TripVehicleInfoProps) {
    if (!vehicle || !vehicle.attributes) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <p className="text-slate-500">No vehicle assigned to this trip</p>
            </div>
        )
    }

    const vehicleName = `${vehicle.attributes.make || ''} ${vehicle.attributes.model || ''}`.trim() || 'Unknown Vehicle'
    
    const formatDate = (date?: string | null) => {
        if (!date) return 'N/A'
        try {
            return format(new Date(date), 'MMM dd, yyyy')
        } catch {
            return 'N/A'
        }
    }

    const getStatusColor = (isOnline?: boolean) => {
        return isOnline 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-700 border-slate-200'
    }
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Vehicle Header */}
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 rounded-lg ring-4 ring-slate-100">
                    <AvatarImage src={vehicle.attributes.image} className="object-cover" />
                    <AvatarFallback className="bg-slate-100 text-slate-600 rounded-lg">
                        <Truck className="h-10 w-10" />
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-xl font-bold text-slate-900">{vehicleName}</p>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${getStatusColor(vehicle.attributes.is_online)}`}>
                            {vehicle.attributes.is_online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">{vehicle.attributes.registration_number}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                        {vehicle.attributes.type} • {vehicle.attributes.body_type}
                    </p>
                </div>
            </div>

            {/* Vehicle Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Device ID */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Hash className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Device ID</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium font-mono">
                        {vehicle.attributes.device_id || 'N/A'}
                    </p>
                </div>

                {/* Chassis Number */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Wrench className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Chassis Number</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium font-mono">
                        {vehicle.attributes.chasis_number || 'N/A'}
                    </p>
                </div>

                {/* Current Odometer */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Gauge className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Odometer</span>
                    </div>
                    <OdometerValue odometer={vehicle.attributes.odometer} />
                </div>

                {/* Color */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Palette className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Color</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium capitalize">
                        {vehicle.attributes.color || 'N/A'}
                    </p>
                </div>

                {/* Year */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Year</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium">
                        {vehicle.attributes.year || 'N/A'}
                    </p>
                </div>

                {/* Display Number */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Hash className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Display Number</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium font-mono">
                        {vehicle.attributes.display_number || 'N/A'}
                    </p>
                </div>

                {/* Fuel Type */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Droplet className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Fuel Type</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium capitalize">
                        {vehicle.attributes.fuel_type || 'N/A'}
                    </p>
                </div>

                {/* Fuel Capacity */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Droplet className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Fuel Capacity</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium">
                        {vehicle.attributes.fuel_capacity 
                            ? `${vehicle.attributes.fuel_capacity} ${vehicle.attributes.fuel_capacity_unit || 'L'}` 
                            : 'N/A'}
                    </p>
                </div>

                {/* Lifetime Odometer */}
                {summariseOdometer(vehicle.attributes.odometer).lifetime && (
                    <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Gauge className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Lifetime Odometer</span>
                        </div>
                        <OdometerValue odometer={vehicle.attributes.odometer} />
                    </div>
                )}
            </div>
        </div>
    )
}
