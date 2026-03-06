import apiClient from './client'
import { UserProfile, Organization, Paginated, Role } from '@/types'

// Organizations
export const getOrganization = async (id: number): Promise<{ data: Organization }> => {
    const response = await apiClient.get<{ data: Organization }>(`/organizations/${id}`)
    return response.data
}

export const updateOrganization = async (id: number, data: Partial<Organization>): Promise<{ message: string, data: Organization }> => {
    const response = await apiClient.put<{ message: string, data: Organization }>(`/organizations/${id}`, data)
    return response.data
}

// Users
export interface UserListResponse {
    message: string
    data: {
        users: UserProfile[]
        pagination: Paginated<UserProfile>['pagination']
    }
}

export const getUsers = async (params?: { page?: number; per_page?: number; role?: string }): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>('/users', { params })
    return response.data
}

export const inviteUser = async (data: { email: string; first_name: string; last_name: string; role: Role; cluster_id?: number }): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/users', data)
    return response.data
}

export const deactivateUser = async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/users/${id}`)
    return response.data
}

// Roles & Permissions
export interface RoleData {
    id: number | string
    attributes: {
        name: string
        type: string
        summary: { total_users: number, total_permissions: number }
        created_at: string
    }
    relationships: {
        permissions: Record<string, string>
    }
}

export const getRoles = async (): Promise<{ data: { roles: RoleData[], pagination: any } }> => {
    const response = await apiClient.get('/roles')
    return response.data
}

// Clusters
export interface Cluster {
    id: number
    name: string
    vehicle_count: number
    manager?: { id: string; name: string }
}

export const getClusters = async (params?: any): Promise<{ data: any }> => {
    const response = await apiClient.get('/clusters', { params })
    return response.data
}

export const getClusterById = async (id: string | number): Promise<{ data: any }> => {
    const response = await apiClient.get(`/clusters/${id}`)
    return response.data
}

export const createCluster = async (data: { name: string; location: string; manager_id?: string }): Promise<{ message: string; data: Cluster }> => {
    const response = await apiClient.post<{ message: string; data: Cluster }>('/clusters', data)
    return response.data
}

// API Keys
export interface ApiKey {
    id: string
    name: string
    last_used_at: string | null
    expires_at: string | null
    created_at: string
}

export const getApiKeys = async (): Promise<{ data: ApiKey[] }> => {
    const response = await apiClient.get('/api-keys')
    return response.data
}

export const generateApiKey = async (data: { name: string; expires_in_days: number }): Promise<{ message: string, data: { api_key: string } }> => {
    const response = await apiClient.post<{ message: string, data: { api_key: string } }>('/api-keys', data)
    return response.data
}

export const revokeApiKey = async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/api-keys/${id}`)
    return response.data
}
