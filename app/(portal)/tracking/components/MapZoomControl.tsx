"use client";

import { Plus, Minus } from "lucide-react";

export function MapZoomControl() {
  return (
    <div className="hidden md:flex absolute left-4 top-4 z-30 flex-col bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => (window as any).leafletMap?.zoomIn()}
        aria-label="Zoom in"
        className="h-9 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        onClick={() => (window as any).leafletMap?.zoomOut()}
        aria-label="Zoom out"
        className="h-9 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
  );
}
