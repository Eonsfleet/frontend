import { create } from "zustand";
import { PACKET_STREAM_MAX_ROWS_DEFAULT } from "@/lib/config";
import type { PacketStreamEntry } from "@/lib/packetStream";

interface PacketStreamState {
  buffers: Record<string, PacketStreamEntry[]>;
  maxRows: number;
  isPaused: boolean;
  /** Count of packets dropped while paused, per vehicle — shown as "Paused — N events not shown" */
  droppedWhilePaused: Record<string, number>;
  push: (entry: PacketStreamEntry) => void;
  setPaused: (paused: boolean) => void;
  setMaxRows: (n: number) => void;
  clear: (vehicleId?: string) => void;
}

export const usePacketStreamStore = create<PacketStreamState>((set, get) => ({
  buffers: {},
  maxRows: PACKET_STREAM_MAX_ROWS_DEFAULT,
  isPaused: false,
  droppedWhilePaused: {},

  push: (entry) => {
    const { isPaused, maxRows, buffers, droppedWhilePaused } = get();
    if (isPaused) {
      set({
        droppedWhilePaused: {
          ...droppedWhilePaused,
          [entry.vehicleId]: (droppedWhilePaused[entry.vehicleId] ?? 0) + 1,
        },
      });
      return;
    }
    const existing = buffers[entry.vehicleId] ?? [];
    const [mostRecent] = existing;
    const isDuplicate =
      mostRecent != null &&
      mostRecent.type === entry.type &&
      entry.receivedAt - mostRecent.receivedAt < 3000 &&
      JSON.stringify(mostRecent.raw) === JSON.stringify(entry.raw);
    if (isDuplicate) return;
    set({
      buffers: {
        ...buffers,
        [entry.vehicleId]: [entry, ...existing].slice(0, maxRows),
      },
    });
  },

  setPaused: (paused) => {
    if (!paused) {
      // Resuming clears the dropped counter — no backfill, just stop counting.
      set({ isPaused: false, droppedWhilePaused: {} });
    } else {
      set({ isPaused: true });
    }
  },

  setMaxRows: (n) => set({ maxRows: n }),

  clear: (vehicleId) =>
    set((state) => {
      if (!vehicleId) return { buffers: {}, droppedWhilePaused: {} };
      const { [vehicleId]: _omit, ...restBuffers } = state.buffers;
      const { [vehicleId]: _omitDrop, ...restDropped } = state.droppedWhilePaused;
      return { buffers: restBuffers, droppedWhilePaused: restDropped };
    }),
}));
