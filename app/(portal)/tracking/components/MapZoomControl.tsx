"use client";

import { Plus, Minus } from "lucide-react";
import { useMapInstance } from "../MapInstanceContext";

export function MapZoomControl() {
  const { provider } = useMapInstance();

  return (
    <div className="hidden md:flex flex-col bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => provider?.zoomIn()}
        aria-label="Zoom in"
        className="h-9 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        onClick={() => provider?.zoomOut()}
        aria-label="Zoom out"
        className="h-9 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
  );
}
