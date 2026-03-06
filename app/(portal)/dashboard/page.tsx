'use client'

import { StatCard } from '@/components/dashboard/StatCard'
import { VehicleStatusChart } from '@/components/dashboard/VehicleStatusChart'
import { DashboardMap } from '@/components/dashboard/DashboardMap'
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/ActivityFeed'
import { UpcomingMaintenanceTable } from '@/components/dashboard/UpcomingMaintenanceTable'
import { Car, Route, AlertTriangle, BatteryCharging } from 'lucide-react'

// Dummy Data for visual demonstration
const vehicleStatusData = [
    { name: 'Active', value: 45, color: '#2563eb' }, // blue-600
    { name: 'Idle', value: 12, color: '#f59e0b' },   // amber-500
    { name: 'Maintenance', value: 8, color: '#ef4444' }, // red-500
    { name: 'Out of Service', value: 3, color: '#64748b' } // slate-500
]

const recentActivities: ActivityItem[] = [
    { id: '1', type: 'incident', title: 'Harsh Braking Detected', description: 'Vehicle TRK-042 reported harsh braking on Route 66.', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), status: 'pending' },
    { id: '2', type: 'maintenance', title: 'Oil Change Completed', description: 'Scheduled maintenance for VAN-019 finished.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), status: 'completed' },
    { id: '3', type: 'system', title: 'Geofence Exit: TRK-088', description: 'Vehicle departed the Central Warehouse Loading Zone.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
]

const activeMapLocations = [
    { id: 'loc-1', name: 'TRK-042', lat: 34.0522, lng: -118.2437, status: 'moving' },
    { id: 'loc-2', name: 'VAN-019', lat: 41.8781, lng: -87.6298, status: 'idle' },
    { id: 'loc-3', name: 'TRK-088', lat: 40.7128, lng: -74.0060, status: 'moving' },
]

const maintenanceTasks = [
    { id: 'm-1', vehicle: 'TRK-045', service: 'Brake Pad Replacement', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), priority: 'high' as const },
    { id: 'm-2', vehicle: 'VAN-112', service: 'Tire Rotation', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), priority: 'medium' as const },
    { id: 'm-3', vehicle: 'SUV-005', service: 'Annual Inspection', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(), priority: 'low' as const },
]

export default function DashboardPage() {
    return (
        <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
                    <p className="text-slate-500 mt-1">Welcome back. Here's what's happening with your fleet today.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Action buttons could go here */}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Vehicles" value="68" icon={Car} trend={{ value: 12, label: 'vs last month', isPositive: true }} />
                <StatCard title="Active Trips" value="24" icon={Route} trend={{ value: 4, label: 'vs yesterday', isPositive: true }} />
                <StatCard title="Recent Incidents" value="3" icon={AlertTriangle} trend={{ value: 2, label: 'vs last week', isPositive: false }} />
                <StatCard title="Avg Efficiency" value="8.4 mpg" icon={BatteryCharging} trend={{ value: 1.2, label: 'vs last week', isPositive: true }} />
            </div>

            {/* Primary Row: Map & Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardMap locations={activeMapLocations} />
                <VehicleStatusChart data={vehicleStatusData} />
            </div>

            {/* Secondary Row: Lists & Feeds */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-2">
                    <UpcomingMaintenanceTable tasks={maintenanceTasks} />
                </div>
                <div className="xl:col-span-2">
                    <ActivityFeed activities={recentActivities} />
                </div>
            </div>
        </div>
    )
}
