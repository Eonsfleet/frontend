'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Truck } from 'lucide-react'

interface TripVehicleInfoProps {
    vehicle?: {
        id?: string | number
        name?: string
        registration_number?: string
        device_id?: string
        chassis_number?: string
        vin?: string
        mileage?: number
        odometer?: number
        color?: string
        make?: string
        manufacturer?: string
        region?: string
        year?: number
        display_number?: string
        model?: string
        fuel_type?: string
        avatar?: string
        image?: string
    }
}

export function TripVehicleInfo({ vehicle }: TripVehicleInfoProps) {
    if (!vehicle) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <p className="text-slate-500">No vehicle assigned to this trip</p>
            </div>
        )
    }

    const vehicleName = vehicle.name || `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Unknown Vehicle'
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Vehicle Header */}
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage src={vehicle.avatar || vehicle.image} />
                    <AvatarFallback className="bg-slate-100 text-slate-600 rounded-lg">
                        <Truck className="h-8 w-8" />
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm text-slate-500 mb-1">Vehicle Name</p>
                    <p className="text-lg font-semibold text-slate-900">{vehicleName}</p>
                </div>
            </div>

            {/* Vehicle Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
                {/* Device ID */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Device ID</p>
                    <p className="text-slate-900 font-semibold">{vehicle.device_id || 'N/A'}</p>
                </div>

                {/* Chasis Number */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Chasis Number</p>
                    <p className="text-slate-900 font-semibold">{vehicle.chassis_number || vehicle.vin || 'N/A'}</p>
                </div>

                {/* Mileage */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Mileage</p>
                    <p className="text-slate-900 font-semibold">
                        {vehicle.mileage || vehicle.odometer ? `${(vehicle.mileage || vehicle.odometer)?.toLocaleString()} KM` : 'N/A'}
                    </p>
                </div>

                {/* Color */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Color</p>
                    <p className="text-slate-900 font-semibold capitalize">{vehicle.color || 'N/A'}</p>
                </div>

                {/* Registration Number */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Registration Number</p>
                    <p className="text-slate-900 font-semibold">{vehicle.registration_number || 'N/A'}</p>
                </div>

                {/* Vehicle Make */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Vehicle Make</p>
                    <p className="text-slate-900 font-semibold capitalize">{vehicle.make || vehicle.manufacturer || 'N/A'}</p>
                </div>

                {/* Region */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Region</p>
                    <p className="text-slate-900 font-semibold">{vehicle.region || 'N/A'}</p>
                </div>

                {/* Year */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Year</p>
                    <p className="text-slate-900 font-semibold">{vehicle.year || 'N/A'}</p>
                </div>

                {/* Display Number */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Display Number</p>
                    <p className="text-slate-900 font-semibold">{vehicle.display_number || 'N/A'}</p>
                </div>

                {/* Model */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Model</p>
                    <p className="text-slate-900 font-semibold capitalize">{vehicle.model || 'N/A'}</p>
                </div>

                {/* Fuel Type */}
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Fuel Type</p>
                    <p className="text-slate-900 font-semibold capitalize">{vehicle.fuel_type || 'N/A'}</p>
                </div>
            </div>
        </div>
    )
}
