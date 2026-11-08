/**
 * Response contracts for the Analytics Overview. Each shape was read from the
 * backend code that builds it, not from the docs (which are stale). A figure the
 * backend cannot measure is null; the UI shows a dash, never 0.
 */

// ── insights/fleet-health-score (FleetInsightsService::fleetHealthScore) ─────

export type HealthRating = 'excellent' | 'good' | 'fair' | 'poor'

/**
 * Each component is 0-100, or null when there is nothing to measure it from.
 * The fleet-wide score takes no filters.
 */
export interface FleetHealthComponents {
    vehicle_active_rate: number | null
    maintenance_compliance: number | null
    incident_free_rate: number | null
    fuel_efficiency_score: number | null
}

export type HealthStatus = 'ok' | 'insufficient_data' | 'empty_fleet'

/**
 * `status`, `missing` and `weights` come from the corrected backend. An older
 * backend sends neither: its score counted completed schedules as overdue and
 * scored missing fuel data as perfect, so without `status` the overall score is
 * not shown. With the corrected backend, `score` is null unless every factor has
 * data (`status` is then 'ok').
 */
export interface FleetHealthScore {
    score: number | null
    rating: HealthRating | null
    status?: HealthStatus
    components: FleetHealthComponents
    missing?: (keyof FleetHealthComponents)[]
    weights?: Record<keyof FleetHealthComponents, number>
    total_vehicles: number
    computed_at: string
}

// ── dashboard/vehicles/status ────────────────────────────────────────────────

export interface VehicleStatusItem {
    status: string
    count: number
    percentage: number
}

export interface VehicleStatusDistribution {
    distribution: VehicleStatusItem[]
    total: number
}

// ── analytics/gps/device-status ──────────────────────────────────────────────

export interface DeviceStatusSummary {
    total_devices: number
    online: number
    offline: number
    connected_to_vehicle: number
}

// ── dashboard/alerts ─────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning'
export type DashboardAlertType = 'fuel_alert' | 'maintenance_alert' | 'incident'

export interface DashboardAlert {
    id: string
    type: DashboardAlertType
    severity: AlertSeverity
    title: string
    description: string | null
    vehicle_id: number | null
    vehicle_registration: string | null
    created_at: string
    meta: Record<string, unknown>
}

// ── insights/detect-anomalies (rule based; ids change on every call) ─────────

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low'

export interface Anomaly {
    /** uniqid(): not stable between calls, so never use it to dismiss or track an anomaly. */
    id: string
    type: string
    severity: AnomalySeverity
    title: string
    description: string
    vehicle_id?: number | null
    vehicle_registration?: string | null
    impact?: string
    suggested_action?: string
    /** A constant per rule, not a statistical confidence. */
    confidence_score?: number
    data?: Record<string, unknown>
}

export interface AnomalyReport {
    anomaly_count: number
    critical_count: number
    high_count: number
    medium_count: number
    low_count: number
    detected_at: string
    lookback_days: number
    anomalies: Anomaly[]
}

// ── incidents ────────────────────────────────────────────────────────────────

/** All-time, whatever the period filter says. */
export interface IncidentSummary {
    total: number
    open: number
    resolved: number
    closed: number
    dismissed: number
    escalated: number
}

/** Legacy chart shape: parallel arrays, zero-gaps not guaranteed. */
export interface LabelledSeries {
    labels: string[]
    data: number[]
    chart_type?: string
}

// ── gps/trip-summary (only the tracker-recorded trip fields are used) ────────

export interface TripCounts {
    /** Trips the trackers recorded. */
    device_trips: number
    /** True when the period starts before the 60-day reporting store. */
    device_trips_partial: boolean
    period: { start: string; end: string }
}

// ── Errors ───────────────────────────────────────────────────────────────────

/**
 * Why an analytics call failed, from what the backend says (the backend is
 * authoritative for permissions and subscription; the UI duplicates neither).
 */
