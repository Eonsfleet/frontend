"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as trackingApi from "@/lib/api/tracking";
import { getVehicleCurrentFuel } from "@/lib/api/fuel";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { resolveVehicleTelemetry, type ResolvedVehicleTelemetryInput } from "@/lib/resolveVehicleTelemetry";
import type { VehicleTelemetry } from "@/types";
import { reverseGeocode } from "@/lib/gps";

/**
 * Single hook that opens the Layer-2 per-vehicle WS subscriptions (via
 * useVehicleTelemetry) and the sensor-health/current-fuel REST queries once per
 * selected vehicle, then resolves it all into one consistent object. Call this
 * ONCE at the AssetPanel level and pass the result down to tabs/cards as props —
 * calling it from multiple tabs independently would open duplicate WS channels.
 */
export function useResolvedVehicleTelemetry(
  vehicleId: string | number | null,
  vehicle: ResolvedVehicleTelemetryInput["vehicle"],
  isActive: boolean,
) {
  const { data: sensorData, isLoading: isLoadingSensors } = useQuery({
    queryKey: ["sensor-health", vehicleId],
    queryFn: () => trackingApi.getVehicleSensorHealth(vehicleId!),
    enabled: isActive && !!vehicleId,
  });

  const { data: currentFuelData, isLoading: isFuelLoading } = useQuery({
    queryKey: ["vehicle-current-fuel", vehicleId],
    queryFn: () => getVehicleCurrentFuel(vehicleId!),
    enabled: isActive && !!vehicleId,
    refetchInterval: 30_000,
  });

  const { telemetry, deviceStatus } = useVehicleTelemetry(
    isActive ? (vehicleId as string) : null,
    vehicle?.raw?.device_id ?? (vehicle as Record<string, unknown> | null)?.device_id as string | undefined,
    (vehicle as Record<string, unknown> | null)?.imei as string | undefined,
  );

  const apiFuel = currentFuelData?.data?.fuel_level;
  const meta = (telemetry as VehicleTelemetry & { metadata?: Record<string, unknown> } | null)?.metadata ?? {};
  const currentBatteryV = (meta.battery_voltage as number | string | undefined) ?? telemetry?.battery_voltage ?? vehicle?.voltage;
  const currentExtV = (meta.external_voltage as number | string | undefined) ?? telemetry?.external_voltage ?? vehicle?.ext_voltage;

  // "Remember the last known-good value" latch, done as a render-time state
  // adjustment (React's documented pattern for this) rather than an effect, so
  // it doesn't cause an extra cascading render on every packet.
  const [lastKnownBatteryV, setLastKnownBatteryV] = useState<number | string | null>(null);
  const [lastKnownExtV, setLastKnownExtV] = useState<number | string | null>(null);
  const [prevVehicleId, setPrevVehicleId] = useState<string | number | null>(null);

  if (vehicleId !== prevVehicleId) {
    setPrevVehicleId(vehicleId);
    setLastKnownBatteryV(null);
    setLastKnownExtV(null);
  }

  if (currentBatteryV != null && currentBatteryV !== "---" && currentBatteryV !== lastKnownBatteryV) {
    setLastKnownBatteryV(currentBatteryV);
  }
  if (currentExtV != null && currentExtV !== "---" && currentExtV !== lastKnownExtV) {
    setLastKnownExtV(currentExtV);
  }

  const resolved = resolveVehicleTelemetry({
    vehicle,
    telemetry,
    apiFuel,
    deviceHasFuel: currentFuelData?.data?.vehicle?.device_has_fuel ?? null,
    deviceStatus,
    sensorHealth: sensorData?.data ?? null,
    lastKnownBatteryV,
    lastKnownExtV,
  });

  const { data: geocodedAddress } = useQuery({
    queryKey: ["reverse-geocode", resolved.lat, resolved.lng],
    queryFn: () => reverseGeocode(resolved.lat, resolved.lng),
    enabled: isActive && !resolved.address && !!resolved.lat && !!resolved.lng,
    staleTime: 5 * 60_000,
  });

  return {
    ...resolved,
    address: resolved.address ?? geocodedAddress ?? null,
    isLoadingSensors,
    isFuelLoading,
  };
}
