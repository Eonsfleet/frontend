import apiClient from "./client";

export interface TrackingMetric {
  total_active_assets: number;
  moving_assets: number;
  idle_assets: number;
  offline_assets: number;
}

export const getTrackingMetrics = async () => {
  const res = await apiClient.get("/tracker/metrics");
  return res.data;
};

export const getVehiclePlayback = async (
  vehicleId: string | number,
  startDate: string,
  endDate: string,
) => {
  const res = await apiClient.get(`/vehicles/${vehicleId}/playback`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return res.data;
};

export const getDeviceStatus = async (deviceIdent: string) => {
  const res = await apiClient.get(`/tracker/${deviceIdent}`);
  return res.data;
};

export const getDevices = async (
  params?: any,
): Promise<{ data: { devices: any[]; pagination: any } }> => {
  const res = await apiClient.get("/devices", { params });
  return res.data;
};

export type DeviceExportFormat = "excel" | "csv";

export const deviceExportExtension = (format: DeviceExportFormat): string =>
  format === "csv" ? "csv" : "xlsx";

/**
 * `/devices/export` defaults to `format=json` server-side, so the format must be
 * sent explicitly — otherwise the response is a JSON envelope that ends up saved
 * under a spreadsheet extension. The backend renders the header row and columns
 * itself (ID, IMEI, Phone Number, Country, Status, Online, Has Fuel Sensor,
 * Last Packet At, Vehicle Reg., Created At), so nothing is formatted here.
 */
export const exportDevices = async (params?: {
  status?: "online" | "offline";
  format?: DeviceExportFormat;
}): Promise<Blob> => {
  const { format = "excel", ...filters } = params ?? {};

  const res = await apiClient.get("/devices/export", {
    params: { ...filters, format },
    responseType: "blob",
  });

  const blob: Blob = res.data;
  if (blob.type?.includes("application/json")) {
    throw new Error(
      "The export did not return a spreadsheet. The server responded with JSON.",
    );
  }

  return blob;
};

/**
 * Device hardware record (IMEI, phone number, online status, linked hardware
 * model) — distinct from getDeviceStatus, which hits /tracker/{imei} and only
 * returns GPS telemetry, not device attributes. `id` is the device's own DB
 * id/uuid (relationships.device.id on a vehicle), not its IMEI.
 */
export const getDeviceById = async (id: string | number) => {
  const res = await apiClient.get(`/devices/${id}`);
  return res.data;
};

export const getTripPlayback = async (
  vehicleId: string | number,
  tripId: string | number,
  params?: {
    include_gps_points?: boolean;
    include_events?: boolean;
    point_interval?: number;
  },
) => {
  const res = await apiClient.get(
    `/vehicles/${vehicleId}/trips/${tripId}/playback`,
    { params },
  );
  return res.data;
};

export const getVehicleSensorHealth = async (
  vehicleId: string | number,
  params?: {
    include_history?: boolean;
    anomaly_threshold?: string;
  },
) => {
  const res = await apiClient.get(`/vehicles/${vehicleId}/sensors/health`, {
    params,
  });
  return res.data;
};

/** One endpoint of a journey: where it began, ended, or paused. */
export interface RouteHistoryPlace {
  latitude: number;
  longitude: number;
  /** Null when the endpoint could not be named — render the coordinates instead. */
  address: string | null;
}

export interface RouteHistoryStop extends RouteHistoryPlace {
  arrived_at: string;
  departed_at: string;
  duration_seconds: number;
}

export interface RouteHistoryPathPoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
}

/** A single journey the vehicle made, derived server-side from its GPS packets. */
export interface RouteHistorySegment {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  idle_seconds: number;
  distance_km: number;
  max_speed: number;
  avg_speed: number;
  stops: number;
  start: RouteHistoryPlace;
  end: RouteHistoryPlace;
  stop_points: RouteHistoryStop[];
  /** Empty when the request passed include_path=false. */
  path: RouteHistoryPathPoint[];
}

export interface RouteHistorySummary {
  trips: number;
  distance_km: number;
  duration_seconds: number;
  idle_seconds: number;
  stops: number;
  max_speed: number;
  avg_speed: number;
}

export interface RouteHistoryResponse {
  message: string;
  data: RouteHistorySegment[];
  meta: {
    total: number;
    vehicle_id: string;
    start_date: string;
    end_date: string;
    summary: RouteHistorySummary;
  };
}

/** Widest window the endpoint accepts, in days — mirrors RouteHistoryService::MAX_WINDOW_DAYS. */
export const ROUTE_HISTORY_MAX_WINDOW_DAYS = 31;

/**
 * Historical journeys for a vehicle over a date range.
 *
 * Distinct from getVehiclePlayback, which returns every raw frame for at most
 * 24 hours: this collapses the window into journeys (start, end, distance,
 * duration, stops) and accepts up to 31 days.
 */
export const getVehicleRouteHistory = async (
  vehicleId: string | number,
  startDate: string,
  endDate: string,
  options?: { includePath?: boolean },
): Promise<RouteHistoryResponse> => {
  const res = await apiClient.get(`/vehicles/${vehicleId}/route-history`, {
    params: {
      start_date: startDate,
      end_date: endDate,
      include_path: options?.includePath === false ? 0 : 1,
    },
  });
  return res.data;
};
