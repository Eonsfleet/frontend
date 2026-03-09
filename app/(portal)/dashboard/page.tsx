'use client'

import { StatCard } from '@/components/dashboard/StatCard'
import { VehicleStatusChart } from '@/components/dashboard/VehicleStatusChart'
import { DashboardMap } from '@/components/dashboard/DashboardMap'
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/ActivityFeed'
import { AlertsPanel, AlertItem } from '@/components/dashboard/AlertsPanel'
import { MaintenanceHeatmap, MaintenanceDay } from '@/components/dashboard/MaintenanceHeatmap'
import { FleetOverviewModal } from '@/components/dashboard/FleetOverviewModal'
import { Car, Route, AlertTriangle, Zap } from 'lucide-react'
import { addDays, startOfToday } from 'date-fns'
import { cn } from '@/lib/utils'
import React, { useState } from 'react'

// Enhanced Dummy Data for visual demonstration
const vehicleStatusData = [
    { name: 'Active', value: 112, color: '#10b981' }, // emerald-500
    { name: 'Idle', value: 8, color: '#f59e0b' },    // amber-500
    { name: 'Offline', value: 3, color: '#ef4444' },  // red-500
    { name: 'Maintenance', value: 1, color: '#3b82f6' } // blue-500
]

const deviceStatusData = [
    { name: 'Online', value: 118, color: '#10b981' }, // emerald-500
    { name: 'Offline', value: 6, color: '#ef4444' },   // red-500
]

const vehicleStats = [
    { label: 'Active', value: 112, color: 'bg-emerald-500' },
    { label: 'Idle', value: 8, color: 'bg-amber-500' },
    { label: 'Offline', value: 3, color: 'bg-rose-500' },
    { label: 'Maint.', value: 1, color: 'bg-blue-500' },
]

const alerts: AlertItem[] = [
    {
        id: 'a1',
        severity: 'critical',
        title: 'LND-123-XY Offline >2h',
        description: 'Tracking device heartbeat lost. Last reported near Victoria Island.',
        timestamp: '09:45 AM',
        location: 'Victoria Island, Lagos',
        actions: [
            { label: 'Ping Device', onClick: () => console.log('Pinged'), variant: 'secondary' },
            { label: 'Assign Tech', onClick: () => console.log('Assigned'), variant: 'outline' }
        ]
    },
    {
        id: 'a2',
        severity: 'critical',
        title: 'ABJ-567-ZZ Low Fuel <10%',
        description: 'Immediate refueling required to avoid trip disruption.',
        timestamp: '10:12 AM',
        location: 'Lekki Toll Plaza',
        actions: [
            { label: 'Alert Sent', onClick: () => { }, variant: 'outline' }
        ]
    },
    {
        id: 'a3',
        severity: 'warning',
        title: '5 Vehicles Due for Service',
        description: 'Maintenance window opening for Lagos Mainland cluster.',
        timestamp: '08:00 AM',
        actions: [
            { label: 'View Schedule', onClick: () => { } }
        ]
    }
]

const today = startOfToday()
const maintenanceForecast: MaintenanceDay[] = [
    { date: today, count: 2, vehicles: [{ id: '1', reg: 'LND-123-XY', service: 'Oil Change' }, { id: '2', reg: 'ABJ-567-ZZ', service: 'Tire Rotation' }] },
    { date: addDays(today, 1), count: 1, vehicles: [{ id: '3', reg: 'KAN-990-BC', service: 'Brake Check' }] },
    { date: addDays(today, 2), count: 0, vehicles: [] },
    {
        date: addDays(today, 3), count: 4, vehicles: [
            { id: '4', reg: 'LAG-101-PA', service: 'Annual Inspection' },
            { id: '5', reg: 'OGU-222-RT', service: 'Battery Replacement' },
            { id: '6', reg: 'EDO-555-WE', service: 'Engine Tune-up' },
            { id: '7', reg: 'DEL-444-QR', service: 'AC Service' }
        ]
    },
    { date: addDays(today, 4), count: 1, vehicles: [{ id: '8', reg: 'RIV-001-AA', service: 'Wheel Alignment' }] },
    {
        date: addDays(today, 5), count: 3, vehicles: [
            { id: '9', reg: 'ANA-333-TY', service: 'Transmission Flush' },
            { id: '10', reg: 'IMO-777-YU', service: 'Full Valet' },
            { id: '11', reg: 'ABI-888-OP', service: 'Brake Pad Replacement' }
        ]
    },
    { date: addDays(today, 6), count: 0, vehicles: [] },
]

const recentActivities: ActivityItem[] = [
    {
        id: 'act-1',
        type: 'incident',
        title: 'Harsh Braking Detected',
        description: 'Vehicle TRK-042 reported harsh braking on Route 66.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        status: 'pending',
        location: 'Ikoyi Link Bridge',
        actions: [{ label: 'View on Map', onClick: () => { } }, { label: 'Alert Driver', onClick: () => { } }]
    },
    {
        id: 'act-2',
        type: 'maintenance',
        title: 'Oil Change Completed',
        description: 'Scheduled maintenance for VAN-019 finished.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: 'completed',
        actions: [{ label: 'View Job Card', onClick: () => { } }]
    },
    {
        id: 'act-3',
        type: 'system',
        title: 'Geofence Exit: TRK-088',
        description: 'Vehicle departed the Central Warehouse Loading Zone.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        location: 'Lagos-Ibadan Exp',
        actions: [{ label: 'Acknowledge', onClick: () => { } }]
    },
]

const activeMapLocations = [
    { id: 'loc-1', name: 'TRK-042', lat: 34.0522, lng: -118.2437, status: 'moving' },
    { id: 'loc-2', name: 'VAN-019', lat: 41.8781, lng: -87.6298, status: 'idle' },
    { id: 'loc-3', name: 'TRK-088', lat: 40.7128, lng: -74.0060, status: 'moving' },
]

export default function DashboardPage() {
    const [isFleetModalOpen, setIsFleetModalOpen] = useState(false)

    return (
        <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        Dashboard
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Intelligent Operations Hub • Real-time Monitoring
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Vehicles"
                    value="124"
                    icon={Car}
                    stats={vehicleStats}
                    onDrillDown={() => setIsFleetModalOpen(true)}
                    trend={{ value: 12, label: 'vs last month', isPositive: true }}
                />
                <StatCard title="Active Trips" value="24" icon={Route} trend={{ value: 4, label: 'vs yesterday', isPositive: true }} />
                <StatCard title="Recent Incidents" value="3" icon={AlertTriangle} trend={{ value: 2, label: 'vs last week', isPositive: false }} />
                <StatCard title="Avg Efficiency" value="87%" icon={Zap} trend={{ value: 1.2, label: 'vs last week', isPositive: true }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <DashboardMap locations={activeMapLocations} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MaintenanceHeatmap data={maintenanceForecast} />
                        <VehicleStatusChart data={vehicleStatusData} />
                        <VehicleStatusChart
                            data={deviceStatusData}
                            title="Device Status"
                            description="GPS tracker heartbeat monitoring"
                        />
                    </div>
                </div>
                <div className="space-y-6">
                    <AlertsPanel alerts={alerts} />
                    <ActivityFeed activities={recentActivities} />
                </div>
            </div>

            <FleetOverviewModal
                isOpen={isFleetModalOpen}
                onClose={() => setIsFleetModalOpen(false)}
            />
        </div>
    )
}
