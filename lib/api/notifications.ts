import apiClient from './client'
import { NotificationGroup, NotificationRule, NotificationDelegation } from '@/types'

export interface Notification {
    id: string
    attributes: {
        type: string
        subject: string
        body: string
        data: any
        is_read: boolean
        read_at: string | null
        created_at: string
    }
}

export interface NotificationInboxResponse {
    data: {
        notifications: Notification[]
        pagination: { current_page: number; last_page: number; per_page: number; total: number }
    }
}

export const getInbox = async (params?: { page?: number; unread_only?: boolean }): Promise<NotificationInboxResponse> => {
    const response = await apiClient.get<NotificationInboxResponse>('/notifications/user/inbox', { params })
    return response.data
}

export const markAsRead = async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ message: string }>(`/notifications/user/inbox/${id}/read`)
    return response.data
}

export const markAllAsRead = async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/notifications/user/inbox/read-all')
    return response.data
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

// Routing Rules
export const getRules = async (): Promise<{ data: { success: boolean; rules: NotificationRule[] } }> => {
    const response = await apiClient.get<{ data: { success: boolean; rules: NotificationRule[] } }>('/notifications/config/rules')
    return response.data
}

export const getNotificationTypes = async (params?: { configurable?: boolean }): Promise<{ data: { id: number; code: string; name: string }[] }> => {
    const response = await apiClient.get<{ data: { id: number; code: string; name: string }[] }>('/notifications/types', { params })
    return response.data
}

export const createRule = async (data: {
    notification_type_id: number;
    is_enabled: boolean;
    channel_types: string[];
    recipient_groups?: (string | number)[];
    recipient_roles?: string[];
    recipient_users?: (string | number)[];
}): Promise<{ data: NotificationRule }> => {
    const response = await apiClient.post<{ data: NotificationRule }>('/notifications/config/rules', data)
    return response.data
}

// Delegations
export const getDelegations = async (): Promise<{ data: { success: boolean; delegations: NotificationDelegation[] } }> => {
    const response = await apiClient.get<{ data: { success: boolean; delegations: NotificationDelegation[] } }>('/notifications/delegations')
    return response.data
}

export const createDelegation = async (data: {
    initial_user_id?: string | number;
    delegated_to_id: string | number;
    event_types: string[];
    expires_at: string;
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
