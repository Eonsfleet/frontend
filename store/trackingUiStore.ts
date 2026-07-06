import { create } from "zustand";

export type TrackingDetailTab = "details" | "driver" | "trip" | "device" | "packets" | "history";

export interface TrackingAdvancedFilters {
  clusterIds: string[];
  organizationId: string | null;
  driverId: string | null;
  vehicleType: string | null;
  fuelLevelMax: number | null;
  speedMin: number | null;
  speedMax: number | null;
  geofenceId: string | null;
}

export const EMPTY_ADVANCED_FILTERS: TrackingAdvancedFilters = {
  clusterIds: [],
  organizationId: null,
  driverId: null,
  vehicleType: null,
  fuelLevelMax: null,
  speedMin: null,
  speedMax: null,
  geofenceId: null,
};

interface TrackingUiState {
  activeTab: TrackingDetailTab;
  setActiveTab: (tab: TrackingDetailTab) => void;

  // Tablet: collapsible side panels
  isAssetListCollapsed: boolean;
  isAssetPanelCollapsed: boolean;
  toggleAssetList: () => void;
  toggleAssetPanel: () => void;

  // Mobile: bottom-sheet peek/expanded state
  mobileSheet: "none" | "list" | "detail" | "filters";
  setMobileSheet: (sheet: "none" | "list" | "detail" | "filters") => void;

  // Advanced/combinable filters (beyond the quick status chips)
  advancedFilters: TrackingAdvancedFilters;
  setAdvancedFilters: (filters: Partial<TrackingAdvancedFilters>) => void;
  resetAdvancedFilters: () => void;

  isAdvancedFiltersOpen: boolean;
  setAdvancedFiltersOpen: (open: boolean) => void;

  isMapFollowEnabled: boolean;
  setMapFollowEnabled: (enabled: boolean) => void;
}

export const useTrackingUiStore = create<TrackingUiState>((set) => ({
  activeTab: "details",
  setActiveTab: (tab) => set({ activeTab: tab }),

  isAssetListCollapsed: false,
  isAssetPanelCollapsed: false,
  toggleAssetList: () => set((s) => ({ isAssetListCollapsed: !s.isAssetListCollapsed })),
  toggleAssetPanel: () => set((s) => ({ isAssetPanelCollapsed: !s.isAssetPanelCollapsed })),

  mobileSheet: "none",
  setMobileSheet: (sheet) => set({ mobileSheet: sheet }),

  advancedFilters: EMPTY_ADVANCED_FILTERS,
  setAdvancedFilters: (filters) =>
    set((s) => ({ advancedFilters: { ...s.advancedFilters, ...filters } })),
  resetAdvancedFilters: () => set({ advancedFilters: EMPTY_ADVANCED_FILTERS }),

  isAdvancedFiltersOpen: false,
  setAdvancedFiltersOpen: (open) => set({ isAdvancedFiltersOpen: open }),

  isMapFollowEnabled: true,
  setMapFollowEnabled: (enabled) => set({ isMapFollowEnabled: enabled }),
}));
