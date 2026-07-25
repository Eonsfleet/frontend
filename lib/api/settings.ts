import apiClient from './client'
import { UserProfile, Organization, Paginated, RoleSlug, SecurityRole, Cluster, Permission, Webhook, WebhookDelivery, WebhookStats, ApiUsageDay, ApiUsageLog, RateLimitStatus } from '@/types'

// Organizations
export interface UpdateOrganizationPayload {
    name?: string
    subdomain?: string
    domain?: string
    logo?: string | null
}

export const getOrganization = async (id: number | string): Promise<{ data: Organization }> => {
    const response = await apiClient.get<{ data: Organization }>(`/organizations/${id}`)
    return response.data
}

export const updateOrganization = async (id: number | string, data: UpdateOrganizationPayload): Promise<{ message: string, data: Organization }> => {
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

export const getUsers = async (params?: { page?: number; per_page?: number; q?: string }): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>('/users', { params })
    return response.data
}

export const inviteUser = async (data: { email: string; f_name: string; l_name: string; role: string; cluster_id?: number }): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/users', data)
    return response.data
}

export const deactivateUser = async (id: string | number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/users/${id}/suspend`) // Assuming suspension endpoint
    return response.data
}

export const deleteUser = async (id: string | number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/users/${id}`)
    return response.data
}

export const requestResetPassword = async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/password/new-otp', { email })
    return response.data
}

// API Keys
export interface ApiKey {
    id: string
    key_name: string
    prefix: string
    key_type: 'live' | 'test'
    is_active: boolean
    is_expired: boolean
    is_revoked: boolean
    usage_count: number
    last_used_at: string | null
    expires_at: string | null
    created_at: string
}

export const getApiKeys = async (): Promise<{ data: ApiKey[] }> => {
    const response = await apiClient.get('/api-keys')
    return response.data
}

export const generateApiKey = async (data: {
    name: string;
    expires_in_days: number;
    scopes?: string[];
    ip_whitelist?: string[];
}): Promise<{ message: string, data: { api_key: string } }> => {
    const response = await apiClient.post<{ message: string, data: { api_key: string } }>('/api-keys', data)
    return response.data
}

export const revokeApiKey = async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/api-keys/${id}`)
    return response.data
}

export const rotateApiKey = async (id: string, data?: { name?: string; expires_in_days?: number; revoke_old?: boolean }): Promise<{
    message: string
    data: { new_key: { id: string; api_key: string; prefix: string; expires_at: string | null }; old_key: { id: string; prefix: string; status: string; message: string } }
}> => {
    const response = await apiClient.post(`/api-keys/${id}/rotate`, data ?? {})
    return response.data
}

// Roles & Permissions
export const getRoles = async (): Promise<{ data: { roles: SecurityRole[] } }> => {
    const response = await apiClient.get('/roles')
    return response.data
}

export const getPermissions = async (params?: { page?: number; per_page?: number }): Promise<{ data: { permissions: Permission[] } }> => {
    const response = await apiClient.get('/permissions', { params })
    return response.data
}

export const createRole = async (data: { name: string; permissions: string[] }): Promise<{ message: string, data: SecurityRole }> => {
    const response = await apiClient.post<{ message: string, data: SecurityRole }>('/roles', data)
    return response.data
}

// Clusters
export const getClusters = async (params?: { page?: number; per_page?: number }): Promise<{ data: { clusters: Cluster[] } }> => {
    const response = await apiClient.get('/clusters', { params })
    return response.data
}

export const getCluster = async (id: string | number): Promise<{ message: string, data: { cluster: Cluster } }> => {
    const response = await apiClient.get<{ message: string, data: { cluster: Cluster } }>(`/clusters/${id}`)
    return response.data
}

export const createCluster = async (data: {
    name: string;
    description?: string;
    manager_id: number | string;
    users: (number | string)[];
    vehicles: (number | string)[];
}): Promise<{ message: string, data: Cluster }> => {
    const response = await apiClient.post<{ message: string, data: Cluster }>('/clusters', data)
    return response.data
}

export const updateCluster = async (id: string | number, data: {
    name?: string;
    description?: string;
    manager_id?: number | string;
    users?: (number | string)[];
    vehicles?: (number | string)[];
}): Promise<{ message: string, data: Cluster }> => {
    const response = await apiClient.put<{ message: string, data: Cluster }>(`/clusters/${id}`, data)
    return response.data
}

export const deleteCluster = async (id: string | number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/clusters/${id}`)
    return response.data
}

