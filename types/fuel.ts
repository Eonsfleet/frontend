export type FuelExpenseStatus = 'pending_approval' | 'approved' | 'rejected' | 'reimbursed' | 'flagged_for_review'
export type FuelReconciliationStatus = 'matched' | 'flagged_variance' | 'unmatched'
export type FuelSource = 'manual' | 'card'

export interface FuelExpense {
    id: string | number
    attributes: {
        entry_date: string
        volume: number
        cost_per_volume: number
        amount: number
        currency: string
        purchase_from: string | null
        receipt_url?: string | null
        reference_number: string | null
        status: FuelExpenseStatus
        reconciliation_status?: FuelReconciliationStatus
        source?: FuelSource
        approved_at: string | null
        rejection_reason?: string | null
    }
    relationships: {
        vehicle: { id: number; registration_number: string; make: string; model: string }
        driver: { id: number; name: string; email: string }
        fuel_transaction?: { id: number; type: string; amount_liters: number | null; reconciliation_status?: FuelReconciliationStatus }
    }
}

/** A single period-over-period KPI stat, as returned by GET /fuel-expenses/metrics. */
export interface FuelMetricStat {
    current: number
    previous: number
    change_percent: number
    trend: 'up' | 'down' | 'neutral'
}

export interface FuelExpenseMetrics {
    period: { start_date: string; end_date: string }
    previous_period: { start_date: string; end_date: string }
    total_fuel_purchased: FuelMetricStat
    total_cost: FuelMetricStat
    avg_price_per_litre: FuelMetricStat
    total_transactions: FuelMetricStat
    pending_approval: FuelMetricStat
}

export interface FuelCardProviderType {
    slug: 'ovh' | 'total' | 'generic_csv'
    label: string
}

export interface FuelCardVehicle {
    id: number
    registration_number: string
    make: string
    model: string
    card_status: 'requested' | 'issued' | 'blocked'
    card_number_last4: string | null
    assigned_at: string
}

export interface FuelCardAccount {
    id: number
    provider_type: 'ovh' | 'total' | 'generic_csv'
    account_name: string
    virtual_account_number: string | null
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    vehicle_count_requested: number
    status: 'pending' | 'active' | 'suspended' | 'rejected'
    activated_at: string | null
    rejection_reason: string | null
    requested_at: string
    requester: { id: number; name: string }
    vehicles: FuelCardVehicle[]
    metadata: Record<string, unknown> | null
}

export interface FuelCardProvider {
    id: string
    attributes: {
        name: string
        provider_type: 'ovh' | 'total' | 'generic_csv'
        api_key_configured: boolean
        last_sync_at: string | null
        auto_sync_enabled: boolean
        status: 'active' | 'inactive' | 'error'
    }
}

export interface FuelCardTransaction {
    id: string
    attributes: {
        external_id: string
        card_number_last4: string
        merchant_name: string
        amount: number
        volume_liters: number
        currency: string
        transaction_date: string
        jurisdiction_code: string | null
        vehicle_id: number | null
        fuel_expense_id: number | null
        status: 'unmatched' | 'matched' | 'linked'
        provider: string
    }
    relationships: Record<string, unknown>
}

export interface FuelReconciliationDiscrepancy {
    id: string
    attributes: {
        merchant_name: string
        volume_liters: number
        amount: number
        transaction_date: string
        vehicle_id: number | null
        fuel_expense_id: number | null
        status: 'needs_review' | 'disputed' | 'resolved'
        provider: string
    }
}

export interface FuelReconciliationReport {
    period: { start: string; end: string }
    summary: {
        matched_count: number
        unmatched_transactions_count: number
        unmatched_expenses_count: number
        variance_flagged_count: number
    }
    matched: Array<{
        id: number
        attributes: { type: string; amount_liters: number; occurred_at: string; fuel_expense_id: number }
        relationships: { vehicle: { id: number; registration_number: string } }
    }>
    unmatched_transactions: FuelCardTransaction[]
    unmatched_expenses: FuelExpense[]
    variance_flagged: Array<{
        transaction: { id: number; attributes: { amount_liters: number } }
        expense: { id: number; attributes: { volume: number } }
        variance_percent: number
        device_liters: number
        manual_liters: number
    }>
}

export interface FuelCapabilities {
    supportsTankLevel: boolean
    supportsObdLevel: boolean
    supportsFuelConsumption: boolean
    supportsFuelRate: boolean
    supportsGpsFuelUsage: boolean
    supportsGpsFuelRate: boolean
    supportsCalculatedConsumption: boolean
}

export interface FuelWidgets {
    showTankGauge: boolean
    showRefuelEvents: boolean
    showFuelDrainEvents: boolean
    showFuelAlerts: boolean
    showEstimatedFuelUsage: boolean
    showTripFuelConsumption: boolean
    showFuelEfficiency: boolean
    showCostEstimation: boolean
}

