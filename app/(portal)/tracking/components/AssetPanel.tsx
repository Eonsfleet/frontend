"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
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
  Crosshair,
  PlayCircle,
  Play,
  Calendar,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { VEHICLE_STATUS, resolveStatusKey } from "@/lib/vehicleStatus";
import { getVehicleTypeIcon } from "../utils";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";
import { useTrackingUiStore, type TrackingDetailTab } from "@/store/trackingUiStore";
import { getDriverById } from "@/lib/api/drivers";
import { getCurrentDriver } from "@/lib/api/vehicles";
import { getActiveTripForVehicle } from "@/lib/api/trips";
import { getDeviceById } from "@/lib/api/tracking";
import { DetailsTab } from "./tabs/DetailsTab";
import { DriverTab } from "./tabs/DriverTab";
import { TripTab } from "./tabs/TripTab";
import { DeviceTab } from "./tabs/DeviceTab";
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
  /**
   * Live-resolved telemetry, computed once at the page level (page.tsx) and
   * shared with BottomCards — AssetPanel mounts twice simultaneously (desktop +
   * mobile variants toggled by CSS breakpoint, not conditional rendering), so
   * computing this here would open a duplicate set of per-vehicle WS channels.
   */
  resolved: ResolvedVehicleTelemetry;
  hasActiveAlarm?: boolean;
}

