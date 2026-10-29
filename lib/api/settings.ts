import apiClient from './client'
import { UserProfile, Organization, Paginated, RoleSlug, SecurityRole, Cluster, Permission, Webhook, WebhookDelivery, WebhookDeliveryAttempt, WebhookEventCatalogEntry, WebhookReplay, WebhookStats, ApiUsageDay, ApiUsageLog, RateLimitStatus } from '@/types'

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
export const getClusters = async (params?: { page?: number; per_page?: number }): Promise<{ data: { clusters: Cluster[]; pagination: Paginated<Cluster>['pagination'] } }> => {
    const response = await apiClient.get('/clusters', { params })
    return response.data
}

/**
 * Pages through GET /clusters and returns every cluster in the org. The
 * default per_page is small (10) — callers that need the full cluster list
 * (dashboard/cluster-stats aggregation, filter dropdowns) must not call
 * getClusters() with no params, or they'll silently see only the first page.
 */
export const getClustersBatched = async (): Promise<Cluster[]> => {
    const perPage = 100
    const first = await getClusters({ page: 1, per_page: perPage })
    const lastPage = first.data.pagination?.lastPage ?? first.data.pagination?.last_page ?? 1
    let allClusters = [...first.data.clusters]

    if (lastPage > 1) {
        const remainingPages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2)
        const remainingResponses = await Promise.all(
            remainingPages.map((page) => getClusters({ page, per_page: perPage }))
        )
        for (const response of remainingResponses) {
            allClusters = allClusters.concat(response.data.clusters)
        }
    }

    return allClusters
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

// ─── Webhooks ─────────────────────────────────────────────────────────────────
//
// Endpoint IDs are the numeric `id`, not `public_id` — the routes bind to an
// int and 404 on anything else.

/** Shared page envelope used by every paginated webhook endpoint. */
type WebhookPagination = { current_page: number; per_page: number; total: number; last_page: number }

export const getWebhooks = async (
    params?: { page?: number; per_page?: number; status?: 'active' | 'inactive' | 'failed' }
): Promise<{ data: { webhooks: Webhook[]; pagination: WebhookPagination } }> => {
    const response = await apiClient.get<{ data: { webhooks: Webhook[]; pagination: WebhookPagination } }>(
        '/webhooks',
        { params }
    )
    return response.data
}

export const getWebhook = async (id: number): Promise<{ data: Webhook }> => {
    const response = await apiClient.get<{ data: Webhook }>(`/webhooks/${id}`)
    return response.data
}

/**
 * Per-event delivery filters. An event type listed in `events` but absent here
 * stays filter-less, i.e. delivered for every vehicle.
 */
export interface WebhookSubscriptionFilter {
    event_type: string
    filters?: { vehicle_ids?: number[]; device_imeis?: string[] }
}

export interface WebhookWritePayload {
    url: string
    events: string[]
    name?: string
    description?: string
    payload_version?: string
    /** Throttle for location.updated, in seconds (30–3600). */
    location_throttle_seconds?: number
    subscriptions?: WebhookSubscriptionFilter[]
}

/** The response carries `secret_key`. This is the only time it is ever returned. */
export const createWebhook = async (data: WebhookWritePayload): Promise<{ data: Webhook }> => {
    const response = await apiClient.post<{ data: Webhook }>('/webhooks', data)
    return response.data
}

/**
 * Omitted fields keep their current value, but sending `events` replaces the
 * entire subscription list — event types dropped from it lose their filters.
 */
export const updateWebhook = async (
    id: number,
    data: Partial<WebhookWritePayload> & { status?: 'active' | 'inactive' }
): Promise<{ data: Webhook }> => {
    const response = await apiClient.put<{ data: Webhook }>(`/webhooks/${id}`, data)
    return response.data
}

export const deleteWebhook = async (id: number): Promise<void> => {
    await apiClient.delete(`/webhooks/${id}`)
}

