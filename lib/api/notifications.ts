import apiClient from './client'
import { Paginated } from '@/types'

export interface Notification {
    id: string
    type: string
    data: any // Dynamic payload based on event
    read_at: string | null
    created_at: string
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

export interface ChannelPreference {
    event_id: string
    event_name: string
    email: boolean
    sms: boolean
    in_app: boolean
}

export const getPreferences = async (): Promise<{ data: ChannelPreference[] }> => {
    const response = await apiClient.get<{ data: ChannelPreference[] }>('/notifications/user/channels')
    return response.data
}

export const updatePreference = async (data: { event_id: string; channel: 'email' | 'sms' | 'in_app'; enabled: boolean }): Promise<{ message: string }> => {
    // Note: Depends on actual API schema. Assuming a flat PUT or PATCH to update one toggle at a time for UX flow.
    const response = await apiClient.put<{ message: string }>('/notifications/user/channels', data)
    return response.data
}
