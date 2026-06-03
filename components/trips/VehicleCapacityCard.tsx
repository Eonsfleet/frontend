'use client'

import React from 'react'

interface VehicleCapacityCardProps {
    currentLoad: number
    maxLoad: number
    loadCategory?: string
    unit?: string
}

export function VehicleCapacityCard({ 
    currentLoad, 
    maxLoad, 
    loadCategory = 'General', 
    unit = 'lbs' 
}: VehicleCapacityCardProps) {
    const percentage = maxLoad > 0 ? Math.round((currentLoad / maxLoad) * 100) : 0

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">Vehicle Capacity</h3>
            
            <div className="relative mb-6">
                {/* Truck illustration with capacity bar */}
                <div className="flex items-center justify-center">
                    <svg viewBox="0 0 400 150" className="w-full max-w-md">
                        {/* Truck body */}
                        <rect x="80" y="40" width="280" height="80" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" rx="4" />
                        
                        {/* Capacity fill */}
                        <rect 
                            x="80" 
                            y="40" 
                            width={280 * (percentage / 100)} 
                            height="80" 
                            fill="#3b82f6" 
                            opacity="0.8"
                            rx="4"
                        />
                        
                        {/* Percentage text */}
                        <text 
                            x="220" 
                            y="90" 
                            textAnchor="middle" 
                            fill="white" 
                            fontSize="36" 
                            fontWeight="bold"
                            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                        >
                            {percentage}%
                        </text>
                        
                        {/* Truck cabin */}
                        <rect x="40" y="50" width="50" height="60" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" rx="4" />
                        <rect x="45" y="55" width="20" height="25" fill="#64748b" opacity="0.3" rx="2" />
                        
                        {/* Wheels */}
                        <circle cx="100" cy="125" r="12" fill="#1e293b" />
                        <circle cx="100" cy="125" r="6" fill="#475569" />
                        <circle cx="320" cy="125" r="12" fill="#1e293b" />
                        <circle cx="320" cy="125" r="6" fill="#475569" />
                    </svg>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Current Load Weight</span>
                    <span className="font-semibold text-slate-900">{currentLoad.toLocaleString()} {unit}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Max Load</span>
                    <span className="font-semibold text-slate-900">{maxLoad.toLocaleString()} {unit}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Load Category</span>
                    <span className="font-semibold text-slate-900">{loadCategory}</span>
                </div>
            </div>
        </div>
    )
}
