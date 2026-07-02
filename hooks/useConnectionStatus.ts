"use client";

import { useEffect, useRef, useState } from "react";
import { getEcho } from "@/lib/echo";
import { WS_RECONNECT_DEBOUNCE_MS } from "@/lib/config";

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "failed";

interface UseConnectionStatusResult {
  status: ConnectionStatus;
  lastConnectedAt: number | null;
}

/**
 * Tracks the shared Echo/Pusher connection's lifecycle for UI purposes (the
 * "Connection Lost" / "Live connection restored" banner). This adds its own
 * listeners alongside (not replacing) the toast bindings already set up in
 * lib/echo.ts, and debounces transitions so brief reconnect blips don't flicker
 * the banner on/off.
 */
export function useConnectionStatus(): UseConnectionStatusResult {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastConnectedAt, setLastConnectedAt] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const echo = getEcho();
    const pusher = (echo as any)?.connector?.pusher;
    if (!pusher) return;

    const applyDebounced = (next: ConnectionStatus) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Connecting/connected can apply immediately (good news shouldn't be delayed);
      // only debounce the "bad news" transitions to avoid flicker on brief blips.
      if (next === "connected") {
        setStatus("connected");
        setLastConnectedAt(Date.now());
        return;
      }
      debounceRef.current = setTimeout(() => setStatus(next), WS_RECONNECT_DEBOUNCE_MS);
    };

    if (pusher.connection.state === "connected") {
      // Sync with the external Pusher connection's already-current state on
      // mount — a canonical "subscribe to external system" effect use case.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("connected");
      setLastConnectedAt(Date.now());
    }

    const onConnecting = () => applyDebounced("connecting");
    const onConnected = () => applyDebounced("connected");
    const onDisconnected = () => applyDebounced("disconnected");
    const onFailed = () => applyDebounced("failed");
    const onUnavailable = () => applyDebounced("disconnected");

    pusher.connection.bind("connecting", onConnecting);
    pusher.connection.bind("connected", onConnected);
    pusher.connection.bind("disconnected", onDisconnected);
    pusher.connection.bind("failed", onFailed);
    pusher.connection.bind("unavailable", onUnavailable);

    return () => {
      pusher.connection.unbind("connecting", onConnecting);
      pusher.connection.unbind("connected", onConnected);
      pusher.connection.unbind("disconnected", onDisconnected);
      pusher.connection.unbind("failed", onFailed);
      pusher.connection.unbind("unavailable", onUnavailable);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { status, lastConnectedAt };
}
