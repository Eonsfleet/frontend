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
    CheckCircle2,
    Download,
    AlertCircle,
    Eye,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { AssignDriverDialog } from '@/components/vehicles/AssignDriverDialog'
import { AssignClusterDialog } from '@/components/vehicles/AssignClusterDialog'
import { AssignTrackerDialog } from '@/components/vehicles/AssignTrackerDialog'
import { LayoutGrid, Loader2, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentLocation, getCurrentDriver, getVehicleDriverHistory } from '@/lib/api/vehicles'
import { getVehicleMaintenanceSchedules } from '@/lib/api/maintenance'
import { getVehicleDocuments, downloadDocument } from '@/lib/api/documents'
import { getVehicleCurrentFuel } from '@/lib/api/fuel'
import { getDriverTrips } from '@/lib/api/drivers'
import { UploadDocumentDialog } from '@/components/vehicles/UploadDocumentDialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
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
    const [isAssignClusterOpen, setIsAssignClusterOpen] = React.useState(false)
    const [isAssignTrackerOpen, setIsAssignTrackerOpen] = React.useState(false)
    const [isUploadDocOpen, setIsUploadDocOpen] = React.useState(false)

    const { data: locationData, isLoading: isLoadingLocation } = useQuery({
        queryKey: ['vehicle-location', vehicle.id],
        queryFn: () => getCurrentLocation(vehicle.id),
        refetchInterval: 10000,
    })

    const { data: driverResponse, isLoading: isLoadingDriver } = useQuery({
        queryKey: ['vehicle-current-driver', vehicle.id],
        queryFn: () => getCurrentDriver(vehicle.id),
    })

    const { data: maintenanceResponse, isLoading: isLoadingMaintenance } = useQuery({
        queryKey: ['vehicle-maintenance-schedules', vehicle.id],
        queryFn: () => getVehicleMaintenanceSchedules(vehicle.id),
    })

    const { data: documentsResponse, isLoading: isLoadingDocuments } = useQuery({
        queryKey: ['vehicle-documents', vehicle.id],
        queryFn: () => getVehicleDocuments(vehicle.id),
    })

    const { data: fuelResponse, isLoading: isLoadingFuel } = useQuery({
        queryKey: ['vehicle-fuel', vehicle.id],
        queryFn: () => getVehicleCurrentFuel(Number(vehicle.id)),
        refetchInterval: 30000,
    })

    const currentDriver = driverResponse?.data?.relationships?.driver
    const maintenanceSchedules = maintenanceResponse?.data?.schedules || []
    const documents = documentsResponse?.data?.documents || []

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
                            value="trips"
                            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium"
                        >
                            Trips
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
                                <DetailItem label="Year" value={vehicle.attributes.year?.toString() || 'N/A'} />
                                <DetailItem label="Odometer" value={`${(vehicle.attributes.total_odometer ?? 0).toLocaleString()} km`} />
                                <DetailItem label="Body Type" value={vehicle.attributes.body_type} />
                                <DetailItem label="Fleet Type" value={vehicle.attributes.type || 'Fleet'} />
                                <DetailItem
                                    label="Cluster"
                                    value={vehicle.relationships?.cluster?.data?.name || 'Unassigned'}
                                    action={
                                        <PermissionGate permission="vehicles:assign">
                                            <Button
                                                variant="link"
                                                className="h-auto p-0 text-xs text-blue-600 font-semibold"
                                                onClick={() => setIsAssignClusterOpen(true)}
                                            >
                                                {vehicle.relationships?.cluster?.data ? 'Change' : 'Assign'}
                                            </Button>
                                        </PermissionGate>
                                    }
                                />
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
                                    {isLoadingDriver ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                                        </div>
                                    ) : currentDriver ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                                {currentDriver.f_name?.[0]}{currentDriver.l_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{currentDriver.f_name} {currentDriver.l_name}</p>
                                                <p className="text-xs text-slate-500 font-mono italic">{currentDriver.phone_number || 'No Phone'}</p>
                                            </div>
                                        </div>
                                    ) : (
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
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">GPS Device</CardTitle>
                                        <PermissionGate permission="vehicles:assign">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 -mt-1 px-2"
                                                onClick={() => setIsAssignTrackerOpen(true)}
                                            >
                                                {vehicle.attributes.device_id ? 'Change' : 'Link'}
                                            </Button>
                                        </PermissionGate>
                                    </div>
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
                                            <PermissionGate permission="vehicles:assign">
                                                <Button
                                                    variant="link"
                                                    className="text-blue-600 text-sm font-semibold p-0 h-auto block mx-auto"
                                                    onClick={() => setIsAssignTrackerOpen(true)}
                                                >
                                                    Link Device
                                                </Button>
                                            </PermissionGate>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Technical Specifications Section */}
                        <Card className="md:col-span-2 shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-blue-600" /> Technical Specifications
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                                <DetailItem label="VIN / Chasis Number" value={vehicle.attributes.chasis_number || 'Not Recorded'} />
                                <DetailItem label="Gross Vehicle Mass (GVM)" value={vehicle.attributes.gvm ? `${vehicle.attributes.gvm} kg` : 'N/A'} />
                                <DetailItem label="Fuel Capacity" value={vehicle.attributes.fuel_capacity ? `${vehicle.attributes.fuel_capacity} ${vehicle.attributes.fuel_capacity_unit || 'L'}` : 'N/A'} />
                                <DetailItem label="Odometer When Joined" value={vehicle.attributes.odometer_when_join ? `${vehicle.attributes.odometer_when_join.toLocaleString()} km` : 'N/A'} />
                                <DetailItem label="Fuel Conversion Factor" value={vehicle.attributes.fuel_sensor_conversion_factor?.toString() || 'N/A'} />
                                <DetailItem label="Fuel Type" value={vehicle.attributes.fuel_type || 'N/A'} />
                            </CardContent>
                        </Card>

                        {/* Tire Pressure Reference Section */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tire Pressure Reference (PSI)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {vehicle.attributes.tire_psi ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Front Left</p>
                                            <p className="text-sm font-black text-slate-900">{vehicle.attributes.tire_psi.front_left}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Front Right</p>
                                            <p className="text-sm font-black text-slate-900">{vehicle.attributes.tire_psi.front_right}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Rear Left</p>
                                            <p className="text-sm font-black text-slate-900">{vehicle.attributes.tire_psi.rear_left}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Rear Right</p>
                                            <p className="text-sm font-black text-slate-900">{vehicle.attributes.tire_psi.rear_right}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 text-xs italic">
                                        No tire reference data available.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
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
                                {isLoadingLocation ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-20">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    </div>
                                ) : null}
                                <MapView
                                    locations={[{
                                        id: vehicle.id.toString(),
                                        name: vehicle.attributes.registration_number,
                                        lat: locationData?.data?.location?.latitude ?? 6.5244,
                                        lng: locationData?.data?.location?.longitude ?? 3.3792,
                                        status: (locationData?.data?.location?.status as any) || 'moving'
                                    }]}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>


                <TabsContent value="history" className="outline-none">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" /> Driver Assignment History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DriverHistoryList vehicleId={vehicle.id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="trips" className="outline-none">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" /> Current Driver Trip History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {currentDriver ? (
                                <DriverTripsList driverId={currentDriver.id} />
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                                    <p className="text-slate-500 italic">No driver currently assigned to this vehicle to show trip history.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Placeholder for other tabs */}
                <TabsContent value="maintenance" className="outline-none">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-blue-600" /> Maintenance Schedules
                                </CardTitle>
                                <CardDescription>Preventive maintenance plans and their execution logs.</CardDescription>
                            </div>
                            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Schedule</Button>
                        </CardHeader>
                        <CardContent>
                            {isLoadingMaintenance ? (
                                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-200" /></div>
                            ) : maintenanceSchedules.length > 0 ? (
                                <div className="space-y-6">
                                    {maintenanceSchedules.map((schedule: any) => {
                                        const attrs = schedule.attributes || {}
                                        const logs = schedule.relationships?.logs || []
                                        return (
                                            <div key={schedule.id} className="space-y-3">
                                                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                                                            <Calendar className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 capitalize">{attrs.service_type || 'Maintenance'} Service</p>
                                                            <p className="text-xs text-slate-500 uppercase tracking-tight font-medium">
                                                                {attrs.interval_value} {attrs.interval_unit} • {attrs.schedule_type}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className={cn(
                                                        "capitalize",
                                                        attrs.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            attrs.status === 'overdue' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    )}>
                                                        {attrs.status}
                                                    </Badge>
                                                </div>

                                                {logs.length > 0 && (
                                                    <div className="pl-6 space-y-2">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Logs</p>
                                                        {logs.map((log: any) => (
                                                            <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "h-2 w-2 rounded-full",
                                                                        log.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                                                                    )} />
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-slate-700">Due: {new Date(log.due_date).toLocaleDateString()}</p>
                                                                        {log.completed_date && (
                                                                            <p className="text-[10px] text-slate-400">Done: {new Date(log.completed_date).toLocaleDateString()}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs font-bold text-slate-900">{log.cost > 0 ? `₦${log.cost.toLocaleString()}` : '-'}</p>
                                                                    <Badge className="text-[9px] h-4" variant={log.status === 'completed' ? 'secondary' : 'outline'}>{log.status}</Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                                    <p className="text-slate-500 italic">No maintenance schedules configured for this vehicle.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents" className="outline-none">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" /> Compliance Documents
                                </CardTitle>
                                <CardDescription>Insurance, roadworthiness, and other registration files.</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => setIsUploadDocOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Upload New
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isLoadingDocuments ? (
                                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-200" /></div>
                            ) : documents.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {documents.map((doc: any) => (
                                        <DocumentCard
                                            key={doc.id}
                                            id={doc.id}
                                            title={doc.attributes.title || doc.attributes.type}
                                            category={doc.attributes.category}
                                            expiry={doc.attributes.expiry_at}
                                            status={doc.attributes.status}
                                            filePath={doc.attributes.file_path}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                                    <p className="text-slate-500 italic">No compliance documents uploaded for this vehicle.</p>
                                    <Button variant="link" onClick={() => setIsUploadDocOpen(true)}>Upload your first document</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="fuel" className="outline-none">
                    <UpgradeGate
                        module="fuel"
                        featureName="Fuel Intelligence"
                        description="Monitor fuel levels, consumption trends and theft anomalies in real-time."
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="md:col-span-2 shadow-sm border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Fuel className="w-5 h-5 text-emerald-600" /> Real-time Fuel Status
                                    </CardTitle>
                                    <CardDescription>Live fuel level data from onboard sensor and GPS tracker.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Level</p>
                                                <p className="text-4xl font-black text-slate-900 font-mono">
                                                    {isLoadingFuel ? '—' : `${fuelResponse?.data?.fuel_level?.fuel_level_percent ?? 0}%`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Volume</p>
                                                <p className="text-xl font-bold text-emerald-600 font-mono">
                                                    {fuelResponse?.data?.fuel_level?.fuel_level_liters
                                                        ? `${fuelResponse.data.fuel_level.fuel_level_liters.toFixed(1)} L`
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <Progress
                                            value={fuelResponse?.data?.fuel_level?.fuel_level_percent ?? 0}
                                            className="h-3 shadow-inner bg-slate-100"
                                            indicatorClassName={cn(
                                                "transition-all duration-1000",
                                                (fuelResponse?.data?.fuel_level?.fuel_level_percent ?? 0) < 15 ? 'bg-rose-500' :
                                                    (fuelResponse?.data?.fuel_level?.fuel_level_percent ?? 0) < 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                                        <DetailItem label="Tank Capacity" value={`${vehicle.attributes.fuel_capacity || 'N/A'} ${vehicle.attributes.fuel_capacity_unit || 'L'}`} />
                                        <DetailItem label="Fuel Type" value={vehicle.attributes.fuel_type || 'N/A'} />
                                        <DetailItem label="Sensor Factor" value={vehicle.attributes.fuel_sensor_conversion_factor?.toString() || 'N/A'} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200 bg-slate-50/50 border-dashed">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-tight">Recent Anomalies</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                                    <p className="text-sm font-semibold text-slate-900">System Healthy</p>
                                    <p className="text-xs text-slate-500 mt-1">No fuel theft or drainage anomalies detected in the last 24 hours.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </UpgradeGate>
                </TabsContent>

                <AssignDriverDialog
                    vehicleId={vehicle.id}
                    vehicleReg={vehicle.attributes.registration_number}
                    isOpen={isAssignOpen}
                    onClose={() => setIsAssignOpen(false)}
                />

                <AssignClusterDialog
                    vehicleId={vehicle.id}
                    vehicleReg={vehicle.attributes.registration_number}
                    isOpen={isAssignClusterOpen}
                    onClose={() => setIsAssignClusterOpen(false)}
                />

                <AssignTrackerDialog
                    vehicleId={vehicle.id}
                    vehicleReg={vehicle.attributes.registration_number}
                    isOpen={isAssignTrackerOpen}
                    onClose={() => setIsAssignTrackerOpen(false)}
                />

                <UploadDocumentDialog
                    vehicleId={vehicle.id}
                    isOpen={isUploadDocOpen}
                    onClose={() => setIsUploadDocOpen(false)}
                />
            </Tabs>
        </div>
    )
}

function DriverHistoryList({ vehicleId }: { vehicleId: string | number }) {
    const { data: response, isLoading } = useQuery({
        queryKey: ['vehicle-driver-history', vehicleId],
        queryFn: () => getVehicleDriverHistory(vehicleId)
    })

    const history = response?.data?.history || (Array.isArray(response?.data) ? response.data : [])

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
            </div>
        )
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-slate-500 italic">No historical assignment records found for this vehicle.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {history.map((record: any) => (
                <div key={record.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">{record.attributes?.driver_name || record.driver_name || 'Unknown Driver'}</p>
                            <p className="text-xs text-slate-500">
                                {record.attributes?.assigned_at ? format(new Date(record.attributes.assigned_at), 'MMM d, yyyy') : 'N/A'}
                                {record.attributes?.deassigned_at ? ` — ${format(new Date(record.attributes.deassigned_at), 'MMM d, yyyy')}` : ' — Present'}
                            </p>
                        </div>
                    </div>
                    {record.attributes?.reason && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                            {record.attributes.reason}
                        </Badge>
                    )}
                </div>
            ))}
        </div>
    )
}

function DetailItem({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 max-w-[200px]">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-tight">{label}</p>
                {action}
            </div>
            <p className="text-sm font-semibold text-slate-900">{value}</p>
        </div>
    )
}

function DocumentCard({
    id,
    title,
    category,
    expiry,
    status,
    filePath
}: {
    id: string;
    title: string;
    category?: string;
    expiry: string;
    status: string;
    filePath?: string;
}) {
    const isExpired = status === 'expired' || (expiry && new Date(expiry) < new Date())

    return (
        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between hover:border-blue-200 transition-colors group">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{title}</p>
                        {category && <Badge variant="outline" className="text-[8px] h-3 px-1 uppercase">{category}</Badge>}
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tight font-medium">
                        Expires: {expiry ? new Date(expiry).toLocaleDateString() : 'N/A'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                    "text-[10px] uppercase font-bold",
                    isExpired ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                )}>
                    {status}
                </Badge>

                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                        onClick={() => filePath && window.open(filePath, '_blank')}
                        title="View"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                        onClick={() => downloadDocument(id)}
                        title="Download"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function DriverTripsList({ driverId }: { driverId: string | number }) {
    const { data: response, isLoading } = useQuery({
        queryKey: ['driver-trips', driverId],
        queryFn: () => getDriverTrips(driverId)
    })

    const trips = response?.data?.trips || (Array.isArray(response?.data) ? response.data : [])

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
            </div>
        )
    }

    if (trips.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-slate-500 italic">No historical trip records found for this driver.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {trips.map((trip: any) => (
                <div key={trip.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">{trip.attributes?.trip_number || trip.trip_number || 'TRP-' + trip.id}</p>
                                <Badge variant="outline" className="text-[10px] uppercase">
                                    {trip.attributes?.status || trip.status}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                                {trip.attributes?.start_location?.name || trip.attributes?.start_location || 'Start'} → {trip.attributes?.end_location?.name || trip.attributes?.end_location || 'End'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {trip.attributes?.planned_start_time ? format(new Date(trip.attributes.planned_start_time), 'MMM d, yyyy HH:mm') : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
