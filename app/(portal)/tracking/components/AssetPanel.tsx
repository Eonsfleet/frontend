"use client";

import { formatToday } from "@/lib/odometer";
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
  Share2,
  ChevronRight,
  Crosshair,
  PlayCircle,
  Play,
  Camera,
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
import {
  useTrackingUiStore,
  type TrackingDetailTab,
} from "@/store/trackingUiStore";
import { useStreetImageryStore } from "@/store/streetImageryStore";
import { getDriverById } from "@/lib/api/drivers";
import { getCurrentDriver } from "@/lib/api/vehicles";
import { getActiveTripForVehicle } from "@/lib/api/trips";
import { getDeviceById } from "@/lib/api/tracking";
import { ShareLocationModal } from "./ShareLocationModal";
import { DetailsTab } from "./tabs/DetailsTab";
import { DriverTab } from "./tabs/DriverTab";
import { TripTab } from "./tabs/TripTab";
import { DeviceTab } from "./tabs/DeviceTab";
import { PacketStreamTab } from "./tabs/PacketStreamTab";
import { RouteHistoryPanel } from "./RouteHistoryPanel";

const TAB_TRIGGER_CLASS =
  "data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-1 h-full text-slate-600 font-medium text-[11px]";

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
  const [shareOpen, setShareOpen] = useState(false);
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
  const { data: currentDriverData, isLoading: isLoadingCurrentDriver } =
    useQuery({
      queryKey: ["current-driver", selectedVehicle?.id],
      queryFn: () => getCurrentDriver(selectedVehicle!.id),
      enabled: isOpen && !!selectedVehicle && activeTab === "driver",
    });
  const driverId = currentDriverData?.data?.relationships?.driver?.id ?? null;
  const assignedDate =
    currentDriverData?.data?.attributes?.assigned_date ?? null;

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
  const deviceRecordId =
    selectedVehicle?.relationships?.device?.id ??
    selectedVehicle?.relationships?.device?.data?.id;
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

  // Effective position for share/street-view: prefer the live WS packet, then
  // fall back to the resolved telemetry (same convention as handleStreetView).
  const shareLat = loc?.lat ?? resolved.lat;
  const shareLng = loc?.lng ?? resolved.lng;

  const handleShareLocation = () => {
    if (shareLat == null || shareLng == null) {
      toast.info("No current position available to share yet.");
      return;
    }
    setShareOpen(true);
  };

  const handleStreetView = () => {
    const lat = loc?.lat ?? resolved.lat;
    const lng = loc?.lng ?? resolved.lng;
    if (lat == null || lng == null) {
      toast.info("No current position available for this asset yet.");
      return;
    }
    useStreetImageryStore.getState().open(
      { lat, lng },
      {
        label: plate,
        subtitle: statusCfg.label,
        sourceTimestamp: resolved.lastUpdate,
        vehicleId: selectedVehicle.id,
      },
    );
  };

  const moreActions = [
    { label: "Street View", icon: Camera, onClick: handleStreetView },
    {
      label: "Geofence",
      icon: MapPinned,
      onClick: () => router.push("/geofences"),
    },
    { label: "Share Location", icon: Share2, onClick: handleShareLocation },
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

        <div className="flex items-center gap-4 px-6 py-5 pr-24">
          <div
            data-testid="asset-panel-photo-fallback"
            className="h-20 w-20 shrink-0 rounded-2xl bg-slate-900 flex items-center justify-center text-white"
          >
            <TypeIcon className="h-8 w-8" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate uppercase">
              {selectedVehicle.attributes.make}{" "}
              {selectedVehicle.attributes.model}
            </h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide truncate">
              {plate}
            </p>
            <span
              className={cn(
                "mt-1.5 inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                statusCfg.badge,
              )}
            >
              {statusCfg.label}
            </span>
          </div>
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
              : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300",
          )}
        >
          <Crosshair
            className={cn(
              "h-4 w-4",
              isMapFollowEnabled ? "text-blue-600" : "text-slate-400",
            )}
          />
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
              : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300",
          )}
        >
          <RouteIcon
            className={cn(
              "h-4 w-4",
              activeTab === "history" ? "text-blue-600" : "text-slate-400",
            )}
          />
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
        <RouteHistoryPanel
          vehicleId={String(selectedVehicle.id)}
          plate={plate}
          onClose={() => setActiveTab("details")}
        />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TrackingDetailTab)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="bg-transparent h-11 w-full justify-start gap-4 rounded-none p-0 px-4 border-b border-slate-100 overflow-x-auto scrollbar-hide shrink-0">
            <TabsTrigger value="details" className={TAB_TRIGGER_CLASS}>
              Details
            </TabsTrigger>
            <TabsTrigger value="driver" className={TAB_TRIGGER_CLASS}>
              Driver
            </TabsTrigger>
            <TabsTrigger value="trip" className={TAB_TRIGGER_CLASS}>
              Trip
            </TabsTrigger>
            <TabsTrigger value="device" className={TAB_TRIGGER_CLASS}>
              Device
            </TabsTrigger>
            <TabsTrigger value="packets" className={TAB_TRIGGER_CLASS}>
              Live IoT
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="details"
            className="flex-1 overflow-y-auto p-4 m-0"
          >
            <DetailsTab
              resolved={resolved}
              todayText={formatToday(selectedVehicle.attributes?.odometer)}
            />
          </TabsContent>
          <TabsContent
            value="driver"
            className="flex-1 overflow-y-auto p-4 m-0"
          >
            <DriverTab
              driver={driverData?.data ?? null}
              isLoading={isLoadingDriver}
              assignedDate={assignedDate}
            />
          </TabsContent>
          <TabsContent value="trip" className="flex-1 overflow-y-auto p-4 m-0">
            <TripTab trip={tripData} isLoading={isLoadingTrip} />
          </TabsContent>
          <TabsContent
            value="device"
            className="flex-1 overflow-y-auto p-4 m-0"
          >
            <DeviceTab
              device={selectedVehicle.relationships?.device}
              resolved={resolved}
              deviceInfoData={deviceInfoData}
            />
          </TabsContent>
          <TabsContent value="packets" className="flex-1 min-h-0 m-0">
            <PacketStreamTab
              vehicleId={String(selectedVehicle.id)}
              plate={plate}
            />
          </TabsContent>
        </Tabs>
      )}

      {shareLat != null && shareLng != null && (
        <ShareLocationModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          label={plate}
          lat={shareLat}
          lng={shareLng}
        />
      )}
    </div>
  );
}
