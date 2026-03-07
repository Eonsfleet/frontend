import apiClient from './client'
import { Vehicle, Paginated } from '@/types'

export interface ListVehiclesParams {
    page?: number
    per_page?: number
    q?: string
    status?: string
    make?: string
    model?: string
    year?: string | number
    fuel_type?: string
    body_type?: string
    type?: string
}

export interface VehicleListResponse {
    message: string
    data: {
        vehicles: Vehicle[]
        pagination: Paginated<any>['pagination']
    }
}

export interface VehicleDetailResponse {
    message: string
    data: Vehicle
}

export const getVehicles = async (params: ListVehiclesParams): Promise<Paginated<Vehicle>> => {
    const response = await apiClient.get<VehicleListResponse>('/vehicles', { params })
    return {
        data: response.data.data.vehicles,
        pagination: response.data.data.pagination
    }
}

export const getVehicleById = async (id: string | number): Promise<VehicleDetailResponse> => {
    const response = await apiClient.get<VehicleDetailResponse>(`/vehicles/${id}`)
    return response.data
}

export const createVehicle = async (data: any): Promise<{ data: Vehicle }> => {
    const response = await apiClient.post<{ data: Vehicle }>('/vehicles', data)
    return response.data
}

export const updateVehicle = async (id: string | number, data: any): Promise<{ data: Vehicle }> => {
    const response = await apiClient.put<{ data: Vehicle }>(`/vehicles/${id}`, data)
    return response.data
}

export const deleteVehicle = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`)
}

export const assignDriver = async (vehicleId: string | number, driverId: string | number): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/vehicles/${vehicleId}/assign-driver`, { driver_id: driverId })
    return response.data
}

export const deassignDriver = async (vehicleId: string | number): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/vehicles/${vehicleId}/deassign-driver`)
    return response.data
}

export interface VehicleLocationResponse {
    data: {
        id: string
        attributes: {
            display_number: string
            registration_number: string
            make: string
            model: string
            device_id: string
            is_online: boolean
        }
        device: {
            id: string
            last_packet_received_at: string
            status: string
        }
        location: {
            latitude: number
            longitude: number
            speed: number
            heading: number
            address: string
            status: string
            fuel_level_percent: number
            ignition: 'on' | 'off'
            metadata: {
                engine_rpm?: number
                engine_temperature?: number
                battery_voltage?: number
                door_status?: string
                trip_odometer?: number
                total_odometer?: number
            }
        }
    }
}

export const getCurrentLocation = async (vehicleId: string | number): Promise<VehicleLocationResponse> => {
    const response = await apiClient.get<VehicleLocationResponse>(`/vehicles/${vehicleId}/location/current`)
    return response.data
}

export const assignCluster = async (vehicleId: string | number, clusterId: string | number): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>(`/vehicles/${vehicleId}/assign-cluster`, { cluster_id: clusterId })
    return response.data
}

export const assignDevice = async (vehicleId: string | number, deviceId: string | number): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>(`/vehicles/${vehicleId}/assign-device`, { device_id: deviceId })
    return response.data
}

export const getCurrentDriver = async (vehicleId: string | number): Promise<{ data: any }> => {
    const response = await apiClient.get(`/vehicles/${vehicleId}/current-driver`)
    return response.data
}
