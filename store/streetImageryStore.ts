import { create } from "zustand";
import type { StreetImageryPoint } from "@/lib/streetImagery/types";

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

interface StreetImageryState {
  isOpen: boolean;
  requestedPoint: StreetImageryPoint | null;
  context: StreetImageryContext | null;
  open: (point: StreetImageryPoint, context: StreetImageryContext) => void;
  close: () => void;
}

export const useStreetImageryStore = create<StreetImageryState>((set) => ({
  isOpen: false,
  requestedPoint: null,
  context: null,
  open: (point, context) => set({ isOpen: true, requestedPoint: point, context }),
  close: () => set({ isOpen: false }),
}));
