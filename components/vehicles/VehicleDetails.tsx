"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vehicle } from "@/types";
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
  Activity,
  Gauge,
  Thermometer,
  Zap,
  Shield,
  Navigation,
  Droplets,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { AssignDriverDialog } from "@/components/vehicles/AssignDriverDialog";
import { AssignClusterDialog } from "@/components/vehicles/AssignClusterDialog";
import { AssignTrackerDialog } from "@/components/vehicles/AssignTrackerDialog";
import { LayoutGrid, Loader2, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentDriver, getVehicleDriverHistory } from "@/lib/api/vehicles";
import { getVehicleMaintenanceSchedules } from "@/lib/api/maintenance";
import { getVehicleDocuments, downloadDocument } from "@/lib/api/documents";
import { getVehicleCurrentFuel, getVehicleFuelHistory } from "@/lib/api/fuel";
import { getDriverTrips } from "@/lib/api/drivers";
import { UploadDocumentDialog } from "@/components/vehicles/UploadDocumentDialog";
import { CreateMaintenanceScheduleModal } from "@/components/maintenance/CreateScheduleModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamically import the map for the location tab
const MapView = dynamic(
  () => import("@/components/dashboard/DashboardMapComponent"),
  { ssr: false },
);

interface VehicleDetailsProps {
  vehicle: Vehicle;
}

// ── Small helper: one row inside a telemetry group card ──────────────────────
function TelemetryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-800 text-right max-w-[60%]">
        {value === null || value === undefined || value === "" ? (
          <span className="text-slate-300 font-normal italic">—</span>
        ) : (
          String(value)
        )}
      </span>
    </div>
  );
}

