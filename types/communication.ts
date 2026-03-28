export interface ConversationMessage {
    id: number | string
    body: string
    sender_id: number | string
    sender_role?: string
    sender_name?: string
    is_internal: boolean
    created_at: string
}

export interface WorkflowHistoryEntry {
    id: number | string
    from_status: string
    to_status: string
    actor_id: number | string
    actor_role?: string
    actor_name?: string
    reason: string | null
    created_at: string
}

export interface Webhook {
    id: string | number
    url: string
    description: string | null
    events: string[]
    status: 'active' | 'inactive'
    secret_key?: string
    failure_count: number
    last_failure_at: string | null
    created_at: string
    updated_at?: string
}

export interface WebhookDelivery {
    id: string | number
    event_type: string
    response_code: number
    response_body: string | null
    payload: Record<string, unknown>
    duration_ms: number
    created_at: string
}

export interface NotificationGroup {
    id: string | number
    name: string
    description: string | null
    created_at: string
    relationships?: {
        users?: { data: { id: string; type: 'users'; name?: string }[] }
    }
}

export interface NotificationRule {
    id: string | number
    event_type: string
    channel_types: ('email' | 'sms' | 'push' | 'in_app')[]
    is_active: boolean
    condition?: string
    created_at: string
    relationships?: {
        recipient_groups?: { data: { id: string; type: 'notification_groups'; name?: string }[] }
    }
}

export interface NotificationDelegation {
    id: string | number
    event_types: string[]
    expires_at: string
    created_at: string
    relationships?: {
        delegated_to: { data: { id: string; type: 'users'; name?: string } }
        delegated_by: { data: { id: string; type: 'users'; name?: string } }
    }
}
