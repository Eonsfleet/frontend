"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  Truck,
  Navigation,
  History,
  Route as RouteIcon,
  MoreHorizontal,
  MapPinned,
  Terminal,
  Lock,
  Share2,
  FileDown,
  Radar,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { VEHICLE_STATUS, resolveStatusKey } from "@/lib/vehicleStatus";
import { buildVehicleSnapshot } from "@/lib/resolveVehicleTelemetry";
import { useResolvedVehicleTelemetry } from "@/hooks/useResolvedVehicleTelemetry";
import { useTrackingUiStore, type TrackingDetailTab } from "@/store/trackingUiStore";
import { getDriverById } from "@/lib/api/drivers";
import { getActiveTripForVehicle } from "@/lib/api/trips";
import { getDeviceStatus } from "@/lib/api/tracking";
import { DetailsTab } from "./tabs/DetailsTab";
import { DriverTab } from "./tabs/DriverTab";
import { TripTab } from "./tabs/TripTab";
import { DeviceTab } from "./tabs/DeviceTab";
import { DiagnosticsTab } from "./tabs/DiagnosticsTab";
import { PacketStreamTab } from "./tabs/PacketStreamTab";

const TAB_TRIGGER_CLASS =
  "data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium text-[11px]";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

interface AssetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicle: any;
  locations: Record<string, any>;
  vehicles: any[];
  onLiveTrack: () => void;
  onPlayback: () => void;
}

