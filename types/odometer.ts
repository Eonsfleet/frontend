/**
 * Odometer redesign: types for the vehicle `odometer` block, readings, reviews,
 * settings, CSV import and mileage maintenance. Mirrors API_CONTRACT.md.
 *
 * All `*_km` fields are kilometres as numbers. Values in the organisation's
 * unit appear only under `display`. Missing is `null`, never 0.
 */

export type DistanceUnit = 'km' | 'mi'

export type OdometerStatus =
    | 'uninitialised'
    | 'verified'
    | 'customer_supplied'
    | 'installer_supplied'
    | 'device_reported'
    | 'gps_derived'
    | 'estimated'
    | 'pending_review'
    | 'stale'
    | 'disputed'

export type OdometerSource =
    | 'installer_supplied'
    | 'customer_supplied'
    | 'admin_supplied'
    | 'tracker_aligned'
    | 'gps_derived'
    | 'continuity_estimate'

export type CapacityState = 'assumed_default' | 'set' | 'none'

export interface VehicleOdometer {
    /** Legacy, always null after cutover. Never a baseline: do not display. */
    at_join_km?: number | null
    /** Accepted dashboard-aligned total in km; null when there is no accepted baseline. */
    lifetime_km: number | null
    /** Trusted platform distance for the vehicle's local day; null when unavailable. */
    today_km: number | null
    /** Null when there is no accepted total. Unknown strings (older servers) are tolerated. */
    source: OdometerSource | (string & {}) | null
    status?: OdometerStatus | (string & {}) | null
    unit?: DistanceUnit | null
    display?: { lifetime: number | null; today: number | null } | null
    effective_at?: string | null
    baseline?: {
        value_km: number | null
        effective_at: string | null
        source: string | null
        physically_inspected: boolean | null
    } | null
    last_tracker_reading?: { value_km: number | null; at: string | null } | null
    review?: { pending: boolean; review_id: number | null; reason: string | null } | null
    capacity?: { km: number | null; state: CapacityState } | null
}

export type ReadingStatus = 'pending_sync' | 'accepted' | 'pending_review' | 'rejected' | 'superseded'
export type ReadingKind = 'reading' | 'correction' | 'dashboard_replacement' | 'reset' | 'rollover_confirmation'
export type SubmitOutcome = 'accepted' | 'pending_sync' | 'pending_review' | 'rejected'

export type ReviewReason =
    | 'decrease'
    | 'decrease_above_threshold'
    | 'discrepancy'
    | 'implausible_jump'
    | 'probable_rollover'
    | 'dashboard_replacement'
    | 'reset'
    | 'suspected_tampering'
    | 'unusable_timestamps'
    | 'legacy_client_value'
    | 'disputed_baseline'

export interface SubmitReadingPayload {
    value: number
    unit?: DistanceUnit
    effective_at?: string
    kind?: ReadingKind
    physically_inspected?: boolean
    reason?: string | null
    note?: string | null
    evidence_ids?: number[]
}

export interface OdometerEvidence {
    id: number
    kind: 'dashboard_photo' | 'document'
    mime?: string
    size?: number
    created_at: string
}

export interface OdometerReading {
    id: number
    vehicle_id: number
    value_km: number
    original_value: number
    original_unit: DistanceUnit
    effective_at: string
    recorded_at: string
    kind: ReadingKind
    source: string
    physically_inspected: boolean
    status: ReadingStatus
    previous_accepted_km: number | null
    validation?: {
        checks: { name: string; result: string; detail?: Record<string, unknown> }[]
        reason: string | null
    }
    submitted_by?: { type: string; id: number; name: string } | null
    engine?: { acknowledged: boolean; acknowledged_at: string | null }
    evidence?: OdometerEvidence[]
    created_at: string
}

export interface SubmitReadingResult {
    reading: OdometerReading
    outcome: SubmitOutcome
    review?: OdometerReview | null
    odometer: VehicleOdometer
}

export interface OdometerReview {
    id: number
    vehicle: { id: number; registration_number: string }
    reading: {
        id: number
        value_km: number
        original_value: number
        original_unit: DistanceUnit
        effective_at: string
    }
    level: 'organisation' | 'support'
    reason: ReviewReason | (string & {})
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    overdue: boolean
    previous_accepted_km: number | null
    proposed_km: number | null
    responsible: { type: string; id: number | null; name: string }
    requires_photo: boolean
    has_photo: boolean
    approvals_required: number
    approvals: {
        by: { type: string; id: number; name: string }
        decision: 'approved' | 'rejected'
        reason: string
        at: string
    }[]
    created_at: string
    resolved_at: string | null
    history: { at: string; event: string; by: { type?: string; id?: number; name?: string } | null; detail: string | null }[]
}

export type ReviewListStatus = 'pending' | 'overdue' | 'approved' | 'rejected'

export interface OdometerSettings {
    distance_unit: DistanceUnit
    small_fix_km: number
    tolerance_km: number
    tolerance_percent: number
    plausibility_km_per_day: number
    review_reminder_days: number
}

export interface ImportPreviewRow {
    row: number
    registration_number?: string | null
    vehicle_id?: number | null
    value?: number | null
    unit?: string | null
    effective_at?: string | null
    status: 'valid' | 'invalid'
    errors: string[]
}

export interface ImportPreview {
    import_id: string
    rows: ImportPreviewRow[]
    summary: { total: number; valid: number; invalid: number }
}

export interface ImportConfirmResult {
    summary: { accepted: number; pending_sync: number; pending_review: number; failed: number }
    failed_rows: { row: number; errors: string[] }[]
}

export type MileageState = 'inactive_no_baseline' | 'target_required' | 'active' | 'suspended'

export interface ScheduleMileage {
    state: MileageState
    interval_km: number | null
    interval_display?: { unit: DistanceUnit; value: number } | null
    next_due_km: number | null
    remaining_km: number | null
}

export interface MileageConfigPayload {
    interval: number
    unit: DistanceUnit
    first_due_km?: number | null
    confirm_overdue?: boolean
    confirm_postpone?: boolean
}
