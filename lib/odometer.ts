import type {
    DistanceUnit,
    MileageState,
    OdometerStatus,
    ReviewReason,
    SubmitOutcome,
    VehicleOdometer,
} from '@/types/odometer'

export const KM_PER_MILE = 1.609344

export const ODOMETER_REQUIRED_LABEL = 'Odometer reading required'

export function kmToUnit(km: number, unit: DistanceUnit): number {
    return unit === 'mi' ? km / KM_PER_MILE : km
}

export function unitToKm(value: number, unit: DistanceUnit): number {
    return unit === 'mi' ? value * KM_PER_MILE : value
}

/** Rounds only here, at presentation, and always states the unit. Null and non-finite are "unavailable". */
export function formatDistance(
    value: number | string | null | undefined,
    unit: DistanceUnit = 'km',
    maximumFractionDigits = 1,
): string | null {
    if (value === null || value === undefined || value === '') return null
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return null
    return `${n.toLocaleString(undefined, { maximumFractionDigits })} ${unit}`
}

type OdoLike = Partial<VehicleOdometer> | null | undefined

function pickDisplay(odo: OdoLike, which: 'lifetime' | 'today'): { value: number; unit: DistanceUnit } | null {
    if (!odo) return null
    const km = which === 'lifetime' ? odo.lifetime_km : odo.today_km
    const shown = odo.display?.[which]
    if (shown !== null && shown !== undefined && Number.isFinite(Number(shown))) {
        return { value: Number(shown), unit: odo.unit === 'mi' ? 'mi' : 'km' }
    }
    if (km !== null && km !== undefined && Number.isFinite(Number(km))) {
        return { value: Number(km), unit: 'km' }
    }
    return null
}

/** The accepted total, in the organisation's unit, as text; null when there is none (never "0"). */
export function formatLifetime(odo: OdoLike): string | null {
    const d = pickDisplay(odo, 'lifetime')
    return d ? formatDistance(d.value, d.unit) : null
}

/** Today's trusted distance as text; null when unavailable. Zero is a real value and is shown. */
export function formatToday(odo: OdoLike): string | null {
    const d = pickDisplay(odo, 'today')
    return d ? formatDistance(d.value, d.unit) : null
}

/** A vehicle needs a dashboard reading when it has no accepted total. Unknown block (null) is not asserted. */
export function needsOdometerReading(odo: OdoLike): boolean {
    if (!odo) return false
    if (odo.status === 'uninitialised') return true
    return odo.lifetime_km === null || odo.lifetime_km === undefined
}

const STATUS_LABELS: Record<string, string> = {
    uninitialised: ODOMETER_REQUIRED_LABEL,
    verified: 'Verified',
    customer_supplied: 'Customer supplied',
    installer_supplied: 'Installer supplied',
    device_reported: 'Device reported',
    gps_derived: 'Estimate (GPS distance)',
    estimated: 'Estimate',
    pending_review: 'Pending review',
    stale: 'Stale',
    disputed: 'Disputed',
}

export function statusLabel(status: OdometerStatus | string | null | undefined): string | null {
    return status ? (STATUS_LABELS[status] ?? null) : null
}

const SOURCE_LABELS: Record<string, string> = {
    installer_supplied: 'Installer reading',
    customer_supplied: 'Customer reading',
    admin_supplied: 'Administrator reading',
    tracker_aligned: 'Dashboard reading aligned with tracker',
    gps_derived: 'Estimated from GPS distance',
    continuity_estimate: 'Continuity estimate',
}

/** Unknown values (including the retired `device_native` / `haversine`) have no label rather than a wrong one. */
export function sourceLabel(source: string | null | undefined): string | null {
    return source ? (SOURCE_LABELS[source] ?? null) : null
}

/** An estimate is a figure not anchored to a dashboard reading: GPS-derived, estimated or continuity. */
export function isEstimate(odo: OdoLike): boolean {
    if (!odo) return false
    return (
        odo.status === 'gps_derived' ||
        odo.status === 'estimated' ||
        odo.source === 'gps_derived' ||
        odo.source === 'continuity_estimate'
    )
}

export type OdometerTone = 'neutral' | 'estimate' | 'warning' | 'danger'

export interface OdometerSummary {
    /** True when there is no accepted total and the user must enter a dashboard reading. */
    required: boolean
    lifetime: string | null
    today: string | null
    /** Short badge text, e.g. "Estimate", "Pending review", "Disputed"; null for an ordinary figure. */
    badge: string | null
    tone: OdometerTone
    sourceText: string | null
}

export function summariseOdometer(odo: OdoLike): OdometerSummary {
    const required = needsOdometerReading(odo)
    const lifetime = required ? null : formatLifetime(odo)
    const today = formatToday(odo)
    let badge: string | null = null
    let tone: OdometerTone = 'neutral'
    if (required) {
        badge = ODOMETER_REQUIRED_LABEL
        tone = 'warning'
    } else if (odo?.status === 'disputed') {
        badge = 'Disputed'
        tone = 'danger'
    } else if (odo?.status === 'pending_review' || odo?.review?.pending) {
        badge = 'Pending review'
        tone = 'warning'
    } else if (isEstimate(odo)) {
        badge = 'Estimate'
        tone = 'estimate'
    } else if (odo?.status === 'stale') {
        badge = 'Stale'
        tone = 'warning'
    }
    return { required, lifetime, today, badge, tone, sourceText: sourceLabel(odo?.source) }
}

