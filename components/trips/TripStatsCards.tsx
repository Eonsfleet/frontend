'use client'

import React from 'react'
import { MapPin, Gauge, TrendingUp, Route } from 'lucide-react'

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
            color: 'blue',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600',
            borderColor: 'border-blue-100'
        },
        {
            icon: Gauge,
            label: 'Avg. Speed',
            value: `${avgSpeed}km/hr`,
            color: 'emerald',
            bgColor: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            borderColor: 'border-emerald-100'
        },
        {
            icon: TrendingUp,
            label: 'Distance Covered',
            value: `${distanceCovered} km`,
            color: 'purple',
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600',
            borderColor: 'border-purple-100'
        },
        {
            icon: Route,
            label: 'Distance Left',
            value: `${distanceRemaining} km`,
            color: 'orange',
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-600',
            borderColor: 'border-orange-100'
        },
    ]

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">Trip Statistics</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((stat, index) => (
                    <div 
                        key={index} 
                        className={`flex items-center gap-3 p-3 rounded-lg border ${stat.borderColor} ${stat.bgColor} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group`}
                    >
                        <div className={`flex-shrink-0 h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{stat.label}</p>
                            <p className="text-xs font-bold text-slate-900 truncate">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
