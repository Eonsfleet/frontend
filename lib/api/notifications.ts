import apiClient from './client'
import { NotificationGroup, NotificationRule, NotificationDelegation } from '@/types'

export interface Notification {
    id: string
    attributes: {
        type: string
        subject: string | null
        body: string | null
        data: Record<string, unknown>
        is_read: boolean
        read_at: string | null
        created_at: string
    }
}

export interface NotificationType {
    id: number
    code: string
    key?: string
    name: string
    category?: string
    module?: string
    description?: string | null
    default_priority?: string | null
    default_channels?: string[]
    is_mandatory?: boolean
    notification_category?: string
}

export interface RealtimeNotificationPayload {
    title: string
    body: string
    action_url?: string | null
    icon?: string | null
    data?: Record<string, unknown> | null
    latitude?: number | string | null
    longitude?: number | string | null
}

export interface NotificationInboxResponse {
    data: {
        notifications: Notification[]
        pagination: { current_page: number; last_page: number; per_page: number; total: number }
    }
}

export const getInbox = async (params?: { page?: number; per_page?: number; unread_only?: boolean }): Promise<NotificationInboxResponse> => {
    const response = await apiClient.get<NotificationInboxResponse>('/notifications/user/inbox', { params })
    return response.data
}

export const markAsRead = async (ids: string | string[]): Promise<{ message: string; data: { marked_count: number } }> => {
    const idArray = Array.isArray(ids) ? ids : [ids]
    const response = await apiClient.patch<{ message: string; data: { marked_count: number } }>('/notifications/user/inbox/read', { ids: idArray })
    return response.data
}

export const markAllAsRead = async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/notifications/user/inbox/read-all')
    return response.data
}

export const deleteNotification = async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/user/inbox/${id}`)
}

export const getPreferences = async (): Promise<{ data: { channels: ChannelAvailability } }> => {
    const response = await apiClient.get<{ data: { channels: ChannelAvailability } }>('/notifications/user/channels')
    return response.data
}

export const updatePreference = async (channels: ChannelAvailability): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>('/notifications/user/channels', { channels })
    return response.data
}

// Notification Groups
export const getGroups = async (): Promise<{ data: { success: boolean; groups: NotificationGroup[] } }> => {
    const response = await apiClient.get<{ data: { success: boolean; groups: NotificationGroup[] } }>('/notifications/groups')
    return response.data
}

export const createGroup = async (data: { name: string; description?: string; user_ids: (string | number)[] }): Promise<{ data: NotificationGroup }> => {
    const response = await apiClient.post<{ data: NotificationGroup }>('/notifications/groups', data)
    return response.data
}

export const syncGroupMembers = async (groupId: string | number, user_ids: (string | number)[]): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>(`/notifications/groups/${groupId}/members`, { user_ids })
    return response.data
}

export const updateGroup = async (groupId: string | number, data: { name: string; description?: string }): Promise<{ data: { group: NotificationGroup } }> => {
    const response = await apiClient.put<{ data: { group: NotificationGroup } }>(`/notifications/groups/${groupId}`, data)
    return response.data
}

export const deleteGroup = async (groupId: string | number): Promise<void> => {
    await apiClient.delete(`/notifications/groups/${groupId}`)
}

// Routing Rules
export const getRules = async (): Promise<{ data: { success: boolean; rules: NotificationRule[] } }> => {
    const response = await apiClient.get<{ data: { success: boolean; rules: NotificationRule[] } }>('/notifications/config/rules')
    return response.data
}

export const getNotificationTypes = async (params?: { configurable?: boolean; category?: string }): Promise<{ data: NotificationType[] }> => {
    const response = await apiClient.get<{ data: NotificationType[] }>('/notifications/types', { params })
    return response.data
}

export const createRule = async (data: {
    notification_type_id: number;
    is_enabled: boolean;
    enabled_channels: string[];
    recipient_group_ids?: (string | number)[];
    recipient_roles?: string[];
    recipient_user_ids?: (string | number)[];
}): Promise<{ data: NotificationRule }> => {
    const response = await apiClient.post<{ data: NotificationRule }>('/notifications/config/rules', data)
    return response.data
}

export const deleteRule = async (ruleId: string | number): Promise<void> => {
    await apiClient.delete(`/notifications/config/rules/${ruleId}`)
}

// Delegations
export const getDelegations = async (): Promise<{ data: { success: boolean; delegations: NotificationDelegation[] } }> => {
    const response = await apiClient.get<{ data: { success: boolean; delegations: NotificationDelegation[] } }>('/notifications/delegations')
    return response.data
}

export const createDelegation = async (data: {
    initial_user_id: string | number;
    delegate_user_id: string | number;
    start_date: string;
    end_date?: string;
    notification_type_ids?: number[];
    reason?: string;
}): Promise<{ data: NotificationDelegation }> => {
    const response = await apiClient.post<{ data: NotificationDelegation }>('/notifications/delegations', data)
    return response.data
}

export const endDelegation = async (id: string | number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/notifications/delegations/${id}`)
    return response.data
}

export interface ChannelAvailability {
    email: boolean
    sms: boolean
    push: boolean
    in_app: boolean
}

export const getChannelAvailability = async (): Promise<{ data: { channels: ChannelAvailability } }> => {
    const response = await apiClient.get<{ data: { channels: ChannelAvailability } }>('/notifications/user/channels')
    return response.data
}
