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

export interface VehicleLocation {
    id: string
    attributes: {
        display_number: string
        registration_number: string
        make: string
        model: string
        device_id: string
        is_online: boolean
        body_type: string
        status?: string
    }
    device: {
        id: string
        last_packet_received_at: string | null
        status: string
    }
    location: {
        device_imei: string
        vehicle_id: string
        organization_id: string
        latitude: number
        longitude: number
        timestamp_utc: string
        gps_datetime: string
        speed: number
        ignition: 'on' | 'off'
        movement: 'on' | 'off'
        fuel_level_liters: number | null
        fuel_level_percent: number | null
        odometer: number | null
        altitude: number | null
        heading: number | null
        satellites: number | null
        address: string | null
        status: string
        metadata: {
            movement: 'on' | 'off'
            ignition: 'on' | 'off'
        }
    }
}

export interface VehicleLocationResponse {
    message: string
    data: VehicleLocation
    status: number
}

export const getCurrentLocation = async (vehicleId: string | number): Promise<VehicleLocation> => {
    const response = await apiClient.get<VehicleLocationResponse>(`/vehicles/${vehicleId}/location/current`)
    return response.data.data
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

export const getVehicleDriverHistory = async (vehicleId: string | number): Promise<any> => {
    const response = await apiClient.get(`/vehicles/${vehicleId}/driver-history`)
    return response.data
}

export const getVehiclesLocations = async (params?: { page?: number; per_page?: number }): Promise<Paginated<VehicleLocation>> => {
    const response = await apiClient.get<{ data: { vehicles: VehicleLocation[], pagination: any } }>('/vehicles/locations', { params })
    return {
        data: response.data.data.vehicles,
        pagination: response.data.data.pagination
    }
}

export const getVehiclesBatched = async (params: ListVehiclesParams = {}): Promise<Vehicle[]> => {
    let allVehicles: Vehicle[] = []
    let currentPage = 1
    let lastPage = 1

    do {
        const response = await getVehicles({ ...params, page: currentPage, per_page: 100 })
        allVehicles = [...allVehicles, ...response.data]
        lastPage = response.pagination.lastPage
        currentPage++
    } while (currentPage <= lastPage)

    return allVehicles
}

export const getVehiclesLocationsBatched = async (params: { page?: number; per_page?: number } = {}): Promise<VehicleLocation[]> => {
    let allLocations: VehicleLocation[] = []
    let currentPage = 1
    let lastPage = 1

    do {
        const response = await getVehiclesLocations({ ...params, page: currentPage, per_page: 100 })
        allLocations = [...allLocations, ...response.data]
        lastPage = response.pagination.lastPage
        currentPage++
    } while (currentPage <= lastPage)

    return allLocations
}

