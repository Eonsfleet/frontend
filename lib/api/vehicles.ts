import apiClient from "./client";
import { Vehicle, Paginated, VehiclePayload } from "@/types";

export type VehiclesView =
  | "default"
  | "summary"
  | "snapshot"
  | "tracking"
  | "telemetry"
  | "fuel"
  | "device"
  | "reporting"
  | "map";

export interface ListVehiclesParams {
  view?: VehiclesView;
  page?: number;
  per_page?: number;
  limit?: number;
  q?: string;
  status?: string;
  make?: string;
  model?: string;
  year?: string | number;
  fuel_type?: string;
  body_type?: string;
  type?: string;
}

export interface VehicleListResponse {
  message: string;
  data: {
    vehicles: Vehicle[];
    pagination: Paginated<Vehicle>["pagination"];
  };
}

/** Slim vehicle resource returned by `GET /vehicles?view=map` — panel/map only. */
export interface VehicleMapEntry {
  id: string;
  attributes: {
    registration_number: string;
    model?: string;
    device_status?: string;
    is_online?: boolean;
    /** Cluster the vehicle is assigned to, or null when unassigned. */
    cluster_id?: number | string | null;
    last_packet_received_at?: string | null;
    speed?: number | null;
    location?: { latitude: number; longitude: number } | null;
    fuel?: {
      level_liters: number | null;
      level_percent: number | null;
      /** "device": the tracker measured the litres. "calculated": from its percent level and the tank capacity. */
      liters_basis?: "device" | "calculated" | null;
    } | null;
  };
}

export interface VehiclesMapPageResponse {
  data: VehicleMapEntry[];
  pagination: Paginated<VehicleMapEntry>["pagination"];
}

/**
 * Single page of the map/tracking-panel feed — GET /vehicles?view=map. Callers
 * page through this manually (rather than via getVehiclesBatched) so the UI can
 * render each page as it arrives instead of blocking on the full fleet.
 */
export const getVehiclesMapPage = async (params: {
  page: number;
  per_page: number;
  q?: string;
}): Promise<VehiclesMapPageResponse> => {
  const response = await apiClient.get<{
    message: string;
    data: {
      vehicles: VehicleMapEntry[];
      pagination: Paginated<VehicleMapEntry>["pagination"];
    };
  }>("/vehicles", {
    params: {
      view: "map",
      page: params.page,
      per_page: params.per_page,
      q: params.q,
    },
  });
  return {
    data: response.data.data.vehicles,
    pagination: response.data.data.pagination,
  };
};

export interface VehicleDetailResponse {
  message: string;
  data: Vehicle;
}

export const getVehicles = async (
  params: ListVehiclesParams,
): Promise<Paginated<Vehicle>> => {
  const response = await apiClient.get<VehicleListResponse>("/vehicles", {
    params,
  });
  return {
    data: response.data.data.vehicles,
    pagination: response.data.data.pagination,
  };
};

export const getVehicleById = async (
  id: string | number,
  params?: { view?: VehiclesView },
): Promise<VehicleDetailResponse> => {
  const response = await apiClient.get<VehicleDetailResponse>(
    `/vehicles/${id}`,
    { params },
  );
  return response.data;
};

/**
 * Fresh, uncached single-vehicle location snapshot — GET /vehicles/{id}/location.
 * Returns the same flat shape as the WS `.current.recent` broadcast (both are
 * built from TelemetryFormatHelper::fromVehicleLocation on the backend), so the
 * response can be fed straight through normalizeTelemetry(). Meant to seed a
 * just-selected vehicle instantly, ahead of the fleet list's 30s poll cycle and
 * before the first WS packet for that vehicle arrives.
 */
export const getVehicleLocation = async (id: string | number): Promise<any> => {
  const response = await apiClient.get(`/vehicles/${id}/location`);
  return response.data?.data ?? null;
};

export const createVehicle = async (
  data: VehiclePayload,
): Promise<{ data: Vehicle }> => {
  const response = await apiClient.post<{ data: Vehicle }>("/vehicles", data);
  return response.data;
};

export const updateVehicle = async (
  id: string | number,
  data: Partial<VehiclePayload>,
): Promise<{ data: Vehicle }> => {
  const response = await apiClient.put<{ data: Vehicle }>(
    `/vehicles/${id}`,
    data,
  );
  return response.data;
};

