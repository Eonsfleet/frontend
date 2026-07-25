export interface ConversationMessage {
    id: number | string
    body: string
    sender_id: number | string
    sender_role?: string
    sender_name?: string
    is_internal: boolean
    created_at: string
    attributes?: {
        message_type?: string
        sender_type?: string
        sender_id?: number | string
        sender_name?: string
        sender_role?: string
        body?: string
        is_internal?: boolean
        metadata?: Record<string, unknown> | null
        created_at?: string
        deleted_at?: string | null
    }
}

export interface WorkflowHistoryEntry {
    id: number | string
    from_status: string
    to_status: string
    actor_id: number | string
    actor_role?: string
    actor_name?: string
    reason: string | null
    notes?: string
    created_at: string
    attributes?: {
        workflow_type?: string
        from_status?: string
        to_status?: string
        actor_name?: string
        triggered_by_type?: string
        triggered_by_id?: number | string
        triggered_by_role?: string
        reason?: string | null
        notes?: string | null
        metadata?: Record<string, unknown> | null
        created_at?: string
    }
}

export interface Webhook {
    id: string | number
    name: string | null
    url: string
    description: string | null
    events: string[]
    status: 'active' | 'inactive'
    secret_key?: string
    failure_count: number
    last_failure_at: string | null
    last_delivery_at: string | null
    last_delivery_status: 'pending' | 'delivered' | 'failed' | 'retrying' | null
    success_rate_30d: number | null
    created_at: string
    updated_at?: string
}

export interface WebhookStats {
    total_webhooks: number
    active_webhooks: number
    deliveries_30d: number
    successful_deliveries_30d: number
    failed_deliveries_30d: number
    success_rate_30d: number | null
    avg_response_time_ms: number | null
}

export interface WebhookDelivery {
    id: string | number
    event_type: string
    response_code: number
    response_body: string | null
    payload: Record<string, unknown>
    duration_ms: number
    status?: 'pending' | 'delivered' | 'failed' | 'retrying'
    created_at: string
    endpoint?: { id: string | number; name: string | null; url: string }
}

export interface ApiUsageDay {
    date: string
    requests: number
    success_rate: number | null
    avg_response_time_ms: number | null
}

export interface ApiUsageLog {
    id: string | number
    method: string
    endpoint: string
    description: string
    status_code: number | null
    duration_ms: number | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
}

export interface RateLimitStatus {
    limit: number
    used: number
    remaining: number
}

export interface NotificationGroup {
    id: string | number
    name: string
    description: string | null
    members?: Array<{ id: string | number; f_name?: string; l_name?: string; email?: string; name?: string }>
    is_active?: boolean
    created_at: string
    relationships?: {
        users?: { data: { id: string; type: 'users'; name?: string }[] }
    }
}

export interface NotificationRule {
    id: string | number
    notification_type_id?: number
    notification_type?: { id: number; code: string; name: string; key?: string }
    event_type?: string
    enabled_channels?: ('email' | 'sms' | 'push' | 'in_app' | 'whatsapp' | 'webhook')[]
    channel_types?: ('email' | 'sms' | 'push' | 'in_app')[]
    recipient_roles?: string[]
    recipient_user_ids?: Array<string | number>
    recipient_group_ids?: Array<string | number>
    is_enabled?: boolean
    is_active?: boolean
    condition?: string
    created_at: string
    relationships?: {
        recipient_groups?: { data: { id: string; type: 'notification_groups'; name?: string }[] }
    }
}

export interface NotificationDelegation {
    id: string | number
    initial_user_id?: string | number
    delegate_user_id?: string | number
    reason?: string | null
    start_date?: string
    end_date?: string | null
    is_active?: boolean
    notification_type_ids?: number[] | null
    event_types?: string[]
    expires_at?: string
    created_at: string
    initial_user?: { id: string | number; f_name?: string; l_name?: string; name?: string; email?: string }
    delegate_user?: { id: string | number; f_name?: string; l_name?: string; name?: string; email?: string }
    relationships?: {
        delegated_to: { data: { id: string; type: 'users'; name?: string } }
        delegated_by: { data: { id: string; type: 'users'; name?: string } }
    }
}
