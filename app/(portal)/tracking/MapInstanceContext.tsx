"use client";

import { createContext, useContext } from "react";
import type { MapProvider, MapProviderKind } from "@/lib/map/types";

export interface MapInstanceContextValue {
  provider: MapProvider | null;
  providerKind: MapProviderKind | null;
  isReady: boolean;
  isFallback: boolean;
}

const defaultValue: MapInstanceContextValue = {
  provider: null,
  providerKind: null,
  isReady: false,
  isFallback: false,
};

const MapInstanceContext = createContext<MapInstanceContextValue>(defaultValue);

export const MapInstanceProvider = MapInstanceContext.Provider;

/**
 * Replaces the old `window.leafletMap` global — controls (zoom buttons,
 * recenter) read the active provider from here instead of reaching outside
 * React and assuming Leaflet is the engine.
 */
export function useMapInstance(): MapInstanceContextValue {
  return useContext(MapInstanceContext);
}
