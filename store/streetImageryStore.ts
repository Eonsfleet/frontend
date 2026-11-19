import { create } from "zustand";
import type { StreetImageryPoint, StreetImageryProviderKind } from "@/lib/streetImagery/types";

export interface StreetImageryContext {
  /** e.g. the vehicle's registration number. */
  label: string;
  /** e.g. vehicle status, or "Playback @ 14:32:05". */
  subtitle?: string;
  /** GPS fix / playback timestamp — shown distinctly from the imagery's own capture date. */
  sourceTimestamp?: string | null;
  /** Label for `sourceTimestamp` in the panel, e.g. "Playback timestamp". Defaults to "Vehicle location time". */
  sourceTimestampLabel?: string;
  /**
   * Present only for a live-tracking vehicle entry point — lets the panel
   * compare its frozen snapshot against the vehicle's live position and
   * show a "vehicle has moved" affordance instead of auto-jumping.
   */
  vehicleId?: string;
}

const PROVIDER_STORAGE_KEY = "street-imagery-provider";

function readStoredProvider(): StreetImageryProviderKind | null {
  try {
    const v = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
    return v === "google" || v === "mapillary" ? v : null;
  } catch {
    return null;
  }
}

interface StreetImageryState {
  /** The user's chosen imagery source; null = automatic (Google first). Remembered per browser. */
  preferredProvider: StreetImageryProviderKind | null;
  setPreferredProvider: (kind: StreetImageryProviderKind) => void;
  isOpen: boolean;
  requestedPoint: StreetImageryPoint | null;
  context: StreetImageryContext | null;
  open: (point: StreetImageryPoint, context: StreetImageryContext) => void;
  close: () => void;
}

export const useStreetImageryStore = create<StreetImageryState>((set) => ({
  preferredProvider: typeof window === "undefined" ? null : readStoredProvider(),
  setPreferredProvider: (kind) => {
    try {
      window.localStorage.setItem(PROVIDER_STORAGE_KEY, kind);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    set({ preferredProvider: kind });
  },
  isOpen: false,
  requestedPoint: null,
  context: null,
  open: (point, context) => set({ isOpen: true, requestedPoint: point, context }),
  close: () => set({ isOpen: false }),
}));
