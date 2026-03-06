import apiClient from './client'
import { Paginated } from '@/types'

export interface WebhookEndpoint {
    id: string
    name: string
    url: string
    events: string[]
    is_active: boolean
    secret_hint?: string
    last_delivery_at: string | null
    created_at: string
}

export interface WebhookDeliveryLog {
    id: string
    endpoint_id: string
    event_type: string
    payload: any
    response_status: number
    response_body: string
    duration_ms: number
    created_at: string
}

export const getWebhooks = async (): Promise<{ data: WebhookEndpoint[] }> => {
    const response = await apiClient.get('/webhooks')
    return response.data
}

export const createWebhook = async (data: Partial<WebhookEndpoint> & { secret?: string }): Promise<{ data: WebhookEndpoint }> => {
    const response = await apiClient.post('/webhooks', data)
    return response.data
}

export const updateWebhook = async (id: string, data: Partial<WebhookEndpoint> & { secret?: string }): Promise<{ data: WebhookEndpoint }> => {
    const response = await apiClient.put(`/webhooks/${id}`, data)
    return response.data
}

export const deleteWebhook = async (id: string): Promise<void> => {
    await apiClient.delete(`/webhooks/${id}`)
}

export const testWebhook = async (id: string): Promise<{ success: boolean; status: number }> => {
    const response = await apiClient.post(`/webhooks/${id}/test`)
    return response.data
}

export const getWebhookDeliveries = async (id: string, params?: { page?: number }): Promise<Paginated<WebhookDeliveryLog>> => {
    const response = await apiClient.get(`/webhooks/${id}/deliveries`, { params })
    return response.data
}