export const testWebhook = async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/webhooks/${id}/test`)
    return response.data
}

export const getWebhookDeliveries = async (
    id: number,
    params?: { page?: number; per_page?: number }
): Promise<{ data: { deliveries: WebhookDelivery[]; pagination: WebhookPagination } }> => {
    const response = await apiClient.get<{ data: { deliveries: WebhookDelivery[]; pagination: WebhookPagination } }>(
        `/webhooks/${id}/deliveries`,
        { params }
    )
    return response.data
}

/** Full attempt-by-attempt history for one delivery, oldest first. */
export const getWebhookDeliveryAttempts = async (
    id: number,
    deliveryId: number,
    params?: { page?: number; per_page?: number }
): Promise<{ data: { attempts: WebhookDeliveryAttempt[]; pagination: WebhookPagination } }> => {
    const response = await apiClient.get<{ data: { attempts: WebhookDeliveryAttempt[]; pagination: WebhookPagination } }>(
        `/webhooks/${id}/deliveries/${deliveryId}/attempts`,
        { params }
    )
    return response.data
}

/** Re-queues one delivery. Rejected with 422 if it already succeeded. */
export const retryWebhookDelivery = async (id: number, deliveryId: number): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
        `/webhooks/${id}/deliveries/${deliveryId}/retry`
    )
    return response.data
}

/** Authoritative list of subscribable events, with example payloads. */
export const getWebhookEventCatalog = async (): Promise<{ data: { events: WebhookEventCatalogEntry[] } }> => {
    const response = await apiClient.get<{ data: { events: WebhookEventCatalogEntry[] } }>('/webhooks/events')
    return response.data
}

export const getWebhookStats = async (): Promise<{ data: WebhookStats }> => {
    const response = await apiClient.get<{ data: WebhookStats }>('/webhooks/stats')
    return response.data
}

export const getOrgWebhookDeliveries = async (
    params?: { page?: number; per_page?: number; status?: 'pending' | 'delivered' | 'failed' | 'retrying' | 'dead_lettered' }
): Promise<{ data: { deliveries: WebhookDelivery[]; pagination: WebhookPagination } }> => {
    const response = await apiClient.get<{ data: { deliveries: WebhookDelivery[]; pagination: WebhookPagination } }>(
        '/webhooks/deliveries',
        { params }
    )
    return response.data
}

/**
 * Rotates the signing secret and returns the new one — once. The old secret
 * stops working immediately, so the caller must surface `data.secret_key` from
 * this response; refetching the endpoint afterwards will not include it.
 */
export const regenerateWebhookSecret = async (id: number): Promise<{ message: string; data: Webhook }> => {
    const response = await apiClient.post<{ message: string; data: Webhook }>(`/webhooks/${id}/regenerate-secret`)
    return response.data
}

// ─── Webhook replays ──────────────────────────────────────────────────────────
//
// Bulk re-delivery of failed or dead-lettered deliveries. Rate-limited to 5
// runs per hour per organization, and guarded by match-count thresholds — see
// createWebhookReplay.

export interface CreateWebhookReplayPayload {
    webhook_endpoint_id?: number
    event_type?: string
    /**
     * `failed` (the default) matches on the status column. `dead_lettered`
     * matches on dead_lettered_at instead, which is a broader set — a delivery
     * can be dead-lettered without the status column ever reaching `failed`.
     */
    status?: 'failed' | 'dead_lettered'
    date_from?: string
    date_to?: string
    /** Required once the match count exceeds 100. Below that it is ignored. */
    confirm?: boolean
}

/**
 * Queues a replay. Filters combine with AND, and omitting all of them matches
 * every failed delivery in the organization.
 *
 * Rejections all arrive as 422 with a distinguishing message: zero matches,
 * more than 500 matches (narrow the filters), or between 100 and 500 matches
 * (resend the identical payload with `confirm: true`). Exceeding the hourly
 * limit returns 429.
 */
export const createWebhookReplay = async (
    payload: CreateWebhookReplayPayload
): Promise<{ message: string; data: WebhookReplay }> => {
    const response = await apiClient.post<{ message: string; data: WebhookReplay }>('/webhook-replays', payload)
    return response.data
}

export const getWebhookReplays = async (
    params?: { page?: number; per_page?: number }
): Promise<{ data: { replays: WebhookReplay[]; pagination: WebhookPagination } }> => {
    const response = await apiClient.get<{ data: { replays: WebhookReplay[]; pagination: WebhookPagination } }>(
        '/webhook-replays',
        { params }
    )
    return response.data
}

/** Poll while a run is pending or processing to track replayed_count. */
export const getWebhookReplay = async (id: number): Promise<{ data: WebhookReplay }> => {
    const response = await apiClient.get<{ data: WebhookReplay }>(`/webhook-replays/${id}`)
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
    // Utilization (backend reports phase 4): working hours are the time outside
    // the after-hours window, on these ISO days (1 = Monday), e.g. "1,2,3,4,5".
    working_days?: string
    utilization_under_pct?: number
    utilization_over_pct?: number
    // Opts the organization into SOS, crash, harsh driving, power cut, towing and dwell alerts.
    telemetry_extended_alerts?: boolean
}

export const getPolicies = async (): Promise<{ data: OrgPolicies }> => {
    const response = await apiClient.get<{ data: OrgPolicies }>('/organization/policies')
    return response.data
}

export const updatePolicies = async (data: Partial<OrgPolicies>): Promise<{ data: OrgPolicies }> => {
    const response = await apiClient.put<{ data: OrgPolicies }>('/organization/policies', data)
    return response.data
}
