export type FuelExpenseStatus = 'pending_approval' | 'approved' | 'rejected' | 'reimbursed'
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
        reference_number: string | null
        status: FuelExpenseStatus
        source?: FuelSource
        approved_at: string | null
        rejection_reason?: string | null
    }
    relationships: {
        vehicle: { id: number; registration_number: string; make: string; model: string }
        driver: { id: number; name: string; email: string }
    }
}

export interface FuelExpenseMetrics {
    total_volume: number
    total_cost: number
    average_cost_per_liter: number
    pending_count: number
    approved_count: number
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

export interface FuelVehicle {
    id: number
    attributes: {
        registration_number: string
        make: string
        model: string
        fuel_type: string
        fuel_capacity: number
        device_imei: string | null
        device_online: boolean
    }
    fuel_level: {
        fuel_level_liters: number
        fuel_level_percent: number
        last_updated: string
        tank_capacity: number
        data_quality_score: number
    } | null
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

export interface FuelSettings {
    low_fuel_threshold_percent: number
    low_fuel_alert_enabled: boolean
    sensor_malfunction_alert_enabled: boolean
    sensor_malfunction_invalid_count: number
    alert_deduplication_hours: number
}