export type AnalyticsErrorKind =
    | 'forbidden' // 403 ANALYTICS_ACCESS_DENIED: the role lacks this analytics category
    | 'not_in_plan' // 403 any other code: the plan lacks the module
    | 'payment_required' // 402
    | 'unavailable' // anything else: network, 5xx, 422

// ── Fleet (fleet/utilization-summary, availability-snapshot, availability-trend) ──

/**
 * What the backend counted as "active" for the period. `status_snapshot` means
 * there was no GPS or trip data in the period, so the figure is today's status
 * and does not depend on the period at all.
 */
export type ActivitySource = 'gps_odometer' | 'vehicle_locations' | 'trips' | 'status_snapshot'

/**
 * Distance fields (total_distance_km, avg_distance_km, data_source) come back in
 * the same payload but are deliberately not typed: distance is not shown until
 * its units are verified, and an untyped field cannot be read by accident.
 */
export interface FleetUtilizationSummary {
    total_vehicles: number
    active_vehicles: number
    devices_reporting: number
    /** Share of vehicles active in the period, 0-100. Not a measure of hours used. */
    utilization_rate_pct: number
    reporting_rate_pct: number
    period: { start: string; end: string }
    activity_source: ActivitySource
}

export interface AvailabilitySnapshot {
    total: number
    by_status: Record<string, number>
}

export interface AvailabilityPoint {
    period: string
    active_vehicles: number
    /** Share of today's fleet that was active in this bucket, 0-100. */
    availability_pct: number
}

export interface AvailabilityTrend {
    trend: AvailabilityPoint[]
    total_vehicles: number
    activity_source: ActivitySource
}

// ── Drivers (drivers/trip-summary, incident-history, compliance; events/counts by driver) ──

/**
 * Dispatched trips (the trips table), not tracker trips. Distance and fuel come
 * back in the same payload but are deliberately not typed: distance is not shown
 * until its units are verified.
 */
export interface DriverTripRow {
    driver_id: number
    driver_name: string
    trips_count: number
}

export interface DriverTripSummary {
    period: { start: string; end: string }
    drivers: DriverTripRow[]
}

/** Incidents per driver over the last 90 days (fixed by the backend, whatever the period says). */
export interface DriverIncidentRow {
    driver_id: number
    driver_name: string
    incident_count: number
}

/** Per-driver tracker-store totals for the period. Distance is deliberately not part of the contract. */
export interface DriverTelemetryRow {
    driver_id: number
    driver: string | null
    trips: number
    duration_s: number
    idle_s: number
    active_days: number
}

export interface DriverTelemetrySummary {
    data: DriverTelemetryRow[]
    totals: { drivers: number; trips: number; duration_s: number; idle_s: number; unassigned_trips: number }
}

/** Time a driver spent in each vehicle. */
export interface DriverVehicleUsageRow {
    driver_id: number
    driver: string | null
    vehicle_id: number
    vehicle: string | null
    trips: number
    duration_s: number
}

export interface DriverVehicleUsage {
    data: DriverVehicleUsageRow[]
    totals: { rows: number; truncated: boolean }
}

/** A driver's or a vehicle's document that is expired or about to expire. `days_left` is negative once expired. */
export interface ExpiringDocument {
    id: number | string
    owner_type: 'driver' | 'vehicle'
    owner_id: number
    owner: string | null
    category: string | null
    title: string | null
    expires_at: string
    days_left: number
    status: 'expired' | 'expiring'
}

export interface DocumentExpiry {
    data: ExpiringDocument[]
    totals: { driver: { expired: number; expiring: number }; vehicle: { expired: number; expiring: number } }
    meta: { days: number; limit: number; truncated: boolean; expired_lookback_days: number; superseded_filtered: boolean }
}

/** Pre-trip inspections by driver and day. `with_defects` is null when the backend cannot tell. */
export interface InspectionRow {
    date: string
    driver_id: number
    driver: string | null
    inspections: number
    with_defects: number | null
}

export interface InspectionSummary {
    data: InspectionRow[]
    totals: { inspections: number; with_defects: number | null; drivers: number }
}