const REASON_LABELS: Record<string, string> = {
    decrease: 'Reading is lower than the accepted total',
    decrease_above_threshold: 'Reading is much lower than the accepted total',
    discrepancy: 'Reading differs from the distance the tracker recorded',
    implausible_jump: 'Reading implies an implausible distance since the last one',
    probable_rollover: 'Possible odometer rollover',
    dashboard_replacement: 'Dashboard replaced',
    reset: 'Odometer reset',
    suspected_tampering: 'Suspected tampering',
    unusable_timestamps: 'Timestamps could not be used to check the reading',
    legacy_client_value: 'Sent by an older app version',
    disputed_baseline: 'Baseline is disputed',
}

export function reasonLabel(reason: ReviewReason | string | null | undefined): string | null {
    if (!reason) return null
    return REASON_LABELS[reason] ?? reason.replace(/_/g, ' ')
}

export function outcomeMessage(outcome: SubmitOutcome, reason?: string | null): { title: string; detail: string; tone: 'success' | 'info' | 'warning' | 'error' } {
    switch (outcome) {
        case 'accepted':
            return { title: 'Reading accepted', detail: 'The vehicle odometer has been updated.', tone: 'success' }
        case 'pending_sync':
            return {
                title: 'Reading saved, waiting to sync',
                detail: 'The reading is valid and is being sent to the telemetry platform. The odometer will update once it is acknowledged.',
                tone: 'info',
            }
        case 'pending_review': {
            const why = reasonLabel(reason)
            return {
                title: 'Reading needs review',
                detail: `${why ? `${why}. ` : ''}The odometer is unchanged until a reviewer decides.`,
                tone: 'warning',
            }
        }
        default:
            return { title: 'Reading rejected', detail: 'The reading did not pass validation.', tone: 'error' }
    }
}

const MILEAGE_LABELS: Record<MileageState, string | null> = {
    inactive_no_baseline: ODOMETER_REQUIRED_LABEL,
    target_required: 'Mileage target required',
    suspended: 'Mileage trigger suspended (baseline disputed)',
    active: null,
}

export function mileageStateLabel(state: MileageState | string | null | undefined): string | null {
    return state ? (MILEAGE_LABELS[state as MileageState] ?? null) : null
}

/** One line for a detail row: the total with its qualifier, or "Odometer reading required". Never "0 km" for unknown. */
export function odometerHeadline(odo: OdoLike): string {
    if (!odo) return 'N/A'
    const s = summariseOdometer(odo)
    if (s.required) return ODOMETER_REQUIRED_LABEL
    const base = s.lifetime ?? 'N/A'
    return s.badge ? `${base} (${s.badge.toLowerCase()})` : base
}

/** The odometer's rollover capacity, with whether it is a guess ("assumed"), set by an admin, or absent. */
export function capacityText(cap: VehicleOdometer['capacity'] | undefined): string {
    if (!cap) return 'N/A'
    if (cap.state === 'none') return 'No rollover (digital dashboard)'
    const v = formatDistance(cap.km, 'km', 0)
    if (!v) return 'N/A'
    return cap.state === 'assumed_default' ? `${v} (assumed default)` : v
}

/** Review rows carry km for accepted figures and the submitter's own value and unit for the reading. */
export function reviewReadingText(r: { original_value: number | null; original_unit: DistanceUnit | null } | null | undefined): string {
    if (!r) return '—'
    return formatDistance(r.original_value, r.original_unit ?? 'km') ?? '—'
}

export function reviewStatusLabel(status: string, overdue: boolean): string {
    if (status === 'pending' && overdue) return 'Overdue'
    return status.charAt(0).toUpperCase() + status.slice(1)
}

export function responsibleLabel(r: { type: string; name: string } | null | undefined): string {
    if (!r) return 'Unassigned'
    if (r.type === 'support_queue') return 'EonsFleet support'
    return r.name || 'Unassigned'
}

const READING_STATUS_LABELS: Record<string, string> = {
    pending_sync: 'Waiting to sync',
    accepted: 'Accepted',
    pending_review: 'Pending review',
    rejected: 'Rejected',
    superseded: 'Superseded',
}

export function readingStatusLabel(status: string | null | undefined): string {
    return status ? (READING_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')) : '—'
}

const KIND_LABELS: Record<string, string> = {
    reading: 'Reading',
    correction: 'Correction',
    dashboard_replacement: 'Dashboard replaced',
    reset: 'Reset',
    rollover_confirmation: 'Rollover confirmed',
}

export function readingKindLabel(kind: string | null | undefined): string {
    return kind ? (KIND_LABELS[kind] ?? kind.replace(/_/g, ' ')) : '—'
}

const SOURCE_READING_LABELS: Record<string, string> = {
    installer_supplied: 'Installer',
    customer_supplied: 'Customer',
    admin_supplied: 'Administrator',
    import: 'CSV import',
    legacy_client: 'Older app version',
}

export function readingSourceLabel(source: string | null | undefined): string {
    return source ? (SOURCE_READING_LABELS[source] ?? source.replace(/_/g, ' ')) : '—'
}

/** The checks that did not simply pass, e.g. "discrepancy: flagged". Empty when everything passed or was not applicable. */
export function validationSummary(
    v: { checks?: { name: string; result: string }[]; reason?: string | null } | null | undefined,
): string[] {
    const out = (v?.checks ?? [])
        .filter(c => !['pass', 'not_applicable', 'skipped'].includes(c.result))
        .map(c => `${c.name}: ${c.result.replace(/_/g, ' ')}`)
    const reason = reasonLabel(v?.reason)
    if (reason) out.push(reason)
    return out
}
