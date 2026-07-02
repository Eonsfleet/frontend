"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";

/**
 * Non-blocking connection-lifecycle banner for the Live Tracking map. The map
 * stays fully interactive underneath at all times — this only communicates state.
 */
export function ConnectionBanner() {
  const { status } = useConnectionStatus();
  const [showRestored, setShowRestored] = useState(false);
  // "Was previously down" doesn't need to trigger its own render — a ref avoids
  // the cascading-setState pattern of two dependent setState calls in one effect.
  const wasDownRef = useRef(false);

  useEffect(() => {
    if (status === "disconnected" || status === "failed") {
      wasDownRef.current = true;
      return;
    }
    if (status === "connected" && wasDownRef.current) {
      wasDownRef.current = false;
      // Genuinely synchronizing with an external system (the WS connection
      // lifecycle from useConnectionStatus) on a one-shot transition, not
      // deriving state from props — the textbook valid effect use case.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowRestored(true);
      const t = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const isDown = status === "disconnected" || status === "failed";

  if (!isDown && !showRestored) return null;

  return (
    <div
      className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-2xl border backdrop-blur-xl text-[11px] font-black uppercase tracking-widest transition-all",
          isDown
            ? "bg-rose-600/95 border-rose-400/30 text-white"
            : "bg-emerald-600/95 border-emerald-400/30 text-white",
        )}
      >
        {isDown ? (
          <>
            <WifiOff className="h-4 w-4" />
            Connection Lost — showing last known positions
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" />
            Live connection restored
          </>
        )}
      </div>
    </div>
  );
}