export function AssetPanel({
  isOpen,
  onClose,
  selectedVehicle,
  locations,
  vehicles,
  onLiveTrack,
  onPlayback,
  resolved,
  hasActiveAlarm = false,
}: AssetPanelProps) {
  const router = useRouter();
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1);
  const {
    activeTab,
    setActiveTab,
    isAssetPanelCollapsed,
    toggleAssetPanel,
    isMapFollowEnabled,
    setMapFollowEnabled,
  } = useTrackingUiStore();
  const loc = selectedVehicle ? locations[selectedVehicle.id] : null;

  // The vehicle's embedded relationships.current_driver (Vehicle::operator on the
  // backend) picks whoever has the latest assigned_date WITHOUT excluding
  // deassigned drivers, so it can show a stale/former driver. GET
  // /vehicles/{id}/current-driver correctly filters to deassigned_date IS NULL —
  // use it as the source of truth for which driver is current, then still fetch
  // the full profile by id for the Driver tab's fields.
  const { data: currentDriverData, isLoading: isLoadingCurrentDriver } = useQuery({
    queryKey: ["current-driver", selectedVehicle?.id],
    queryFn: () => getCurrentDriver(selectedVehicle!.id),
    enabled: isOpen && !!selectedVehicle && activeTab === "driver",
  });
  const driverId = currentDriverData?.data?.relationships?.driver?.id ?? null;
  const assignedDate = currentDriverData?.data?.attributes?.assigned_date ?? null;

  const { data: driverData, isLoading: isLoadingDriverProfile } = useQuery({
    queryKey: ["driver", driverId],
    queryFn: () => getDriverById(driverId!),
    enabled: isOpen && !!driverId && activeTab === "driver",
  });
  const isLoadingDriver = isLoadingCurrentDriver || isLoadingDriverProfile;

  const { data: tripData, isLoading: isLoadingTrip } = useQuery({
    queryKey: ["active-trip", selectedVehicle?.id],
    queryFn: () => getActiveTripForVehicle(selectedVehicle!.id),
    enabled: isOpen && !!selectedVehicle && activeTab === "trip",
  });

  // /devices/{id} returns the device HARDWARE record (imei, phone number,
  // online status, linked hardware model) — distinct from /tracker/{imei}
  // (getDeviceStatus), which only returns GPS telemetry and never included
  // firmware/sim/model fields the Device tab was reading from it.
  const deviceRecordId = selectedVehicle?.relationships?.device?.id ?? selectedVehicle?.relationships?.device?.data?.id;
  const { data: deviceInfoData } = useQuery({
    queryKey: ["device-info", deviceRecordId],
    queryFn: () => getDeviceById(deviceRecordId),
    enabled: isOpen && !!deviceRecordId && activeTab === "device",
    refetchInterval: 30_000,
  });

  if (!selectedVehicle) return null;

  const TypeIcon = getVehicleTypeIcon(selectedVehicle.attributes.body_type);

  // Decide the top-line status from the SAME fleet-stream snapshot (locations[id])
  // the sidebar card reads, so the panel and the sidebar can't disagree (e.g. panel
  // "Stopped" while the list still says "Moving"). The per-vehicle telemetry channel
  // in `resolved` still enriches every detail field below — it just doesn't get to
  // drive the headline status on its own timeline, which is what caused the desync.
  const statusKey = resolveStatusKey(
    {
      status: loc?.status ?? resolved.status,
      is_online: loc?.is_online ?? resolved.isDeviceOnline,
      speed: loc?.speed ?? resolved.speed,
    },
    hasActiveAlarm,
  );
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
    {
      label: isMapFollowEnabled ? "Stop Focus" : "Focus",
      icon: Crosshair,
      onClick: () => {
        if (isMapFollowEnabled) {
          setMapFollowEnabled(false);
          toast.info("Map auto-focus disabled");
        } else {
          setMapFollowEnabled(true);
          onLiveTrack();
          toast.success("Map auto-focus enabled");
        }
      }
    },
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
          <div data-testid="asset-panel-photo-fallback" className="h-20 w-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
            <TypeIcon className="h-8 w-8" />
          </div>
        </div>

        <div className="px-6 pb-4">
          <h2 className="text-sm font-bold text-slate-900 truncate">
            {selectedVehicle.attributes.make} {selectedVehicle.attributes.model}
          </h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{plate}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <button
          onClick={() => {
            if (isMapFollowEnabled) {
              setMapFollowEnabled(false);
              toast.info("Map auto-focus disabled");
            } else {
              setMapFollowEnabled(true);
              onLiveTrack();
              toast.success("Map auto-focus enabled");
            }
            setActiveTab("details");
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl border text-[10px] font-bold transition-all duration-200",
            isMapFollowEnabled
              ? "border-blue-500 text-blue-600 bg-blue-50/30 shadow-[0_0_10px_rgba(59,130,246,0.05)] font-black"
              : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300"
          )}
        >
          <Crosshair className={cn("h-4 w-4", isMapFollowEnabled ? "text-blue-600" : "text-slate-400")} />
          <span>{isMapFollowEnabled ? "Stop Focus" : "Live Track"}</span>
        </button>

        <button
          onClick={() => {
            onPlayback();
            setActiveTab("details");
          }}
          className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300 text-[10px] font-bold transition-all duration-200"
        >
          <PlayCircle className="h-4 w-4 text-slate-400" />
          <span>Playback</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl border text-[10px] font-bold transition-all duration-200",
            activeTab === "history"
              ? "border-blue-500 text-blue-600 bg-blue-50/30 shadow-[0_0_10px_rgba(59,130,246,0.05)] font-black"
              : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300"
          )}
        >
          <RouteIcon className={cn("h-4 w-4", activeTab === "history" ? "text-blue-600" : "text-slate-400")} />
          <span>Route History</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300 text-[10px] font-bold transition-all duration-200">
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
              <span>More</span>
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

      {/* Tabs / Route History Panel */}
      {activeTab === "history" ? (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Route History Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Route History</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">View historical routes and movements of this vehicle.</p>
            </div>
            <button
              onClick={() => setActiveTab("details")}
              aria-label="Close route history"
              className="h-7 w-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Date Picker Row */}
          <div className="flex items-center gap-2 px-6 py-3 shrink-0">
            <button className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-2 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors">
              <span>May 20, 2024</span>
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors">
              Today
            </button>
          </div>

          {/* Metrics Summary Row */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 mx-6 mb-4 text-center shrink-0">
            <div>
              <div className="text-xs font-extrabold text-slate-800">4</div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Trips</div>
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-800">182 km</div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Distance</div>
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-800">6h 45m</div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Duration</div>
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-800">8</div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Stops</div>
            </div>
          </div>

          {/* Timeline list of historical trips */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 relative min-h-0">
            {/* Vertical timeline line */}
            <div className="absolute left-[33px] top-6 bottom-6 w-0.5 bg-slate-100" />

            <div className="space-y-4">
              {[
                {
                  id: 1,
                  time: "08:15 AM - 10:27 AM",
                  duration: "2h 12m",
                  distance: "68.4 km",
                  stops: 2,
                  start: "Ikeja, Lagos",
                  end: "Victoria Island, Lagos",
                },
                {
                  id: 2,
                  time: "11:02 AM - 12:15 PM",
                  duration: "1h 13m",
                  distance: "32.6 km",
                  stops: 1,
                  start: "Victoria Island, Lagos",
                  end: "Lekki, Lagos",
                },
                {
                  id: 3,
                  time: "01:05 PM - 03:18 PM",
                  duration: "2h 13m",
                  distance: "58.7 km",
                  stops: 3,
                  start: "Lekki, Lagos",
                  end: "Maryland, Lagos",
                },
                {
                  id: 4,
                  time: "04:01 PM - 05:16 PM",
                  duration: "1h 15m",
                  distance: "22.3 km",
                  stops: 2,
                  start: "Maryland, Lagos",
                  end: "Ikeja, Lagos",
                },
              ].map((tripItem) => (
                <div key={tripItem.id} className="flex items-start gap-4 relative pl-1">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded-full border border-slate-200 bg-white z-10 shrink-0 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0 bg-white rounded-xl p-3 border border-slate-100 hover:bg-slate-50/50 hover:border-slate-200 transition-all duration-200 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{tripItem.time}</span>
                        <span className="text-[8px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">Completed</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {tripItem.duration} • {tripItem.distance} • {tripItem.stops} {tripItem.stops === 1 ? "stop" : "stops"}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-50">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Start</span>
                          <span className="text-[10px] font-semibold text-slate-700 truncate block">{tripItem.start}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">End</span>
                          <span className="text-[10px] font-semibold text-slate-700 truncate block">{tripItem.end}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1">
                          <DropdownMenuItem 
                            onClick={() => toast.success("Focusing trip on map")}
                            className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <MapPinned className="h-3.5 w-3.5 text-slate-400" />
                            <span>Show on Map</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toast.success("Exporting trip data...")}
                            className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <FileDown className="h-3.5 w-3.5 text-slate-400" />
                            <span>Export Trip</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toast.success("Copied shareable trip link to clipboard")}
                            className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Share2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>Share Trip</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toast.success("Preparing PDF report...")}
                            className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <FileDown className="h-3.5 w-3.5 text-slate-400" />
                            <span>Download Report</span>
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-100 my-1" />
                          <DropdownMenuItem 
                            onClick={() => toast.error("Trip deletion is not available.")}
                            className="flex items-center gap-2 px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
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
            <TabsTrigger value="packets" className={TAB_TRIGGER_CLASS}>Live IoT</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto p-4 m-0">
            <DetailsTab
              resolved={resolved}
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
            <DeviceTab device={selectedVehicle.relationships?.device} resolved={resolved} deviceInfoData={deviceInfoData} />
          </TabsContent>
          <TabsContent value="packets" className="flex-1 min-h-0 m-0">
            <PacketStreamTab vehicleId={String(selectedVehicle.id)} plate={plate} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