export const deleteVehicle = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/vehicles/${id}`);
};

export const assignDriver = async (
  vehicleId: string | number,
  driverId: string | number,
): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>(
    `/vehicles/${vehicleId}/assign-driver`,
    { driver_id: driverId },
  );
  return response.data;
};

export const deassignDriver = async (
  vehicleId: string | number,
): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>(
    `/vehicles/${vehicleId}/deassign-driver`,
  );
  return response.data;
};

export interface VehicleLocation {
  id: string;
  attributes: {
    display_number: string;
    registration_number: string;
    make: string;
    model: string;
    device_id: string;
    is_online: boolean;
    body_type: string;
    status?: string;
  };
  device: {
    id: string;
    last_packet_received_at: string | null;
    status: string;
  };
  location: {
    device_imei: string;
    vehicle_id: string;
    organization_id: string;
    latitude: number;
    longitude: number;
    timestamp_utc: string;
    gps_datetime: string;
    updated_at?: string | null;
    speed: number;
    ignition: "on" | "off" | "1" | "0" | boolean | null;
    movement: "on" | "off" | "1" | "0" | boolean | null;
    fuel_level_liters: number | null;
    fuel_level_percent: number | null;
    odometer: number | null;
    altitude: number | null;
    heading: number | null;
    angle?: number | null;
    satellites: number | null;
    address: string | null;
    state?: string | null;
    status: string;
    metadata: {
      movement: "on" | "off";
      ignition: "on" | "off";
    };
  };
}

export interface VehicleLocationResponse {
  message: string;
  data: VehicleLocation;
  status: number;
}

export const assignCluster = async (
  vehicleId: string | number,
  clusterId: string | number,
): Promise<{ message: string }> => {
  const response = await apiClient.put<{ message: string }>(
    `/vehicles/${vehicleId}/assign-cluster`,
    { cluster_id: clusterId },
  );
  return response.data;
};

export const assignDevice = async (
  vehicleId: string | number,
  deviceId: string | number,
): Promise<{ message: string }> => {
  const response = await apiClient.put<{ message: string }>(
    `/vehicles/${vehicleId}/assign-device`,
    { device_id: deviceId },
  );
  return response.data;
};

export const getCurrentDriver = async (
  vehicleId: string | number,
): Promise<{ data: any }> => {
  const response = await apiClient.get(`/vehicles/${vehicleId}/current-driver`);
  return response.data;
};

export const getVehicleDriverHistory = async (
  vehicleId: string | number,
): Promise<any> => {
  const response = await apiClient.get(`/vehicles/${vehicleId}/driver-history`);
  return response.data;
};

export const getVehiclesLocations = async (params?: {
  page?: number;
  per_page?: number;
}): Promise<Paginated<VehicleLocation>> => {
  const response = await apiClient.get<{
    data: {
      vehicles: VehicleLocation[];
      pagination: Paginated<VehicleLocation>["pagination"];
    };
  }>("/vehicles/locations", { params });
  return {
    data: response.data.data.vehicles,
    pagination: response.data.data.pagination,
  };
};

export const getVehiclesBatched = async (
  params: ListVehiclesParams = {},
): Promise<Vehicle[]> => {
  const per_page = 500;

  // Page 1 tells us how many pages exist — fetch it alone first, then fire
  // every remaining page in parallel instead of one round trip at a time.
  // For a large fleet (thousands of vehicles across several 500-row pages)
  // this turns N sequential round trips into effectively one.
  const first = await getVehicles({ ...params, page: 1, per_page });
  const lastPage = first.pagination.last_page ?? first.pagination.lastPage ?? 1;

  let allVehicles: Vehicle[] = [...first.data];

  if (lastPage > 1) {
    const remainingPages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
    const remainingResponses = await Promise.all(
      remainingPages.map((page) => getVehicles({ ...params, page, per_page })),
    );
    for (const response of remainingResponses) {
      allVehicles = allVehicles.concat(response.data);
    }
  }

  // Pages can overlap when the backend's result set shifts between requests
  // (e.g. a vehicle updated mid-fetch reorders pages), which duplicates a
  // record across two pages — dedupe by id so callers never see the same
  // vehicle twice (React keys, uuid-keyed maps, etc. all assume uniqueness).
  const seen = new Set<string>();
  return allVehicles.filter((v) => {
    const key = String(v.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getVehiclesLocationsBatched = async (
  params: { page?: number; per_page?: number } = {},
): Promise<VehicleLocation[]> => {
  let allLocations: VehicleLocation[] = [];
  let currentPage = 1;
  let lastPage = 1;

  do {
    const response = await getVehiclesLocations({
      ...params,
      page: currentPage,
      per_page: 100,
    });
    allLocations = [...allLocations, ...response.data];
    lastPage =
      response.pagination.last_page ?? response.pagination.lastPage ?? 1;
    currentPage++;
  } while (currentPage <= lastPage);

  return allLocations;
};
