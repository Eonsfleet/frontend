'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Vehicle } from '@/types'
import {
    Car,
    MapPin,
    History,
    Wrench,
    FileText,
    Fuel,
    User,
    Cpu,
    Calendar,
    AlertCircle
} from 'lucide-react'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { AssignDriverDialog } from '@/components/vehicles/AssignDriverDialog'
import dynamic from 'next/dynamic'

// Dynamically import the map for the location tab
const MapView = dynamic(
    () => import('@/components/dashboard/DashboardMapComponent'),
    { ssr: false }
)

interface VehicleDetailsProps {
    vehicle: Vehicle
}

export function VehicleDetails({ vehicle }: VehicleDetailsProps) {
    const [isAssignOpen, setIsAssignOpen] = React.useState(false)

    return (
        <div className="space-y-6">
            <Tabs defaultValue="overview" className="w-full">
                <div className="bg-white border-b sticky top-0 z-10 -mx-8 px-8 mb-6">
                    <TabsList className="bg-transparent h-14 w-full justify-start gap-6 rounded-none p-0 overflow-x-auto scrollbar-hide">
                        <TabsTrigger
                            value="overview"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium"
                        >
                            Overview
                        </TabsTrigger>
                        <TabsTrigger
                            value="location"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium"
                        >
                            Location
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium"
                        >
                            Driver History
                        </TabsTrigger>
                        <TabsTrigger
                            value="maintenance"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium"
                        >
                            Maintenance
                        </TabsTrigger>
                        <TabsTrigger
                            value="documents"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium"
                        >
                            Documents
                        </TabsTrigger>
                        <TabsTrigger
                            value="fuel"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium"
                        >
                            Fuel
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Car className="w-5 h-5 text-blue-600" /> Vehicle Specifications
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                                <DetailItem label="Registration Number" value={vehicle.attributes.registration_number} />
                                <DetailItem label="Make & Model" value={`${vehicle.attributes.make} ${vehicle.attributes.model}`} />
                                <DetailItem label="Year" value={vehicle.attributes.year} />
                                <DetailItem label="Odometer" value={`${(vehicle.attributes.total_odometer ?? 0).toLocaleString()} km`} />
                                <DetailItem label="Body Type" value={vehicle.attributes.body_type} />
                                <DetailItem label="Last Update" value={new Date(vehicle.attributes.updated_at).toLocaleDateString()} />
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Current Driver</CardTitle>
                                    <PermissionGate permission="vehicles:assign">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 -mt-1 px-2"
                                            onClick={() => setIsAssignOpen(true)}
                                        >
                                            Change
                                        </Button>
                                    </PermissionGate>
                                </CardHeader>
                                <CardContent>
                                    {/* TODO: Implement relationships for drivers */}
                                    <div className="text-center py-4 border-2 border-dashed rounded-lg border-slate-100">
                                        <User className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                        <PermissionGate
                                            permission="vehicles:assign"
                                            fallback={<span className="text-sm text-slate-400">No driver assigned</span>}
                                        >
                                            <Button
                                                variant="link"
                                                className="text-blue-600 text-sm font-semibold p-0 h-auto"
                                                onClick={() => setIsAssignOpen(true)}
                                            >
                                                Assign a Driver
                                            </Button>
                                        </PermissionGate>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">GPS Device</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {vehicle.attributes.device_id ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Cpu className="w-4 h-4 text-emerald-600" />
                                                    <span className="text-sm font-medium text-slate-900">{vehicle.attributes.device_id}</span>
                                                </div>
                                                <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-100">Online</Badge>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 border-2 border-dashed rounded-lg border-slate-100">
                                            <AlertCircle className="w-6 h-6 text-rose-300 mx-auto mb-2" />
                                            <span className="text-sm text-slate-400 whitespace-nowrap">No tracking device</span>
                                            <PermissionGate permission="vehicles:write">
                                                <Button variant="link" className="text-blue-600 text-sm font-semibold p-0 h-auto block mx-auto">
                                                    Link Device
                                                </Button>
                                            </PermissionGate>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <AssignDriverDialog
                        vehicleId={vehicle.id}
                        vehicleReg={vehicle.attributes.registration_number}
                        isOpen={isAssignOpen}
                        onClose={() => setIsAssignOpen(false)}
                    />
                </TabsContent>

                <TabsContent value="location" className="outline-none">
                    <Card className="h-[600px] shadow-sm border-slate-200 overflow-hidden flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg">Real-time Location</CardTitle>
                                <CardDescription>Last reported position of {vehicle.attributes.registration_number}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative">
                            <div className="w-full h-full">
                                <MapView locations={[{ id: vehicle.id.toString(), name: vehicle.attributes.registration_number, lat: 6.5244, lng: 3.3792, status: 'moving' }]} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>


                <TabsContent value="history" className="outline-none">
                    <UpgradeGate
                        module="reporting"
                        featureName="Assignment History"
                        description="Access full historical records of driver assignments and usage transitions for this vehicle."
                    >
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <History className="w-5 h-5 text-blue-600" /> Driver Assignment History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-slate-500 italic">Historical data initialization in progress...</div>
                            </CardContent>
                        </Card>
                    </UpgradeGate>
                </TabsContent>

                {/* Placeholder for other tabs */}
                <TabsContent value="maintenance" className="outline-none">
                    <div className="text-center py-12 text-slate-500 italic">Maintenance schedules loading...</div>
                </TabsContent>
                <TabsContent value="documents" className="outline-none">
                    <div className="text-center py-12 text-slate-500 italic">Attached documents loading...</div>
                </TabsContent>
                <TabsContent value="fuel" className="outline-none">
                    <UpgradeGate
                        module="fuel_management"
                        featureName="Fuel Intelligence"
                        description="Monitor fuel levels, consumption trends and theft anomalies in real-time."
                    >
                        <div className="text-center py-12 text-slate-500 italic">Fuel metrics data currently unavailable.</div>
                    </UpgradeGate>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-tight">{label}</p>
            <p className="text-sm font-semibold text-slate-900">{value}</p>
        </div>
    )
}
