"use client";

import { useRouter } from "next/navigation";
import {
  RefreshCw,
  History,
  Crosshair,
  ShieldCheck,
  Map as MapIcon,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrackingControlDeckProps {
  viewMode: "all" | "focused";
  setViewMode: (mode: "all" | "focused") => void;
  mapStyle: "standard" | "satellite" | "hybrid";
  setMapStyle: (style: "standard" | "satellite" | "hybrid") => void;
  showGeofences: boolean;
  setShowGeofences: (show: boolean) => void;
  selectedClusterIds: string[];
  onOpenClusterModal: () => void;
  onRefresh: () => void;
}

export function TrackingControlDeck({
  viewMode,
  setViewMode,
  mapStyle,
  setMapStyle,
  showGeofences,
  setShowGeofences,
  selectedClusterIds,
  onOpenClusterModal,
  onRefresh,
}: TrackingControlDeckProps) {
  const router = useRouter();

  return (
    <div className="absolute right-6 top-6 z-30 flex flex-col gap-4">
      <TooltipProvider delayDuration={0}>
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-2 overflow-hidden items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setViewMode("all")}
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                  viewMode === "all"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "text-slate-400 hover:bg-slate-50 hover:text-blue-600",
                )}
              >
                <MapIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest"
            >
              Global Fleet Tracking
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setViewMode("focused")}
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                  viewMode === "focused"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "text-slate-400 hover:bg-slate-50 hover:text-blue-600",
                )}
              >
                <Crosshair className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest"
            >
              Focus Mission Tracking
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-2 overflow-hidden items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (viewMode === "all") router.push("/tracking/playback");
                }}
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                  viewMode === "all"
                    ? "text-slate-400 hover:bg-slate-50 hover:text-purple-500"
                    : "text-slate-200 cursor-not-allowed",
                )}
              >
                <History className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest"
            >
              Fleet Playback Router
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  setMapStyle(mapStyle === "standard" ? "satellite" : "standard")
                }
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                  mapStyle === "satellite"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:bg-slate-50 hover:text-blue-600",
                )}
              >
                <MapIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest"
            >
              Toggle Satellite View
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onRefresh}
                className="h-12 w-12 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all group"
              >
                <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest"
            >
              Re-Sync Fleet Data
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenClusterModal}
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                  selectedClusterIds.length > 0
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "text-slate-400 hover:bg-slate-50 hover:text-blue-600",
                )}
              >
                <SlidersHorizontal className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest"
            >
              Filter by Cluster
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowGeofences(!showGeofences)}
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group",
                  showGeofences
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                    : "text-slate-400 hover:bg-slate-50 hover:text-emerald-600",
                )}
              >
                <ShieldCheck className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 text-white border-none font-black text-[10px] uppercase tracking-widest"
            >
              Toggle Geofences
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-2 flex flex-col gap-1 overflow-hidden items-center">
          <button
            onClick={() => (window as any).leafletMap?.zoomIn()}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-900 font-black hover:bg-slate-50 transition-colors border-b border-slate-50"
          >
            +
          </button>
          <button
            onClick={() => (window as any).leafletMap?.zoomOut()}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-900 font-black hover:bg-slate-50 transition-colors"
          >
            -
          </button>
        </div>
      </TooltipProvider>
    </div>
  );
}