export function AssetPanel({
  isOpen,
  onClose,
  selectedVehicle,
  locations,
  vehicles,
  onLiveTrack,
  onPlayback,
}: AssetPanelProps) {
  const router = useRouter();
  const { activeTab, setActiveTab, isAssetPanelCollapsed, toggleAssetPanel } = useTrackingUiStore();
  const loc = selectedVehicle ? locations[selectedVehicle.id] : null;

  const vehicleSnapshot = useMemo(() => buildVehicleSnapshot(selectedVehicle, loc), [selectedVehicle, loc]);
  const resolved = useResolvedVehicleTelemetry(selectedVehicle?.id ?? null, vehicleSnapshot, isOpen && !!selectedVehicle);

  const currentDriverRaw = selectedVehicle?.relationships?.current_driver;
  const driverRef = Array.isArray(currentDriverRaw) ? currentDriverRaw[0] : currentDriverRaw;
  const driverId = driverRef?.id ?? null;
  const assignedDate = !Array.isArray(currentDriverRaw) ? currentDriverRaw?.assigned_date : undefined;

  const { data: driverData, isLoading: isLoadingDriver } = useQuery({
    queryKey: ["driver", driverId],
    queryFn: () => getDriverById(driverId!),
    enabled: isOpen && !!driverId && activeTab === "driver",
  });

  const { data: tripData, isLoading: isLoadingTrip } = useQuery({
    queryKey: ["active-trip", selectedVehicle?.id],
    queryFn: () => getActiveTripForVehicle(selectedVehicle!.id),
    enabled: isOpen && !!selectedVehicle && activeTab === "trip",
  });

  const imei = selectedVehicle?.relationships?.device?.imei ?? selectedVehicle?.relationships?.device?.data?.imei;
  const { data: deviceStatusData } = useQuery({
    queryKey: ["device-status", imei],
    queryFn: () => getDeviceStatus(imei),
    enabled: isOpen && !!imei && activeTab === "device",
  });

  if (!selectedVehicle) return null;

  const statusKey = resolveStatusKey({ status: loc?.status, is_online: loc?.is_online, speed: loc?.speed }, loc?.hasActiveAlarm);
  const statusCfg = VEHICLE_STATUS[statusKey];
  const plate = selectedVehicle.attributes.registration_number;

  // Collapsed is a tablet-only affordance (md–lg); desktop (lg+) always shows the
  // full panel, mobile (<md) always shows the full bottom sheet when open.
  if (isAssetPanelCollapsed && isOpen) {
    return (
      <div className="hidden md:flex lg:hidden fixed inset-y-0 right-0 z-50 items-start">
        <button
          onClick={toggleAssetPanel}
          aria-label="Expand asset panel"
          className="mt-6 h-12 w-8 rounded-l-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      </div>
    );
  }

  const handleNearbyAssets = () => {
    if (!loc?.lat || !loc?.lng) {
      toast.info("No current position available for this asset yet.");
      return;
    }
    const nearby = vehicles
      .filter((v) => v.id !== selectedVehicle.id && locations[v.id]?.lat && locations[v.id]?.lng)
      .map((v) => ({
        plate: v.attributes.registration_number,
        distanceKm: haversineKm(loc, locations[v.id]),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);

    if (nearby.length === 0) {
      toast.info("No other assets with a known position nearby.");
      return;
    }
    toast.success("Nearest assets", {
      description: nearby.map((n) => `${n.plate} — ${n.distanceKm.toFixed(1)} km`).join(" · "),
    });
  };

  const handleShareLocation = () => {
    if (!loc?.lat || !loc?.lng) {
      toast.info("No current position available to share yet.");
      return;
    }
    const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    navigator.clipboard.writeText(url);
    toast.success("Location link copied to clipboard");
  };

  const moreActions = [
    { label: "Nearby Assets", icon: Radar, onClick: handleNearbyAssets },
    { label: "Send Command", icon: Terminal, onClick: () => toast.info("Send Command is not yet available.") },
    { label: "Immobilize", icon: Lock, onClick: () => toast.info("Immobilize is not yet available.") },
    { label: "Geofence", icon: MapPinned, onClick: () => router.push("/geofences") },
    { label: "Share Location", icon: Share2, onClick: handleShareLocation },
    { label: "Download Report", icon: FileDown, onClick: () => toast.info("Download Report is not yet available.") },
  ];

  return (
    <div
      className={cn(
        "bg-white shadow-2xl flex flex-col",
        // Mobile/tablet (<lg): fixed bottom sheet, unchanged behavior
        "fixed inset-x-0 bottom-0 top-auto h-[75vh] w-full rounded-t-3xl z-50 transition-transform duration-500",
        isOpen ? "translate-y-0" : "translate-y-full",
        // Desktop (lg+): static grid cell so the map column can reflow around it
        "lg:static lg:translate-y-0 lg:inset-auto lg:h-full lg:w-full lg:rounded-none lg:z-auto lg:shadow-none lg:border-l lg:border-slate-200",
      )}
      role="complementary"
      aria-label="Asset details panel"
    >
      {/* Header */}
      <div className="relative border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <span
            className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border", statusCfg.badge)}
          >
            {statusCfg.label}
          </span>
          <button
            onClick={toggleAssetPanel}
            aria-label="Collapse asset panel"
            className="hidden md:flex lg:hidden h-8 w-8 rounded-full bg-white/80 hover:bg-white items-center justify-center text-slate-400 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close asset panel"
            className="h-8 w-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-32 flex items-center justify-center bg-white">
          {selectedVehicle.attributes.image ? (
            <img
              src={selectedVehicle.attributes.image}
              alt={`${selectedVehicle.attributes.make} ${selectedVehicle.attributes.model}`}
              className="h-full object-contain"
            />
          ) : (
            <div data-testid="asset-panel-photo-fallback" className="h-20 w-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
              <Truck className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="px-6 pb-4">
          <h2 className="text-sm font-bold text-slate-900 truncate">
            {selectedVehicle.attributes.make} {selectedVehicle.attributes.model}
          </h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{plate}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-100 shrink-0">
        <button
          onClick={onLiveTrack}
          className="flex-1 h-10 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors"
        >
          <Navigation className="h-3.5 w-3.5" /> Live Track
        </button>
        <button
          onClick={onPlayback}
          className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors"
        >
          <History className="h-3.5 w-3.5" /> Playback
        </button>
        <button
          onClick={() => router.push(`/trips?vehicleId=${selectedVehicle.id}`)}
          className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors"
        >
          <RouteIcon className="h-3.5 w-3.5" /> Route History
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {moreActions.map((action) => (
              <DropdownMenuItem key={action.label} onClick={action.onClick}>
                <action.icon className="h-3.5 w-3.5 mr-2" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TrackingDetailTab)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="bg-transparent h-11 w-full justify-start gap-4 rounded-none p-0 px-4 border-b border-slate-100 overflow-x-auto scrollbar-hide shrink-0">
          <TabsTrigger value="details" className={TAB_TRIGGER_CLASS}>Details</TabsTrigger>
          <TabsTrigger value="driver" className={TAB_TRIGGER_CLASS}>Driver</TabsTrigger>
          <TabsTrigger value="trip" className={TAB_TRIGGER_CLASS}>Trip</TabsTrigger>
          <TabsTrigger value="device" className={TAB_TRIGGER_CLASS}>Device</TabsTrigger>
          <TabsTrigger value="diagnostics" className={TAB_TRIGGER_CLASS}>Diagnostics</TabsTrigger>
          <TabsTrigger value="packets" className={TAB_TRIGGER_CLASS}>Live IoT</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex-1 overflow-y-auto p-4 m-0">
          <DetailsTab
            resolved={resolved}
            driverName={driverRef?.name ?? driverData?.data?.attributes?.full_name}
            driverPhone={driverData?.data?.attributes?.phone_number}
            todayKm={selectedVehicle.attributes?.odometer?.today_km ?? null}
          />
        </TabsContent>
        <TabsContent value="driver" className="flex-1 overflow-y-auto p-4 m-0">
          <DriverTab driver={driverData?.data ?? null} isLoading={isLoadingDriver} assignedDate={assignedDate} />
        </TabsContent>
        <TabsContent value="trip" className="flex-1 overflow-y-auto p-4 m-0">
          <TripTab trip={tripData} isLoading={isLoadingTrip} />
        </TabsContent>
        <TabsContent value="device" className="flex-1 overflow-y-auto p-4 m-0">
          <DeviceTab device={selectedVehicle.relationships?.device} resolved={resolved} deviceStatusData={deviceStatusData} />
        </TabsContent>
        <TabsContent value="diagnostics" className="flex-1 overflow-y-auto p-4 m-0">
          <DiagnosticsTab resolved={resolved} />
        </TabsContent>
        <TabsContent value="packets" className="flex-1 min-h-0 m-0">
          <PacketStreamTab vehicleId={String(selectedVehicle.id)} plate={plate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
