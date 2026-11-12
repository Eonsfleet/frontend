/**
 * Shared vehicle telemetry resolution — extracted from the retired
 * components/live/TelemetryDrawer.tsx so every Live Tracking detail tab and
 * bottom card resolves the same values the same way, instead of re-deriving
 * this fallback-chain logic independently in each component.
 *
 * Resolution priority throughout: WS telemetry (live) > tracking-list prop
 * (REST/WS-merged snapshot) > raw REST snapshot > API endpoint fallback.
 */

export interface ResolvedVehicleTelemetryInput {
  vehicle: {
    plate: string;
    make?: string;
    model?: string;
    speed?: number;
    fuel?: number | null;
    fuel_liters?: number;
    fuel_basis?: string | null;
    temp?: number;
    status?: string;
    voltage?: number | string;
    ext_voltage?: number | string;
    signal?: string;
    ignition?: boolean;
    odometer?: number;
    lat?: number;
    lng?: number;
    lastUpdate?: string;
    /** vehicle.last_packet_received_at (device-level, server-recorded receipt time) — the
     * same underlying value the Device tab shows as "Last Packet Received", so "Last Update"
     * can stay in sync with it instead of drifting from a WS packet's own embedded timestamp. */
    lastPacketReceivedAt?: string | null;
    address?: string | null;
    heading?: number;
    rpm?: number;
    fuel_rate?: number;
    eco_score?: number;
    idling?: boolean;
    jamming?: boolean;
    immobilizer?: boolean;
    driving_state?: string;
    altitude?: number | null;
    movement?: string | null;
    gps_confidence?: number | null;
    raw?: any;
  } | null;
  telemetry: any;
  apiFuel?: {
    fuel_level_percent?: number;
    fuel_level_liters?: number;
    tank_capacity?: number;
    data_quality_score?: number;
    last_updated?: string;
  } | null;
  deviceHasFuel?: boolean | null;
  deviceStatus: string | null;
  sensorHealth?: { battery_voltage?: any; signal_strength?: string; obd_status?: string } | null;
  /** Last known-good battery/ext voltage, to avoid flicker when a packet momentarily omits it */
  lastKnownBatteryV?: number | string | null;
  lastKnownExtV?: number | string | null;
}

/**
 * Builds the flat "vehicle snapshot" shape resolveVehicleTelemetry expects, from
 * a tracking-list Vehicle record plus its merged locations[id] entry. Centralizes
 * what used to be an inline object literal built ad hoc wherever the telemetry
 * panel was opened.
 */
export function buildVehicleSnapshot(selectedVehicle: any, loc: any) {
  if (!selectedVehicle) return null;
  const rel = selectedVehicle.relationships?.current_location;
  return {
    plate: selectedVehicle.attributes.registration_number,
    make: selectedVehicle.attributes.make,
    model: selectedVehicle.attributes.model,
    device_id: selectedVehicle.attributes.device_id ?? null,
    imei:
      selectedVehicle.relationships?.device?.imei ??
      selectedVehicle.relationships?.device?.data?.imei ??
      null,
    altitude: loc?.altitude ?? null,
    movement: loc?.movement ?? null,
    speed: loc?.speed ?? rel?.speed ?? 0,
    // Missing fuel data stays null (not 0) so callers can render "unavailable"
    // instead of misreading "no sensor reading" as "empty tank".
    fuel: loc?.fuel ?? loc?.fuel_level_percent ?? null,
    fuel_liters: loc?.fuel_liters ?? loc?.fuel_level_liters,
    fuel_consumed: loc?.fuel_consumed ?? (loc?.metadata as any)?.fuel_consumed ?? null,
    fuel_used_gps: loc?.fuel_used_gps ?? (loc?.metadata as any)?.fuel_used_gps ?? null,
    fuel_level_obd: loc?.fuel_level_obd ?? (loc?.metadata as any)?.fuel_level_obd ?? null,
    fuel_source: loc?.fuel_source ?? (loc?.metadata as any)?.fuel_source ?? null,
    temp: loc?.engine_temperature ?? 0,
    status: loc?.status,
    voltage: loc?.battery_voltage,
    ext_voltage: loc?.external_voltage,
    satellites: loc?.satellites ?? null,
    signal: loc?.satellites != null ? `${loc.satellites} Sats` : "---",
    ignition: loc?.ignition ?? false,
    // mileage_km, not odometer_km: System 2 documents odometer_km as the
    // device's own counter with an arbitrary base (one live unit reads
    // 4,121,010 km), so only its delta means anything. mileage_km is that
    // counter rebased onto the vehicle's real odometer — the one to show.
    odometer:
      loc?.odometer ?? loc?.mileage_km ?? selectedVehicle.attributes?.odometer?.lifetime_km,
    gps_confidence: loc?.gps_confidence ?? null,
    lat: loc?.lat ?? rel?.latitude,
    lng: loc?.lng ?? rel?.longitude,
    lastUpdate:
      loc?.lastUpdate ??
      selectedVehicle.attributes?.last_packet_received_at ??
      rel?.last_packet_received_at ??
      rel?.created_at,
    lastPacketReceivedAt:
      selectedVehicle.attributes?.last_packet_received_at ??
      loc?.lastPacket ??
      rel?.last_packet_received_at ??
      null,
    address: loc?.address ?? null,
    heading: loc?.heading ?? 0,
    rpm: loc?.engine_rpm,
    fuel_rate: loc?.fuel_rate,
    eco_score: loc?.eco_score,
    idling: loc?.idling ?? false,
    jamming: loc?.jamming ?? false,
    immobilizer: loc?.immobilizer ?? false,
    driving_state: loc?.driving_state,
    raw: loc?.raw ?? loc ?? rel,
  };
}

