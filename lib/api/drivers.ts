import apiClient from "./client";
import { UserProfile, Paginated, DriverPayload } from "@/types";

export interface ListDriversParams {
  page?: number;
  per_page?: number;
  q?: string;
  status?: string;
}

export interface DriverListResponse {
  message: string;
  data: {
    users: UserProfile[];
    pagination: Paginated<UserProfile>["pagination"];
  };
}

export const getDrivers = async (
  params: ListDriversParams,
): Promise<Paginated<UserProfile>> => {
  const response = await apiClient.get<DriverListResponse>(
    "/users/role/driver",
    {
      params,
    },
  );
  return {
    data: response.data.data.users,
    pagination: response.data.data.pagination,
  };
};

export const getDriverById = async (
  id: string | number,
): Promise<{ data: UserProfile }> => {
  const response = await apiClient.get<{ data: UserProfile }>(`/users/${id}`);
  return response.data;
};

export const createDriver = async (
  data: DriverPayload,
): Promise<{ data: UserProfile }> => {
  const response = await apiClient.post<{ data: UserProfile }>("/users", {
    ...data,
    role: "driver",
  });
  return response.data;
};

export const updateDriver = async (
  id: string | number,
  data: Partial<DriverPayload>,
): Promise<{ data: UserProfile }> => {
  const response = await apiClient.put<{ data: UserProfile }>(
    `/users/${id}`,
    data,
  );
  return response.data;
};

export const deleteDriver = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};

export const getDriverCurrentVehicle = async (
  driverId: string | number,
): Promise<{ data: any }> => {
  const response = await apiClient.get(`/drivers/${driverId}/current-vehicle`);
  return response.data;
};

export const getDriverVehicleHistory = async (
  driverId: string | number,
): Promise<{ data: any[] }> => {
  const response = await apiClient.get(`/drivers/${driverId}/vehicle-history`);
  return response.data;
};

export const getDriverTrips = async (
  driverId: string | number,
): Promise<any> => {
  const response = await apiClient.get(`/drivers/${driverId}/trips`);
  return response.data;
};

export const getDriverPerformance = async (
  driverId: string | number,
): Promise<{ data: any }> => {
  const response = await apiClient.get(`/drivers/${driverId}/performance`);
  return response.data;
};