// Webhooks
export const getWebhooks = async (): Promise<{ data: { webhooks: Webhook[] } }> => {
    const response = await apiClient.get<{ data: { webhooks: Webhook[] } }>('/webhooks')
    return response.data
}

export const createWebhook = async (data: { url: string, events: string[], name?: string, description?: string }): Promise<{ data: Webhook }> => {
    const response = await apiClient.post<{ data: Webhook }>('/webhooks', data)
    return response.data
}

export const updateWebhook = async (id: string, data: { url?: string, events?: string[], name?: string, description?: string, status?: 'active' | 'inactive' }): Promise<{ data: Webhook }> => {
    const response = await apiClient.put<{ data: Webhook }>(`/webhooks/${id}`, data)
    return response.data
}

export const deleteWebhook = async (id: string): Promise<void> => {
    await apiClient.delete(`/webhooks/${id}`)
}

export const testWebhook = async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/webhooks/${id}/test`)
    return response.data
}

export const getWebhookDeliveries = async (id: string): Promise<{ data: { deliveries: WebhookDelivery[] } }> => {
    const response = await apiClient.get<{ data: { deliveries: WebhookDelivery[] } }>(`/webhooks/${id}/deliveries`)
    return response.data
}

export const getWebhookStats = async (): Promise<{ data: WebhookStats }> => {
    const response = await apiClient.get<{ data: WebhookStats }>('/webhooks/stats')
    return response.data
}

export const getOrgWebhookDeliveries = async (params?: { page?: number; per_page?: number; status?: string }): Promise<{ data: { deliveries: WebhookDelivery[]; pagination: Paginated<WebhookDelivery>['pagination'] } }> => {
    const response = await apiClient.get<{ data: { deliveries: WebhookDelivery[]; pagination: Paginated<WebhookDelivery>['pagination'] } }>('/webhooks/deliveries', { params })
    return response.data
}

export const regenerateWebhookSecret = async (id: string): Promise<{ message: string; data: Webhook }> => {
    const response = await apiClient.post<{ message: string; data: Webhook }>(`/webhooks/${id}/regenerate-secret`)
    return response.data
}

// API Usage
export const getApiUsageSummary = async (days: number = 30): Promise<{ data: { days: ApiUsageDay[] } }> => {
    const response = await apiClient.get<{ data: { days: ApiUsageDay[] } }>('/api-usage/summary', { params: { days } })
    return response.data
}

export interface ApiUsageLogsPagination {
    current_page: number
    per_page: number
    total: number
    last_page: number
}

export const getApiUsageLogs = async (params?: { page?: number; per_page?: number; status_code?: number }): Promise<{ data: { logs: ApiUsageLog[]; pagination: ApiUsageLogsPagination } }> => {
    const response = await apiClient.get<{ data: { logs: ApiUsageLog[]; pagination: ApiUsageLogsPagination } }>('/api-usage/logs', { params })
    return response.data
}

export const getRateLimit = async (): Promise<{ data: RateLimitStatus }> => {
    const response = await apiClient.get<{ data: RateLimitStatus }>('/rate-limit')
    return response.data
}

// Organization Policies
export interface OrgPolicies {
    speed_limit_kmh: number
    idle_threshold_minutes: number
    after_hours_enabled: boolean
    after_hours_start: string
    after_hours_end: string
    maintenance_approaching_km: number
    maintenance_approaching_days: number
    maintenance_escalation_hours: number
}

export const getPolicies = async (): Promise<{ data: OrgPolicies }> => {
    const response = await apiClient.get<{ data: OrgPolicies }>('/organization/policies')
    return response.data
}

export const updatePolicies = async (data: Partial<OrgPolicies>): Promise<{ data: OrgPolicies }> => {
    const response = await apiClient.put<{ data: OrgPolicies }>('/organization/policies', data)
    return response.data
}