export function formatVoltage(value: number | string | null | undefined): string {
  if (value == null) return "---";
  let numValue: number;
  if (typeof value === "string") {
    numValue = parseFloat(value.toLowerCase().replace(/v$/, "").trim());
  } else {
    numValue = value;
  }
  if (isNaN(numValue)) return "---";
  return `${numValue.toFixed(3)}V`;
}

export function parseTS(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  return new Date(ts.endsWith("Z") || ts.includes("+") ? ts : ts + "Z");
}

export function fmtTime(ts: string | null | undefined): string | null {
  const d = parseTS(ts);
  return d
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;
}

export function compassLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function statusLabel(s: string): string {
  if (s === "in_transit") return "Moving";
  if (s === "stopped" || s === "parked") return "Stopped";
  if (s === "idle") return "Idling";
  if (s === "offline") return "Offline";
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Online";
}

export function resolveVehicleTelemetry({
  vehicle,
  telemetry,
  apiFuel,
  deviceHasFuel,
  deviceStatus,
  sensorHealth,
  lastKnownBatteryV,
  lastKnownExtV,
}: ResolvedVehicleTelemetryInput) {
  const meta = (telemetry as any)?.metadata ?? {};
  const raw = vehicle?.raw ?? {};

  const resolvedFuel =
    vehicle?.fuel ??
    meta.fuel_level_percent ??
    telemetry?.fuel_level_percent ??
    apiFuel?.fuel_level_percent;

  const liveSpeed = telemetry?.speed ?? vehicle?.speed ?? 0;
  const liveHeading = telemetry?.heading ?? vehicle?.heading ?? 0;
  const liveIgnition = telemetry
    ? telemetry.ignition === "on" || telemetry.ignition === "1" || telemetry.ignition === true
    : (vehicle?.ignition as any) === "on" || (vehicle?.ignition as any) === "1" || vehicle?.ignition === true;
  const liveMovement = telemetry?.movement ?? vehicle?.movement;
  const liveStatus = telemetry?.status ?? vehicle?.status;
  const liveLat = telemetry?.latitude ?? telemetry?.lat ?? vehicle?.lat;
  const liveLng = telemetry?.longitude ?? telemetry?.lng ?? vehicle?.lng;
  const liveAltitude = telemetry?.altitude ?? vehicle?.altitude ?? raw.altitude;
  const liveSatellites = telemetry?.satellites ?? raw.satellites ?? null;
  const liveOdo =
    telemetry?.odometer ?? telemetry?.mileage_km ?? vehicle?.odometer ?? raw.odometer ?? raw.mileage_km;
  // Not every device/protocol reports engine hours — surface it only when the
  // device actually sends it rather than fabricating a value from unrelated data.
  const liveEngineHours = meta.engine_hours ?? telemetry?.engine_hours ?? raw.engine_hours ?? null;
  // "Last Update" must sync with "last packet received" (shown on the Device
  // tab from vehicle.last_packet_received_at) rather than drift from it — so
  // it's the primary source here, not telemetry.gps_datetime (the device's own
  // clock, which can report a bogus fallback date before acquiring a GPS fix).
  // A live WS packet's timestamp_utc only wins when it's actually newer than
  // the last REST-recorded receipt time, so streaming still feels live without
  // ever showing an earlier moment than what "last packet received" reports.
  // timestamp_utc is the per-vehicle channel's key; the fleet channel calls the
  // same value `timestamp`. Reading only the former meant a fleet packet could
  // never win the comparison below, so "Last Update" sat on the REST value.
  const wsPacketTs = telemetry?.timestamp_utc ?? telemetry?.timestamp;
  const wsTimestampMs = wsPacketTs ? new Date(wsPacketTs).getTime() : 0;
  const restReceivedMs = vehicle?.lastPacketReceivedAt ? new Date(vehicle.lastPacketReceivedAt).getTime() : 0;
  const liveLastUpdate =
    wsTimestampMs > restReceivedMs
      ? wsPacketTs
      : (vehicle?.lastPacketReceivedAt ?? wsPacketTs ?? telemetry?.gps_datetime ?? vehicle?.lastUpdate);
  const liveRpm = meta.engine_rpm ?? telemetry?.engine_rpm ?? raw.engine_rpm ?? vehicle?.rpm;
  const liveRpmObd = meta.engine_rpm_obd ?? telemetry?.engine_rpm_obd ?? raw.engine_rpm_obd;
  const liveOilLevel = meta.oil_level ?? telemetry?.oil_level ?? raw.oil_level;
  const liveFuelRate =
    meta.fuel_rate_gps ??
    meta.fuelRateGps ??
    meta.fuel_rate ??
    meta.fuelRate ??
    telemetry?.fuel_rate ??
    telemetry?.fuelRate ??
    raw.fuel_rate ??
    raw.fuelRate ??
    (raw.metadata as any)?.fuel_rate ??
    (raw.metadata as any)?.fuelRate ??
    (vehicle as any)?.fuel_rate ??
    (vehicle as any)?.fuelRate ??
    (vehicle as any)?.fuel_rate_gps ??
    null;
  const liveFuelConsumed =
    meta.fuel_consumed ??
    meta.fuelConsumed ??
    meta.fuel_consumed_counted ??
    meta.fuel_consumed_delta ??
    telemetry?.fuel_consumed ??
    telemetry?.fuelConsumed ??
    telemetry?.fuel_consumed_counted ??
    telemetry?.fuel_consumed_delta ??
    raw.fuel_consumed ??
    raw.fuelConsumed ??
    raw.fuel_consumed_counted ??
    raw.fuel_consumed_delta ??
    (raw.metadata as any)?.fuel_consumed ??
    (raw.metadata as any)?.fuelConsumed ??
    (raw.metadata as any)?.fuel_consumed_counted ??
    (vehicle as any)?.fuel_consumed ??
    (vehicle as any)?.fuelConsumed ??
    null;
  const liveFuelUsedGps =
    meta.fuel_used_gps ??
    meta.fuelUsedGps ??
    telemetry?.fuel_used_gps ??
    telemetry?.fuelUsedGps ??
    raw.fuel_used_gps ??
    raw.fuelUsedGps ??
    (raw.metadata as any)?.fuel_used_gps ??
    (raw.metadata as any)?.fuelUsedGps ??
    (vehicle as any)?.fuel_used_gps ??
    (vehicle as any)?.fuelUsedGps ??
    null;
  const liveFuelLevelObd =
    meta.fuel_level_obd ??
    meta.fuelLevelObd ??
    telemetry?.fuel_level_obd ??
    telemetry?.fuelLevelObd ??
    raw.fuel_level_obd ??
    raw.fuelLevelObd ??
    (raw.metadata as any)?.fuel_level_obd ??
    (raw.metadata as any)?.fuelLevelObd ??
    (vehicle as any)?.fuel_level_obd ??
    (vehicle as any)?.fuelLevelObd ??
    null;
  const liveFuelSource =
    meta.fuel_source ??
    meta.fuelSource ??
    telemetry?.fuel_source ??
    telemetry?.fuelSource ??
    raw.fuel_source ??
    raw.fuelSource ??
    (raw.metadata as any)?.fuel_source ??
    (raw.metadata as any)?.fuelSource ??
    (vehicle as any)?.fuel_source ??
    (vehicle as any)?.fuelSource ??
    null;
  const liveEcoScore = meta.eco_score ?? telemetry?.eco_score ?? raw.eco_score ?? vehicle?.eco_score;
  const liveIdling = meta.idling ?? telemetry?.idling ?? raw.idling ?? vehicle?.idling ?? false;
  const liveJamming = meta.jamming ?? telemetry?.jamming ?? raw.jamming ?? vehicle?.jamming ?? false;
  const liveImmobilizer =
    meta.immobilizer ?? telemetry?.immobilizer ?? raw.immobilizer ?? vehicle?.immobilizer ?? false;
  const liveUnplug = meta.unplug ?? telemetry?.unplug ?? raw.unplug ?? false;
  const liveSleepMode = meta.sleep_mode ?? telemetry?.sleep_mode ?? raw.sleep_mode;
  const liveDoorStatus = meta.door_status ?? telemetry?.door_status ?? raw.door_status;
  const liveLoadWeight = meta.load_weight ?? telemetry?.load_weight ?? raw.load_weight;
  const liveDrivingState =
    meta.driving_state ?? telemetry?.driving_state ?? raw.driving_state ?? vehicle?.driving_state;

  const currentBatteryV =
    meta.battery_voltage ?? telemetry?.battery_voltage ?? raw.battery_voltage ?? vehicle?.voltage;
  const currentExtV =
    meta.external_voltage ?? telemetry?.external_voltage ?? raw.external_voltage ?? vehicle?.ext_voltage;

  const liveBatteryV =
    currentBatteryV != null && currentBatteryV !== "---" ? currentBatteryV : lastKnownBatteryV;
  const liveExtV = currentExtV != null && currentExtV !== "---" ? currentExtV : lastKnownExtV;

  const liveBatteryCurrent = meta.battery_current ?? telemetry?.battery_current ?? raw.battery_current;
  const liveEngineTemp =
    meta.engine_temperature ?? telemetry?.engine_temperature ?? raw.engine_temperature ?? vehicle?.temp ?? 0;
  const liveRssi = meta.rssi ?? telemetry?.rssi ?? null;
  const liveHdop = meta.hdop ?? telemetry?.hdop ?? null;
  // GSM operator code (MCC+MNC) — the closest thing to a "network/carrier" signal
  // the ingest pipeline actually broadcasts (see EXTENDED_METADATA_KEYS on the
  // backend); there's no separate carrier-name field, so it's shown as-is.
  const liveGsmOperator = meta.active_gsm_operator ?? telemetry?.active_gsm_operator ?? raw.active_gsm_operator ?? null;
  const liveMileage =
    meta.mileage ??
    meta.total_mileage ??
    meta.total_mileage_counted ??
    telemetry?.total_mileage ??
    raw.total_mileage ??
    raw.total_mileage_counted ??
    null;
  const liveTripOdo = meta.trip_odometer ?? telemetry?.trip_odometer ?? raw.trip_odometer ?? null;
  // Distinct from the protocol `confidence` below — this is the ingest
  // pipeline's confidence in the GPS fix itself.
  const liveGpsConfidence =
    telemetry?.gps_confidence ?? raw.gps_confidence ?? vehicle?.gps_confidence ?? null;
  const liveOdoSource = meta.odometer_source ?? telemetry?.odometer_source ?? raw.odometer_source ?? null;
  const liveProtocol = meta.protocol_name ?? telemetry?.protocol_name ?? raw.protocol_name ?? null;
  const liveConfidence = meta.confidence ?? telemetry?.confidence ?? raw.confidence ?? null;

  const liveFuel = resolvedFuel;
  const liveFuelLiters =
    vehicle?.fuel_liters ?? meta.fuel_level_liters ?? telemetry?.fuel_level_liters ?? apiFuel?.fuel_level_liters;
  const fuelTankCap = apiFuel?.tank_capacity ?? null;
  const fuelQuality = apiFuel?.data_quality_score ?? null;
  const fuelLastUpdate = apiFuel?.last_updated ?? null;

  const isDeviceOnline =
    deviceStatus === "online" ? true : deviceStatus === "offline" ? false : vehicle?.status !== "offline";

  const fuelColor =
    liveFuel == null ? "bg-slate-300" : liveFuel < 20 ? "bg-rose-500" : liveFuel < 40 ? "bg-amber-500" : "bg-emerald-500";
  const ecoColor =
    liveEcoScore == null ? "" : liveEcoScore >= 70 ? "text-emerald-600" : liveEcoScore >= 40 ? "text-amber-600" : "text-rose-600";
  const ecoRingColor =
    liveEcoScore == null ? "#e2e8f0" : liveEcoScore >= 70 ? "#16a34a" : liveEcoScore >= 40 ? "#d97706" : "#dc2626";

  const parsedBatteryV = (() => {
    if (liveBatteryV == null) return null;
    if (typeof liveBatteryV === "string") {
      return parseFloat(liveBatteryV.toLowerCase().replace(/v$/, "").trim());
    }
    return Number(liveBatteryV);
  })();

  const batteryWarn = parsedBatteryV != null && !isNaN(parsedBatteryV) && parsedBatteryV < 11.8;
  const tempWarn = liveEngineTemp > 105;
  const weakGps = liveSatellites != null && liveSatellites < 4;

  const health = sensorHealth || {
    battery_voltage: liveBatteryV || "---",
    signal_strength:
      liveRssi != null ? `${liveRssi} dBm` : liveSatellites != null ? `${liveSatellites} Sats` : vehicle?.signal || "---",
    obd_status: liveDrivingState || "---",
  };

  return {
    address: telemetry?.address ?? vehicle?.address ?? null,
    speed: liveSpeed,
    heading: liveHeading,
    ignition: liveIgnition,
    movement: liveMovement,
    status: liveStatus,
    lat: liveLat,
    lng: liveLng,
    altitude: liveAltitude,
    satellites: liveSatellites,
    odometer: liveOdo,
    engineHours: liveEngineHours,
    lastUpdate: liveLastUpdate,
    rpm: liveRpm,
    rpmObd: liveRpmObd,
    oilLevel: liveOilLevel,
    fuelRate: liveFuelRate,
    fuelConsumed: liveFuelConsumed,
    fuelUsedGps: liveFuelUsedGps,
    fuelLevelObd: liveFuelLevelObd,
    fuelSource: liveFuelSource,
    ecoScore: liveEcoScore,
    idling: liveIdling,
    jamming: liveJamming,
    immobilizer: liveImmobilizer,
    unplug: liveUnplug,
    sleepMode: liveSleepMode,
    doorStatus: liveDoorStatus,
    loadWeight: liveLoadWeight,
    drivingState: liveDrivingState,
    batteryV: liveBatteryV,
    extV: liveExtV,
    batteryCurrent: liveBatteryCurrent,
    engineTemp: liveEngineTemp,
    rssi: liveRssi,
    hdop: liveHdop,
    gsmOperator: liveGsmOperator,
    mileage: liveMileage,
    tripOdo: liveTripOdo,
    odoSource: liveOdoSource,
    protocol: liveProtocol,
    confidence: liveConfidence,
    gpsConfidence: liveGpsConfidence,
    fuel: liveFuel,
    fuelLiters: liveFuelLiters,
    fuelBasis: vehicle?.fuel_basis ?? null,
    fuelTankCap,
    fuelQuality,
    fuelLastUpdate,
    deviceHasFuel: deviceHasFuel ?? null,
    isDeviceOnline,
    fuelColor,
    ecoColor,
    ecoRingColor,
    batteryWarn,
    tempWarn,
    weakGps,
    health,
  };
}

export type ResolvedVehicleTelemetry = ReturnType<typeof resolveVehicleTelemetry>;
