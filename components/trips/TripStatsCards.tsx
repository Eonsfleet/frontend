'use client'

import React from 'react'
import { MapPin, Gauge, Navigation } from 'lucide-react'

interface TripStatsCardsProps {
    currentLocation?: string
    avgSpeed?: number
    distanceCovered?: number
    distanceRemaining?: number
}

export function TripStatsCards({ 
    currentLocation = 'Unknown',
    avgSpeed = 0,
    distanceCovered = 0,
    distanceRemaining = 0
}: TripStatsCardsProps) {
    const stats = [
        {
            icon: MapPin,
            label: 'Current Location',
            value: currentLocation,
        },
        {
            icon: Gauge,
            label: 'Avg. Speed',
            value: `${avgSpeed}km/hr`,
        },
        {
            icon: Navigation,
            label: 'Kilometers left',
            value: `${distanceCovered} km`,
        },
        {
            icon: Navigation,
            label: 'Kilometers left',
            value: `${distanceRemaining} km`,
        },
    ]

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <stat.icon className="h-10 w-10 text-slate-700" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-bold text-slate-900 mb-0.5">{stat.value}</p>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
