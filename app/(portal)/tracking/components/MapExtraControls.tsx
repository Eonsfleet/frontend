"use client";

import { Maximize, Minimize, LocateFixed } from "lucide-react";

interface MapExtraControlsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Bumps `zoomResetKey`, which useMapCameraFollow reacts to by re-fitting the fleet. */
  onRecenter: () => void;
}

export function MapExtraControls({ isFullscreen, onToggleFullscreen, onRecenter }: MapExtraControlsProps) {
  return (
    <div className="hidden md:flex flex-col bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <button
        onClick={onRecenter}
        aria-label="Recenter map"
        className="h-9 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"
      >
        <LocateFixed className="h-4 w-4" />
      </button>
      <button
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        className="h-9 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </button>
    </div>
  );
}