export interface FuelVehicle {
    id: number | string
    attributes: {
        registration_number: string
        make: string
        model: string
        fuel_type: string
        fuel_capacity: number
        device_imei: string | null
        device_online: boolean
        is_online?: boolean
        device_status?: string
        device_connected?: boolean
        speed?: number | string | null
        fuel_source?: string | null
        fuel_capabilities?: FuelCapabilities | null
        fuel_widgets?: FuelWidgets | null
        coordinates?: { latitude?: number | string | null; longitude?: number | string | null } | null
        odometer?: { lifetime_km?: number | string | null; today_km?: number | string | null } | null
    }
    fuel_level: {
        fuel_level_liters: number
        fuel_level_percent: number
        last_updated: string
        tank_capacity: number
        data_quality_score: number
        record_source?: string | null
        record_origin?: string | null
    } | null
    fuel_metrics?: {
        fuel_source?: string | null
        last_updated?: string | null
        fuel_level_liters?: number | null
        fuel_level_percent?: number | null
        fuel_consumed_counted?: number | null
    } | null
    fuel_data?: {
        device_has_fuel?: boolean
        device_fuel_source?: string | null
        has_level_reading?: boolean
        has_live_metrics?: boolean
        live_metric_source?: string | null
        live_metric_updated_at?: string | null
    } | null
    relationships?: {
        device?: { status?: string | null } | null
        current_location?: {
            latitude?: number | string | null
            longitude?: number | string | null
            speed?: number | string | null
        } | null
    }
}

export interface FuelAbnormality {
    id: number
    attributes: {
        fuel_transaction_id: number | null
        alert_time: string
        type: 'theft' | 'sudden_drop' | 'low_fuel' | 'refuel' | 'sensor_malfunction'
        previous_fuel_level: number
        current_fuel_level: number
        difference: number
        unit: string
        location: { lat: number; lng: number; address: string } | null
        confidence: number
        status: 'active' | 'acknowledged' | 'resolved' | 'false_positive'
        acknowledged_by: number | null
        acknowledged_at: string | null
        resolved_by: number | null
        resolved_at: string | null
        resolution_notes: string | null
    }
    relationships: {
        vehicle: { id: number; name: string | null; registration_number: string }
    }
}

export type FuelEconomyUnit = 'km_per_liter' | 'l_per_100km' | 'mpg'
export type FuelMeasurementUnit = 'liters' | 'gallons'
export type DefaultLandingPage = 'overview' | 'real_time_tracking' | 'fuel_transactions' | 'fuel_analysis' | 'fuel_alerts' | 'fuel_settings'
export type DefaultDateRange = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom'
export type ThresholdScope = 'all_vehicles' | 'vehicle_groups'

/** Full fuel-settings resource (GET/PUT /fuel-settings). All fields optional/nullable. */
export interface FuelSettings {
    // Notification channels
    alert_channel_email?: boolean | null
    alert_channel_in_app?: boolean | null
    alert_channel_sms?: boolean | null
    alert_channel_webhook?: boolean | null
    // System toggles
    allow_bulk_fuel_transactions_import?: boolean | null
    allow_manual_fuel_entry?: boolean | null
    fuel_theft_detection_enabled?: boolean | null
    // Thresholds
    critical_fuel_threshold_percent?: number | null
    low_fuel_threshold_percent?: number | null
    low_fuel_alert_enabled?: boolean | null
    refuel_full_threshold_percent?: number | null
    refill_threshold_liters?: number | null
    refill_threshold_percent?: number | null
    leakage_threshold_liters?: number | null
    leakage_threshold_percent?: number | null
    theft_threshold_liters?: number | null
    theft_threshold_percent?: number | null
    threshold_scope?: ThresholdScope | null
    threshold_vehicle_group_ids?: number[] | null
    // Units & formatting
    currency?: string | null
    decimal_precision?: number | null
    date_format?: string | null
    timezone?: string | null
    fuel_economy_unit?: FuelEconomyUnit | null
    fuel_measurement_unit?: FuelMeasurementUnit | null
    default_fuel_tank_capacity_liters?: number | null
    // View preferences
    default_landing_page?: DefaultLandingPage | null
    default_date_range?: DefaultDateRange | null
    // Idle detection
    idle_detection_for_fuel_analysis_minutes?: number | null
    idle_speed_threshold_kmh?: number | null
    idle_time_threshold_minutes?: number | null
    stationary_duration_seconds?: number | null
    // Data refresh / summaries
    data_refresh_interval_minutes?: number | null
    daily_summary_enabled?: boolean | null
    daily_summary_time?: string | null
    quiet_hours_enabled?: boolean | null
    quiet_hours_start?: string | null
    quiet_hours_end?: string | null
    // Sensor / detection tuning
    sensor_malfunction_alert_enabled?: boolean | null
    sensor_malfunction_invalid_count?: number | null
    min_confidence?: number | null
    min_fuel_difference_liters?: number | null
    min_fuel_difference_percent?: number | null
    max_comparison_gap_seconds?: number | null
    idempotency_window_minutes?: number | null
    // Legacy field kept for existing consumers
    alert_deduplication_hours?: number | null
}