export function VehicleDetails({ vehicle }: VehicleDetailsProps) {
  const [isAssignOpen, setIsAssignOpen] = React.useState(false);
  const [isAssignClusterOpen, setIsAssignClusterOpen] = React.useState(false);
  const [isAssignTrackerOpen, setIsAssignTrackerOpen] = React.useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = React.useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = React.useState(false);

  // Location is read from the vehicle relationship.
  // Detail endpoint may still return the old {attributes: {...}} envelope;
  // list endpoint returns the new flat shape. Support both.
  const currentLocation = vehicle.relationships?.current_location ?? null;
  const loc = (currentLocation as any)?.attributes ?? currentLocation ?? null;

  const { data: driverResponse, isLoading: isLoadingDriver } = useQuery({
    queryKey: ["vehicle-current-driver", vehicle.id],
    queryFn: () => getCurrentDriver(vehicle.id),
  });

  const { data: maintenanceResponse, isLoading: isLoadingMaintenance } =
    useQuery({
      queryKey: ["vehicle-maintenance-schedules", vehicle.id],
      queryFn: () => getVehicleMaintenanceSchedules(vehicle.id),
    });

  const { data: documentsResponse, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["vehicle-documents", vehicle.id],
    queryFn: () => getVehicleDocuments(vehicle.id),
  });

  const { data: fuelResponse, isLoading: isLoadingFuel } = useQuery({
    queryKey: ["vehicle-fuel", vehicle.id],
    queryFn: () => getVehicleCurrentFuel(Number(vehicle.id)),
    refetchInterval: 30000,
  });

  const { data: fuelHistoryResponse, isLoading: isLoadingFuelHistory } =
    useQuery({
      queryKey: ["vehicle-fuel-history", vehicle.id],
      queryFn: () => getVehicleFuelHistory(Number(vehicle.id)),
    });

  // Try embedded current_driver array first, fall back to query result
  const embeddedDriverArr = vehicle.relationships?.current_driver;
  const embeddedDriver =
    Array.isArray(embeddedDriverArr) && embeddedDriverArr.length > 0
      ? embeddedDriverArr[0]
      : null;
  const currentDriver =
    embeddedDriver ?? driverResponse?.data?.relationships?.driver ?? null;

  const maintenanceSchedules = maintenanceResponse?.data?.schedules || [];
  const documents = documentsResponse?.data?.documents || [];

  

  // GPS device from relationships
  const device = vehicle.relationships?.device ?? null;

  // Location tab coordinates — support both old {attributes:{coordinates:{}}} and new flat format
  const lat = loc?.coordinates?.latitude ?? loc?.latitude ?? 0;
  const lng = loc?.coordinates?.longitude ?? loc?.longitude ?? 0;
  const locationState = loc?.state ?? "offline";

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
              value="telemetry"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium"
            >
              Live Telemetry
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

        {/* ── OVERVIEW TAB ───────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Vehicle Specifications */}
            <Card className="md:col-span-2 shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="w-5 h-5 text-blue-600" /> Vehicle
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                <DetailItem
                  label="Registration Number"
                  value={vehicle.attributes.registration_number}
                />
                <DetailItem
                  label="Make & Model"
                  value={`${vehicle.attributes.make} ${vehicle.attributes.model}`}
                />
                <DetailItem
                  label="Year"
                  value={vehicle.attributes.year?.toString() || "N/A"}
                />
                <DetailItem
                  label="Lifetime Odometer"
                  value={
                    vehicle.attributes.odometer
                      ? `${vehicle.attributes.odometer.lifetime_km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
                      : 'N/A'
                  }
                />
                <DetailItem
                  label="Today's Distance"
                  value={
                    vehicle.attributes.odometer?.today_km
                      ? `${vehicle.attributes.odometer.today_km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
                      : '0 km'
                  }
                />
                <DetailItem
                  label="Body Type"
                  value={vehicle.attributes.body_type}
                />
                <DetailItem
                  label="Fleet Type"
                  value={vehicle.attributes.type || "Fleet"}
                />
                <DetailItem
                  label="Cluster"
                  value={
                    vehicle.relationships?.cluster?.name || "Unassigned"
                  }
                  action={
                    <PermissionGate permission="vehicles:assign">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs text-blue-600 font-semibold"
                        onClick={() => setIsAssignClusterOpen(true)}
                      >
                        {vehicle.relationships?.cluster
                          ? "Change"
                          : "Assign"}
                      </Button>
                    </PermissionGate>
                  }
                />
                <DetailItem
                  label="Last Update"
                  value={new Date(
                    vehicle.attributes.updated_at,
                  ).toLocaleDateString()}
                />
              </CardContent>
            </Card>

            {/* Right column: Driver + GPS Device */}
            <div className="space-y-6">
              {/* Current Driver */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    Current Driver
                  </CardTitle>
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
                  {isLoadingDriver && !embeddedDriver ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                    </div>
                  ) : currentDriver ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                        {currentDriver.f_name?.[0]}
                        {currentDriver.l_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {currentDriver.f_name} {currentDriver.l_name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono italic">
                          {currentDriver.phone_number || "No Phone"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed rounded-lg border-slate-100">
                      <User className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      <PermissionGate
                        permission="vehicles:assign"
                        fallback={
                          <span className="text-sm text-slate-400">
                            No driver assigned
                          </span>
                        }
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

              {/* GPS Device */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                      GPS Device
                    </CardTitle>
                    <PermissionGate permission="vehicles:assign">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 -mt-1 px-2"
                        onClick={() => setIsAssignTrackerOpen(true)}
                      >
                        {vehicle.attributes.device_id ? "Change" : "Link"}
                      </Button>
                    </PermissionGate>
                  </div>
                </CardHeader>
                <CardContent>
                  {device ? (
                    <div className="space-y-3">
                      {/* Online status row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full shrink-0",
                              device.is_online
                                ? "bg-emerald-500"
                                : "bg-rose-400",
                            )}
                          />
                          <Cpu className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-mono font-semibold text-slate-800 truncate">
                            {device.imei || vehicle.attributes.device_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {device.is_online ? (
                            <Badge
                              variant="default"
                              className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]"
                            >
                              Online
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-600 border-rose-100 text-[10px]"
                            >
                              Offline
                            </Badge>
                          )}
                          {device.has_fuel && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-100 text-[10px]"
                            >
                              Fuel Sensor
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Device detail rows */}
                      <div className="space-y-1 pt-1">
                        {device.phone && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 font-medium">
                              SIM
                            </span>
                            <span className="font-mono text-slate-700">
                              {device.phone}
                            </span>
                          </div>
                        )}
                        {device.country && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 font-medium">
                              Country
                            </span>
                            <span className="text-slate-700">
                              {device.country}
                            </span>
                          </div>
                        )}
                        {device.status && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 font-medium">
                              Status
                            </span>
                            <span className="text-slate-700 capitalize">
                              {device.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : vehicle.attributes.device_id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-slate-900">
                            {vehicle.attributes.device_id}
                          </span>
                        </div>
                        <Badge
                          variant="default"
                          className="bg-emerald-50 text-emerald-700 border-emerald-100"
                        >
                          Online
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed rounded-lg border-slate-100">
                      <AlertCircle className="w-6 h-6 text-rose-300 mx-auto mb-2" />
                      <span className="text-sm text-slate-400 whitespace-nowrap">
                        No tracking device
                      </span>
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

            {/* Technical Specifications */}
            <Card className="md:col-span-2 shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" /> Technical
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                <DetailItem
                  label="VIN / Chasis Number"
                  value={vehicle.attributes.chasis_number || "Not Recorded"}
                />
                <DetailItem
                  label="Gross Vehicle Mass (GVM)"
                  value={
                    vehicle.attributes.gvm
                      ? `${vehicle.attributes.gvm} kg`
                      : "N/A"
                  }
                />
                <DetailItem
                  label="Fuel Capacity"
                  value={
                    vehicle.attributes.fuel_capacity
                      ? `${vehicle.attributes.fuel_capacity} ${vehicle.attributes.fuel_capacity_unit || "L"}`
                      : "N/A"
                  }
                />
                <DetailItem
                  label="Odometer When Joined"
                  value={
                    vehicle.attributes.odometer?.at_join_km
                      ? `${vehicle.attributes.odometer.at_join_km.toLocaleString()} km`
                      : "N/A"
                  }
                />
                <DetailItem
                  label="Odometer Source"
                  value={
                    vehicle.attributes.odometer?.source === 'device_native'
                      ? 'Device (GPS)'
                      : vehicle.attributes.odometer?.source === 'haversine'
                      ? 'Estimated (GPS position)'
                      : 'N/A'
                  }
                />
                <DetailItem
                  label="Fuel Conversion Factor"
                  value={
                    vehicle.attributes.fuel_sensor_conversion_factor?.toString() ||
                    "N/A"
                  }
                />
                <DetailItem
                  label="Fuel Type"
                  value={vehicle.attributes.fuel_type || "N/A"}
                />
              </CardContent>
            </Card>

            {/* Tire Pressure Reference */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Tire Pressure Reference (PSI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicle.attributes.tire_psi ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                        Front Left
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {vehicle.attributes.tire_psi.front_left}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                        Front Right
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {vehicle.attributes.tire_psi.front_right}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                        Rear Left
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {vehicle.attributes.tire_psi.rear_left}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                        Rear Right
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {vehicle.attributes.tire_psi.rear_right}
                      </p>
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

        {/* ── LIVE TELEMETRY TAB ────────────────────────────────────── */}
        <TabsContent value="telemetry" className="outline-none space-y-6">
          {!loc ? (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="py-16 text-center">
                <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 italic">
                  No telemetry data available for this vehicle yet.
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Ensure a GPS device is assigned and online.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Map card */}
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base">Live Location</CardTitle>
                    <CardDescription className="text-xs">
                      {loc.address
                        ? loc.address
                        : lat !== 0 || lng !== 0
                          ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                          : "Position unavailable"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          locationState === "moving"
                            ? "bg-emerald-500"
                            : locationState === "stopped"
                              ? "bg-amber-400"
                              : "bg-slate-300",
                        )}
                      />
                      <span className="text-xs font-semibold text-slate-600 capitalize">
                        {loc.state ?? locationState}
                      </span>
                    </div>
                    {loc.speed != null && (
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        {loc.speed} km/h
                      </span>
                    )}
                    {loc.ignition != null && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase font-bold",
                          loc.ignition
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-50 text-slate-500 border-slate-200",
                        )}
                      >
                        IGN {loc.ignition ? "ON" : "OFF"}
                      </Badge>
                    )}
                    {loc.gps_datetime && (
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                        {format(new Date(loc.gps_datetime), "MMM d, HH:mm:ss")}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <div className="w-full h-105">
                  <MapView
                    locations={[
                      {
                        id: vehicle.id.toString(),
                        name: vehicle.attributes.registration_number,
                        lat: lat || 6.5244,
                        lng: lng || 3.3792,
                        status:
                          (locationState as
                            | "in_transit"
                            | "idle"
                            | "parked"
                            | "online"
                            | "offline") || "parked",
                        address:
                          loc.address ??
                          (lat !== 0 || lng !== 0
                            ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                            : undefined),
                      },
                    ]}
                  />
                </div>
                {/* Info strip */}
                <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      State
                    </p>
                    <p className="text-sm font-semibold text-slate-800 capitalize">
                      {loc.state ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Speed
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {loc.speed != null ? `${loc.speed} km/h` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Ignition
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        loc.ignition ? "text-emerald-600" : "text-slate-500",
                      )}
                    >
                      {loc.ignition != null
                        ? loc.ignition
                          ? "On"
                          : "Off"
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Coordinates
                    </p>
                    <p className="text-xs font-mono text-slate-700">
                      {lat !== 0 || lng !== 0
                        ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Last GPS Time
                    </p>
                    <p className="text-xs font-semibold text-slate-700">
                      {loc.gps_datetime
                        ? format(new Date(loc.gps_datetime), "MMM d HH:mm:ss")
                        : "—"}
                    </p>
                  </div>
                  {loc.address && (
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Address
                      </p>
                      <p className="text-xs text-slate-700 leading-snug line-clamp-2">
                        {loc.address}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* 4-column key-stats banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3 shadow-sm">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Gauge className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Speed
                    </p>
                    <p className="text-2xl font-black text-slate-900 leading-tight font-mono">
                      {loc.speed ?? "—"}
                    </p>
                    <p className="text-[9px] text-slate-400 font-semibold">
                      km/h
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3 shadow-sm">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Fuel Level
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-black leading-tight font-mono",
                        (loc.fuel_level_percent ?? 100) < 15
                          ? "text-rose-600"
                          : (loc.fuel_level_percent ?? 100) < 30
                            ? "text-amber-600"
                            : "text-emerald-600",
                      )}
                    >
                      {loc.fuel_level_percent ?? "—"}
                    </p>
                    <p className="text-[9px] text-slate-400 font-semibold">
                      percent
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3 shadow-sm">
                  <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Eco Score
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-black leading-tight font-mono",
                        (loc.eco_score ?? 100) < 40
                          ? "text-rose-600"
                          : (loc.eco_score ?? 100) < 70
                            ? "text-amber-600"
                            : "text-emerald-600",
                      )}
                    >
                      {loc.eco_score ?? "—"}
                    </p>
                    <p className="text-[9px] text-slate-400 font-semibold">
                      / 100
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3 shadow-sm">
                  <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                    <Thermometer className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Engine Temp
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-black leading-tight font-mono",
                        loc.engine_temperature == null
                          ? "text-slate-400"
                          : loc.engine_temperature > 100
                            ? "text-rose-600"
                            : loc.engine_temperature > 85
                              ? "text-amber-600"
                              : "text-slate-900",
                      )}
                    >
                      {loc.engine_temperature ?? "—"}
                    </p>
                    <p className="text-[9px] text-slate-400 font-semibold">
                      °C
                    </p>
                  </div>
                </div>
              </div>

              {/* 3-column telemetry group grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-emerald-500" /> Fuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-0.5">
                    <TelemetryRow
                      label="Rate"
                      value={
                        loc.fuel_rate != null ? `${loc.fuel_rate} L/h` : null
                      }
                    />
                    <TelemetryRow
                      label="Consumed"
                      value={
                        loc.fuel_consumed != null
                          ? `${loc.fuel_consumed} L`
                          : null
                      }
                    />
                    <TelemetryRow
                      label="Used (GPS)"
                      value={
                        loc.fuel_used_gps != null
                          ? `${loc.fuel_used_gps} L`
                          : null
                      }
                    />
                    <TelemetryRow
                      label="Level OBD"
                      value={
                        loc.fuel_level_obd != null
                          ? `${loc.fuel_level_obd}%`
                          : null
                      }
                    />
                    <TelemetryRow label="Source" value={loc.fuel_source} />
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-blue-500" /> Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-0.5">
                    <TelemetryRow label="RPM" value={loc.engine_rpm} />
                    <TelemetryRow
                      label="RPM (OBD)"
                      value={loc.engine_rpm_obd}
                    />
                    <TelemetryRow label="Oil Level" value={loc.oil_level} />
                    <TelemetryRow
                      label="Driving State"
                      value={loc.driving_state}
                    />
                    <TelemetryRow
                      label="Idling"
                      value={
                        loc.idling != null ? (loc.idling ? "Yes" : "No") : null
                      }
                    />
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> Battery /
                      Power
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-0.5">
                    <TelemetryRow
                      label="Battery Voltage"
                      value={
                        loc.battery_voltage != null
                          ? `${loc.battery_voltage} V`
                          : null
                      }
                    />
                    <TelemetryRow
                      label="Battery Current"
                      value={
                        loc.battery_current != null
                          ? `${loc.battery_current} A`
                          : null
                      }
                    />
                    <TelemetryRow
                      label="External Voltage"
                      value={
                        loc.external_voltage != null
                          ? `${loc.external_voltage} V`
                          : null
                      }
                    />
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-sky-500" /> GPS
                      Signal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-0.5">
                    <TelemetryRow label="Satellites" value={loc.satellites} />
                    <TelemetryRow
                      label="Altitude"
                      value={loc.altitude != null ? `${loc.altitude} m` : null}
                    />
                    <TelemetryRow label="Confidence" value={loc.confidence} />
                    <TelemetryRow label="Protocol" value={loc.protocol_name} />
                    <TelemetryRow label="Heading (°)" value={loc.angle} />
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />{" "}
                      Odometer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-0.5">
                    <TelemetryRow
                      label="Odometer"
                      value={
                        loc.odometer != null
                          ? `${loc.odometer.toLocaleString()} km`
                          : null
                      }
                    />
                    <TelemetryRow
                      label="Trip"
                      value={
                        loc.trip_odometer != null
                          ? `${loc.trip_odometer.toLocaleString()} km`
                          : null
                      }
                    />
                    <TelemetryRow
                      label="Total Mileage"
                      value={
                        loc.total_mileage != null
                          ? `${loc.total_mileage.toLocaleString()} km`
                          : null
                      }
                    />
                    <TelemetryRow label="Source" value={loc.odometer_source} />
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-rose-500" /> Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-0.5">
                    <TelemetryRow
                      label="Immobilizer"
                      value={
                        loc.immobilizer != null
                          ? loc.immobilizer
                            ? "Active"
                            : "Inactive"
                          : null
                      }
                    />
                    <TelemetryRow
                      label="Jamming"
                      value={
                        loc.jamming != null
                          ? loc.jamming
                            ? "Detected"
                            : "Clear"
                          : null
                      }
                    />
                    <TelemetryRow
                      label="Unplug"
                      value={
                        loc.unplug != null ? (loc.unplug ? "Yes" : "No") : null
                      }
                    />
                    <TelemetryRow
                      label="Sleep Mode"
                      value={
                        loc.sleep_mode != null
                          ? loc.sleep_mode
                            ? "On"
                            : "Off"
                          : null
                      }
                    />
                    <TelemetryRow label="Door Status" value={loc.door_status} />
                    <TelemetryRow
                      label="Load Weight"
                      value={
                        loc.load_weight != null ? `${loc.load_weight} kg` : null
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              {loc.gps_datetime && (
                <p className="text-[10px] text-slate-400 text-right font-medium pb-2">
                  Last updated:{" "}
                  {format(new Date(loc.gps_datetime), "MMM d, yyyy HH:mm:ss")}
                </p>
              )}
            </>
          )}
        </TabsContent>

        {/* ── HISTORY TAB ───────────────────────────────────────────── */}
        <TabsContent value="history" className="outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> Driver Assignment
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DriverHistoryList vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TRIPS TAB ─────────────────────────────────────────────── */}
        <TabsContent value="trips" className="outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> Current Driver
                Trip History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentDriver ? (
                <DriverTripsList driverId={currentDriver.id} />
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-slate-500 italic">
                    No driver currently assigned to this vehicle to show trip
                    history.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MAINTENANCE TAB ───────────────────────────────────────── */}
        <TabsContent value="maintenance" className="outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" /> Maintenance
                  Schedules
                </CardTitle>
                <CardDescription>
                  Preventive maintenance plans and their execution logs.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsAddScheduleOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Schedule
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingMaintenance ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
                </div>
              ) : maintenanceSchedules.length > 0 ? (
                <div className="space-y-6">
                  {maintenanceSchedules.map((schedule: any) => {
                    const attrs = schedule.attributes || {};
                    const logs = schedule.relationships?.logs || [];

                    console.log(logs.due_date)
                    return (
                      <div key={schedule.id} className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 capitalize">
                                {attrs.service_type || "Maintenance"} Service
                              </p>
                              <p className="text-xs text-slate-500 uppercase tracking-tight font-medium">
                                {attrs.interval_value} {attrs.interval_unit} •{" "}
                                {attrs.schedule_type}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              attrs.status === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : attrs.status === "overdue"
                                  ? "bg-rose-50 text-rose-700 border-rose-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-100",
                            )}
                          >
                            {attrs.status}
                          </Badge>
                        </div>

                        {logs.length > 0 && (
                          <div className="pl-6 space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Recent Logs
                            </p>
                            {logs.map((log: any) => (
                              <div
                                key={log.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      log.status === "completed"
                                        ? "bg-emerald-500"
                                        : "bg-amber-500",
                                    )}
                                  />
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700">
                                      Due:{" "}
                                      {new Date(
                                        log?.attributes?.due_date
                                      ).toLocaleDateString()}
                                    </p>
                                    {log.completed_date && (
                                      <p className="text-[10px] text-slate-400">
                                        Done:{" "}
                                        {new Date(
                                          log.completed_date,
                                        ).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-900">
                                    {log.cost > 0
                                      ? `₦${log.cost.toLocaleString()}`
                                      : "-"}
                                  </p>
                                  <Badge
                                    className="text-[9px] h-4"
                                    variant={
                                      log.status === "completed"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {log.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-slate-500 italic">
                    No maintenance schedules configured for this vehicle.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DOCUMENTS TAB ─────────────────────────────────────────── */}
        <TabsContent value="documents" className="outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Compliance
                  Documents
                </CardTitle>
                <CardDescription>
                  Insurance, roadworthiness, and other registration files.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsUploadDocOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Upload New
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
                </div>
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
                  <p className="text-slate-500 italic">
                    No compliance documents uploaded for this vehicle.
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setIsUploadDocOpen(true)}
                  >
                    Upload your first document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FUEL TAB ──────────────────────────────────────────────── */}
        <TabsContent value="fuel" className="outline-none">
          <UpgradeGate
            module="fuel"
            featureName="Fuel Intelligence"
            description="Monitor fuel levels, consumption trends and theft anomalies in real-time."
          >
            {(() => {
              const fuelVehicle = fuelResponse?.data?.vehicle;
              const fuelLevel = fuelResponse?.data?.fuel_level;
              const fuelPercent = fuelLevel?.fuel_level_percent ?? 0;
              const tankCapacity =
                fuelLevel?.tank_capacity ?? vehicle.attributes.fuel_capacity;
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 shadow-sm border-slate-200">
                      <CardHeader className="flex flex-row items-start justify-between pb-4">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Fuel className="w-5 h-5 text-emerald-600" />{" "}
                            Real-time Fuel Status
                          </CardTitle>
                          <CardDescription>
                            Live fuel level data from onboard sensor and GPS
                            tracker.
                          </CardDescription>
                        </div>
                        {fuelLevel?.last_updated && (
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap pt-1">
                            Updated{" "}
                            {format(
                              new Date(fuelLevel.last_updated),
                              "MMM d, HH:mm",
                            )}
                          </span>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {isLoadingFuel ? (
                          <div className="py-12 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
                          </div>
                        ) : (
                          <>
                            <div className="space-y-4">
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Current Level
                                  </p>
                                  <p
                                    className={cn(
                                      "text-5xl font-black font-mono leading-tight",
                                      fuelPercent < 15
                                        ? "text-rose-600"
                                        : fuelPercent < 30
                                          ? "text-amber-600"
                                          : "text-slate-900",
                                    )}
                                  >
                                    {fuelPercent}%
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Estimated Volume
                                  </p>
                                  <p className="text-2xl font-bold text-emerald-600 font-mono">
                                    {fuelLevel?.fuel_level_liters != null
                                      ? `${Number(fuelLevel.fuel_level_liters).toFixed(1)} L`
                                      : tankCapacity
                                        ? `~${Math.round((fuelPercent / 100) * tankCapacity)} L`
                                        : "—"}
                                  </p>
                                  {tankCapacity && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      of {tankCapacity} L tank
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Progress
                                value={fuelPercent}
                                className="h-4 shadow-inner bg-slate-100 rounded-full"
                                indicatorClassName={cn(
                                  "transition-all duration-1000 rounded-full",
                                  fuelPercent < 15
                                    ? "bg-rose-500"
                                    : fuelPercent < 30
                                      ? "bg-amber-500"
                                      : "bg-emerald-500",
                                )}
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 font-medium -mt-1">
                                <span>Empty</span>
                                <span>Full</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                              <DetailItem
                                label="Tank Capacity"
                                value={
                                  tankCapacity ? `${tankCapacity} L` : "N/A"
                                }
                              />
                              <DetailItem
                                label="Fuel Type"
                                value={
                                  fuelVehicle?.fuel_type ??
                                  vehicle.attributes.fuel_type ??
                                  "N/A"
                                }
                              />
                              <DetailItem
                                label="Sensor Factor"
                                value={
                                  vehicle.attributes.fuel_sensor_conversion_factor?.toString() ||
                                  "N/A"
                                }
                              />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Device / anomaly side panel */}
                    <div className="space-y-4">
                      {/* GPS Device summary */}
                      <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-tight">
                            Sensor Device
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {fuelVehicle ? (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "h-2.5 w-2.5 rounded-full shrink-0",
                                      fuelVehicle.device_online
                                        ? "bg-emerald-500"
                                        : "bg-rose-400",
                                    )}
                                  />
                                  <Cpu className="w-4 h-4 text-slate-400" />
                                  <span className="text-xs font-mono font-semibold text-slate-800 truncate">
                                    {fuelVehicle.device_imei ||
                                      vehicle.attributes.device_id ||
                                      "—"}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-bold",
                                    fuelVehicle.device_online
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      : "bg-rose-50 text-rose-600 border-rose-100",
                                  )}
                                >
                                  {fuelVehicle.device_online
                                    ? "Online"
                                    : "Offline"}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-slate-400 font-medium">
                                  Fuel Sensor
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    fuelVehicle.device_has_fuel
                                      ? "bg-amber-50 text-amber-700 border-amber-100"
                                      : "bg-slate-50 text-slate-500 border-slate-200",
                                  )}
                                >
                                  {fuelVehicle.device_has_fuel
                                    ? "Installed"
                                    : "Not Installed"}
                                </Badge>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-slate-400 italic text-center py-4">
                              Device info unavailable
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Anomaly card */}
                      <Card className="shadow-sm border-slate-200 bg-slate-50/50 border-dashed">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-tight">
                            Recent Anomalies
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                          <p className="text-sm font-semibold text-slate-900">
                            System Healthy
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            No fuel theft or drainage anomalies detected in the
                            last 24 hours.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* ── Fuel History Table ─────────────────── */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-500" /> Fuel
                          Level History
                        </CardTitle>
                        <CardDescription>
                          Recent sensor readings from the onboard fuel monitor.
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {isLoadingFuelHistory ? (
                        <div className="py-10 flex justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                        </div>
                      ) : (fuelHistoryResponse?.data?.history?.length ?? 0) ===
                        0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                          <Fuel className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-500">
                            No history available
                          </p>
                          <p className="text-xs text-slate-400">
                            Fuel sensor readings will appear here once recorded.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Timestamp
                                </th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                                  Level (%)
                                </th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                                  Volume (L)
                                </th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                                  Quality
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {fuelHistoryResponse!.data.history.map(
                                (row, i) => {
                                  const pct = row.fuel_level_percent ?? 0;
                                  const quality = row.data_quality_score ?? 0;
                                  return (
                                    <tr
                                      key={i}
                                      className="hover:bg-slate-50/60 transition-colors"
                                    >
                                      <td className="px-6 py-3 text-xs text-slate-700 font-medium whitespace-nowrap">
                                        {format(
                                          new Date(row.timestamp),
                                          "MMM d, yyyy HH:mm:ss",
                                        )}
                                      </td>
                                      <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                            <div
                                              className={cn(
                                                "h-full rounded-full",
                                                pct < 15
                                                  ? "bg-rose-500"
                                                  : pct < 30
                                                    ? "bg-amber-500"
                                                    : "bg-emerald-500",
                                              )}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                          <span
                                            className={cn(
                                              "text-xs font-bold tabular-nums",
                                              pct < 15
                                                ? "text-rose-600"
                                                : pct < 30
                                                  ? "text-amber-600"
                                                  : "text-slate-700",
                                            )}
                                          >
                                            {pct}%
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3 text-right text-xs text-slate-700 font-medium tabular-nums">
                                        {row.fuel_level_liters != null
                                          ? `${Number(row.fuel_level_liters).toFixed(1)} L`
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-3 text-right">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-[10px] font-bold",
                                            quality >= 80
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                              : quality >= 50
                                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                                : "bg-rose-50 text-rose-600 border-rose-100",
                                          )}
                                        >
                                          {quality}%
                                        </Badge>
                                      </td>
                                    </tr>
                                  );
                                },
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </UpgradeGate>
        </TabsContent>

        {/* ── DIALOGS ───────────────────────────────────────────────── */}
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

        <CreateMaintenanceScheduleModal
          open={isAddScheduleOpen}
          onOpenChange={setIsAddScheduleOpen}
          preselectedVehicleId={vehicle.id.toString()}
          preselectedVehicleReg={vehicle.attributes.registration_number}
        />
      </Tabs>
    </div>
  );
}

// ── Helper components (unchanged) ────────────────────────────────────────────

function DriverHistoryList({ vehicleId }: { vehicleId: string | number }) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["vehicle-driver-history", vehicleId],
    queryFn: () => getVehicleDriverHistory(vehicleId),
  });

  const history =
    response?.data?.history ||
    (Array.isArray(response?.data) ? response.data : []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
        <p className="text-slate-500 italic">
          No historical assignment records found for this vehicle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((record: any) => (
        <div
          key={record.id}
          className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {record.attributes?.driver_name ||
                  record.driver_name ||
                  "Unknown Driver"}
              </p>
              <p className="text-xs text-slate-500">
                {record.attributes?.assigned_at
                  ? format(
                      new Date(record.attributes.assigned_at),
                      "MMM d, yyyy",
                    )
                  : "N/A"}
                {record.attributes?.deassigned_at
                  ? ` — ${format(new Date(record.attributes.deassigned_at), "MMM d, yyyy")}`
                  : " — Present"}
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
  );
}

function DetailItem({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 max-w-50">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-tight">
          {label}
        </p>
        {action}
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DocumentCard({
  id,
  title,
  category,
  expiry,
  status,
  filePath,
}: {
  id: string;
  title: string;
  category?: string;
  expiry: string;
  status: string;
  filePath?: string;
}) {
  const isExpired =
    status === "expired" || (expiry && new Date(expiry) < new Date());

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between hover:border-blue-200 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
          <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{title}</p>
            {category && (
              <Badge
                variant="outline"
                className="text-[8px] h-3 px-1 uppercase"
              >
                {category}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-tight font-medium">
            Expires: {expiry ? new Date(expiry).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] uppercase font-bold",
            isExpired
              ? "bg-rose-50 text-rose-700 border-rose-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-100",
          )}
        >
          {status}
        </Badge>

        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:text-blue-600"
            onClick={() => filePath && window.open(filePath, "_blank")}
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
  );
}

function DriverTripsList({ driverId }: { driverId: string | number }) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["driver-trips", driverId],
    queryFn: () => getDriverTrips(driverId),
  });

  const trips =
    response?.data?.trips ||
    (Array.isArray(response?.data) ? response.data : []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
        <p className="text-slate-500 italic">
          No historical trip records found for this driver.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip: any) => (
        <div
          key={trip.id}
          className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">
                  {trip.attributes?.trip_number ||
                    trip.trip_number ||
                    "TRP-" + trip.id}
                </p>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {trip.attributes?.status || trip.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {trip.attributes?.start_location?.name ||
                  trip.attributes?.start_location ||
                  "Start"}{" "}
                →{" "}
                {trip.attributes?.end_location?.name ||
                  trip.attributes?.end_location ||
                  "End"}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {trip.attributes?.planned_start_time
                  ? format(
                      new Date(trip.attributes.planned_start_time),
                      "MMM d, yyyy HH:mm",
                    )
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
