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

/** Delivery lifecycle as recorded on the delivery log row itself. */
export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying'

export interface Webhook {
    id: number
    public_id: string
    name: string | null
    url: string
    description: string | null
    events: string[]
    payload_version: string | null
    location_throttle_seconds: number | null
    status: 'active' | 'inactive'
    /**
     * Returned exactly once, by create and by regenerate-secret — never by the
     * list or show endpoints. Capture it from those two responses or it is gone.
     */
    secret_key?: string
    failure_count: number
    last_failure_at: string | null
    /** Present only when the endpoint's latest delivery was eager-loaded. */
    last_delivery_at?: string | null
    last_delivery_status?: WebhookDeliveryStatus | null
    /** Computed over a 30-day window; absent when not attached to the response. */
    success_rate_30d?: number | null
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

/**
 * One delivery of one event. The row is rewritten in place on every retry, so it
 * always reflects the most recent attempt — per-attempt history lives in
 * WebhookDeliveryAttempt.
 */
export interface WebhookDelivery {
    id: number
    public_id: string
    webhook_endpoint_id: number
    event_type: string
    status: WebhookDeliveryStatus
    attempt_number: number
    response_code: number | null
    response_body: string | null
    duration_ms: number | null
    delivered_at: string | null
    failed_at: string | null
    /**
     * Set once retries are exhausted. `status` stays 'failed' for these, so a
     * dead-lettered delivery is only identifiable by this field being non-null.
     */
    dead_lettered_at: string | null
    created_at: string
    /** Present only when the endpoint relation was eager-loaded. */
    endpoint?: { id: number; name: string | null; url: string }
}

export type WebhookAttemptErrorType =
    | 'ssrf_blocked'
    | 'http_4xx'
    | 'http_5xx'
    | 'rate_limited'
    | 'connection_error'

/** One immutable HTTP attempt within a delivery. Never rewritten once recorded. */
export interface WebhookDeliveryAttempt {
    id: number
    public_id: string
    attempt_number: number
    response_status: number | null
    response_body: string | null
    /** Null on a successful attempt. */
    error_type: WebhookAttemptErrorType | null
    error_message: string | null
    latency_ms: number | null
    started_at: string
    completed_at: string | null
    created_at: string
}

export type WebhookReplayStatus = 'pending' | 'processing' | 'completed'

/** Filters a replay run was queued with, echoed back by the API. */
export interface WebhookReplayFilters {
    webhook_endpoint_id?: number
    event_type?: string
    status?: 'failed' | 'dead_lettered'
    date_from?: string
    date_to?: string
}

/**
 * A bulk replay run. Replaying never mutates the original deliveries — each
 * match gets a brand-new delivery record queued for a fresh attempt.
 */
export interface WebhookReplay {
    id: number
    public_id: string
    webhook_endpoint_id: number | null
    filters: WebhookReplayFilters
    total_count: number
    /** Climbs towards total_count while the run is processing. */
    replayed_count: number
    status: WebhookReplayStatus
    started_at: string | null
    completed_at: string | null
    created_at: string
}

/** An entry from GET /webhooks/events — the authoritative subscribable-event list. */
export interface WebhookEventCatalogEntry {
    type: string
    description: string
    example: Record<string, unknown>
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
