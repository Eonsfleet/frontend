import apiClient from './client'

/**
 * Telemetry reports (backend reports phases 2–6): GPS, routes and alarms read
 * from the reporting store, the fuel report by source, utilization, and the
 * report catalog. Times are ISO 8601 in Africa/Lagos; durations are seconds.
 *
 * The reporting store keeps 60 days: a range starting earlier is cut to the
 * window and comes back with meta.partial = true and meta.available_from.
 * A figure that cannot be measured is null, never 0.
 */

export type ReportPeriod = '1d' | '7d' | '30d' | '60d'

export interface ReportFilters {
    filter?: ReportPeriod
    start_date?: string
    end_date?: string
    vehicle_ids?: number[]
    driver_ids?: number[]
    cluster_ids?: number[]
    categories?: string[]
    severities?: string[]
    kinds?: string[]
    page?: number
    per_page?: number
}

export interface ReportMeta {
    from: string
    to: string
    timezone: string
    partial: boolean
    available_from: string | null
    sensor_available_from?: string | null
    page: number
    per_page: number
    total: number
    last_page: number
}

export interface Place {
    lat: number
    lon: number
}

export type LitresSource = 'GPS estimate' | 'Sensor' | 'GPS estimate and Sensor' | null

interface Who {
    vehicle_id: number
    vehicle: string | null
    driver_id: number | null
    driver: string | null
}

export interface TripRow extends Who {
    id: string
    state: 'open' | 'closed' | 'voided'
    started_at: string | null
    ended_at: string | null
    duration_s: number | null
    start: Place | null
    end: Place | null
    distance_km: number | null
    distance_quality: string | null
    max_speed_kmh: number | null
    idle_s: number | null
    idle_measurable: boolean
    stops: number | null
    litres: number | null
    litres_source: LitresSource
    fuel_caveats: string[]
    speeding_count: number
    harsh_count: number
    end_reason: string | null
    gaps: boolean | null
}

export interface TripTotals {
    trips: number
    distance_km: number
    duration_s: number
    idle_s: number
    litres: number | null
    litres_source: LitresSource
    max_speed_kmh: number | null
}

export interface DailyRow {
    date: string
    vehicle_id: number
    vehicle: string | null
    distance_km: number
    trips: number
    driving_s: number
    idle_s: number
    first_start_at: string | null
    last_end_at: string | null
    max_speed_kmh: number | null
    speeding_count: number
    speeding_s: number
    alarm_count: number
    stops: number
    offline_s: number
    estimated_litres: number | null
    litres_source: LitresSource
}

export interface StopRow extends Who {
    id: string
    arrived_at: string | null
    departed_at: string | null
    duration_s: number | null
    idle_s: number | null
    place: Place | null
    geofence: { id: number | null; name: string | null } | null
    in_trip: boolean | null
}

export interface TrackerRow {
    device_id: number
    imei: string
    vehicle_id: number | null
    vehicle: string | null
    online: boolean
    connection: 'connected' | 'disconnected' | null
    connection_changed_at: string | null
    last_report_at: string | null
    last_fix_at: string | null
    offline_s: number | null
    offline_count: number | null
    external_voltage: string | null
    battery_voltage: string | null
    power: string | null
    sleep_mode: string | null
    gsm_operator: string | number | null
    model: string | null
    protocol: string | null
}

export interface RoutePoint {
    at: string | null
    lat: number | null
    lon: number | null
    speed_kmh: number | null
    heading: number | null
    altitude_m: number | null
    satellites: number | null
    ignition: string | null
    movement: string | null
    odometer_km: number | null
    fuel_level_liters: number | null
    fuel_level_percent: number | null
    readings: Record<string, string | number>
    source: 'platform' | 'archive'
}

export interface ScheduledTripRow {
    id: number
    trip_number: string | null
    status: string | null
    vehicle_id: number | null
    vehicle: string | null
    driver_id: number | null
    driver: string | null
    planned_start_at: string | null
    planned_end_at: string | null
    planned_distance_km: number | null
    actual_start_at: string | null
    actual_end_at: string | null
    actual_distance_km: number | null
    estimated_litres: number | null
    device_trips: { id: string; started_at: string | null; ended_at: string | null; distance_km: number | null }[]
}

export type EventCategory = 'alarm' | 'driving' | 'speeding' | 'geofence' | 'idling' | 'engine' | 'status' | 'fuel'
export type EventSeverity = 'critical' | 'warning' | 'info'

export interface EventRow extends Who {
    id: string
    kind: string
    title: string
    category: EventCategory
    severity: EventSeverity | null
    started_at: string | null
    ended_at: string | null
    duration_s: number | null
    place: Place | null
    speed_kmh: number | null
    limit_kmh: number | null
    litres: number | null
    geofence: { platform_id: string | null; name: string | null } | null
    notified: boolean
    evidence: string | null
    start_missing: boolean
}

export interface EventCountRow {
    key: string | number | null
    label: string | null
    total: number
    by_kind: Record<string, { title: string; count: number }>
    distance_km?: number
    per_100_km?: number | null
}

export interface EventTrendRow {
    period: string
    total: number
    by_category: Partial<Record<EventCategory, number>>
}

export interface Page<T, Extra = object> {
    data: T[]
    meta: ReportMeta
    extra: Extra
}

/** The backend wants vehicle_ids[]=1&vehicle_ids[]=2, as Laravel reads arrays. */
const params = (f: object = {}) => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(f)) {
        if (value === undefined || value === null || value === '') continue
        if (Array.isArray(value)) {
            if (value.length > 0) out[`${key}[]`] = value
        } else {
            out[key] = value
        }
    }
    return out
}

/** The same serializer, for other report-style endpoints (analyticsDrivers.ts). */
export { params as reportParams }

const get = async <T,>(url: string, filters: object = {}): Promise<T> => {
    const res = await apiClient.get(url, { params: params(filters), paramsSerializer: { indexes: null } })
    return res.data?.data ?? res.data
}

const page = async <T, Extra = object>(url: string, filters: object = {}): Promise<Page<T, Extra>> => {
    const body = await get<{ data: T[]; meta: ReportMeta } & Extra>(url, filters)
    const { data, meta, ...extra } = body
    return { data, meta, extra: extra as Extra }
}

export const getTrips = (f: ReportFilters) => page<TripRow, { totals: TripTotals; vehicles: (TripTotals & { vehicle_id: number; vehicle: string | null })[] }>('/analytics/gps/trips', f)
export const getDailyDriving = (f: ReportFilters) => page<DailyRow, { totals: Record<string, number | null> }>('/analytics/gps/daily', f)
export const getStops = (f: ReportFilters) => page<StopRow, { totals: { stops: number; duration_s: number; idle_s: number } }>('/analytics/gps/stops', f)
export const getTrackers = (f: ReportFilters) => page<TrackerRow, { totals: { trackers: number; online: number; offline: number } }>('/analytics/gps/devices', f)
export const getScheduledTrips = (f: ReportFilters) => page<ScheduledTripRow>('/analytics/gps/scheduled-trips', f)
export const getRouteHistory = (f: ReportFilters & { vehicle_id: number }) => page<RoutePoint, { vehicle_id: number; vehicle: string | null }>('/analytics/gps/route-history', f)
export const getEvents = (f: ReportFilters) => page<EventRow>('/analytics/events', f)
export const getEventCounts = (f: ReportFilters & { group_by?: 'vehicle' | 'driver' | 'category' | 'kind' }) => page<EventCountRow, { group_by: string }>('/analytics/events/counts', f)
export const getEventTrend = (f: ReportFilters) => page<EventTrendRow, { interval: 'day' | 'week' }>('/analytics/events/trend', f)

/**
 * Any catalogued report's rows on screen, from the endpoint its catalog entry
 * names (the catalog writes it with the /v1 prefix, which the client adds).
 */
export const previewReport = (endpoint: string, f: ReportFilters & Record<string, unknown> = {}) =>
    page<Record<string, unknown>, Record<string, unknown>>(endpoint.replace(/^\/v1/, ''), f)

/** The longest route history the backend answers on screen (else 422). */
export const ROUTE_MAX_DAYS = 3

/** Downloads a report through the export endpoint with the same filters as the screen. */
export const exportTelemetryReport = async (reportType: string, format: 'csv' | 'excel' | 'pdf', f: ReportFilters & Record<string, unknown> = {}) => {
    // An export holds every row: the screen's paging is not sent.
    const filters: Record<string, unknown> = { ...f }
    delete filters.page
    delete filters.per_page
    const res = await apiClient.get('/analytics/reports/export', {
        params: params({ report_type: reportType, format, ...filters }),
        paramsSerializer: { indexes: null },
        responseType: 'blob',
    })
    const ext = format === 'excel' ? 'xlsx' : format
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-${f.filter ?? f.start_date ?? 'report'}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// ── Fuel report by source (backend reports phase 3) ─────────────────────────

export type FuelSourceLabel = 'GPS estimate' | 'Sensor' | 'System: purchase' | 'System: refill detected'

export interface FuelReportRow {
    vehicle_id: number
    vehicle: string | null
    fuel_type: string | null
    period: string | null
    distance_km: number | null
    estimated: {
        litres: number | null
        trips: number
        estimated_trips: number
        partial_trips: number
        unavailable_trips: number
        baselines: string[]
        source: FuelSourceLabel
        status: { state: 'ok' | 'partial' | 'unavailable'; reason: string | null; note: string | null }
    } | null
    measured: { litres: number | null; trips: number; source: FuelSourceLabel } | null
    purchased: { litres: number; cost: number; entries: number; pending: number; source: FuelSourceLabel } | null
    refills: { litres: number; count: number; source: FuelSourceLabel } | null
    consumption: { litres: number | null; source: FuelSourceLabel | null; l_per_100km: number | null }
    purchased_minus_consumed: number | null
}

export interface FuelReportTotals {
    distance_km: number
    by_source: { source: FuelSourceLabel; litres: number; cost?: number }[]
    consumption_litres: number
    vehicles_not_estimated: number
}

export const getFuelReport = (f: ReportFilters & { group?: 'vehicle' | 'day' | 'week' | 'month' }) =>
    page<FuelReportRow, { group: string; totals: FuelReportTotals }>('/analytics/fuel/report', f)

// ── Telemetry setup (backend reports phase 5) ────────────────────────────────

export interface TrackerInputs {
    fuel_level?: { io_id: number; scale: number; unit: 'litres' | 'percent' }
    fuel_counter_l?: { io_id: number; scale: number }
}

export interface WorkingHoursValue {
    start: string
    end: string
    days?: number[]
}

export interface VehicleSetup {
    vehicle_id: number
    vehicle?: string
    fuel_accuracy: 'high' | 'medium' | 'low'
    fuel_source: 'Sensor' | 'GPS estimate' | null
    consumption_l_per_100km: number | null
    tracker: {
        device_id: number
        imei: string
        protocol: 'teltonika' | 'gt06' | null
        model: string | null
        inputs: TrackerInputs
        reporting_interval_s: number | null
        gt06_heartbeat_ignition: boolean | null
        sync_status: string
    } | null
    working_hours: WorkingHoursValue | null
    missing: { key: string; note: string }[]
}

export const getVehicleSetup = async (vehicleId: number | string): Promise<VehicleSetup> => {
    const res = await apiClient.get(`/vehicles/${vehicleId}/telemetry-setup`)
    return res.data?.data ?? res.data
}

export const getFleetSetup = async (params: { page?: number; per_page?: number; incomplete?: boolean }) => {
    const res = await apiClient.get('/vehicles/telemetry-setup', { params: { ...params, incomplete: params.incomplete ? 1 : undefined } })
    return (res.data?.data ?? res.data) as { data: VehicleSetup[]; meta: { page: number; per_page: number; total: number; last_page: number } }
}

/** Only the keys sent change; null clears one. */
export const updateTrackerSettings = async (deviceId: number, settings: {
    fuel_level?: TrackerInputs['fuel_level'] | null
    fuel_counter_l?: TrackerInputs['fuel_counter_l'] | null
    reporting_interval_s?: number | null
    gt06_heartbeat_ignition?: boolean | null
}): Promise<VehicleSetup | null> => {
    const res = await apiClient.put(`/devices/${deviceId}/telemetry-settings`, settings)
    return res.data?.data ?? null
}

export const updateWorkingHours = async (vehicleId: number, workingHours: WorkingHoursValue | null): Promise<VehicleSetup> => {
    const res = await apiClient.put(`/vehicles/${vehicleId}/working-hours`, { working_hours: workingHours })
    return res.data?.data ?? res.data
}

// ── Utilization against working hours (backend reports phase 4) ─────────────

export interface UtilizationRow {
    vehicle_id: number
    vehicle: string | null
    working_hours: { start: string; end: string; days: number[]; own: boolean }
    working_s: number
    engine_s: number
    engine_in_hours_s: number
    after_hours_s: number
    parked_s: number
    driving_s: number
    idle_s: number | null
    idle_measurable: boolean
    utilization_pct: number | null
    band: 'under' | 'normal' | 'over' | null
    days_used: number
    working_days: number
    trips: number
    distance_km: number
    avg_trip_km: number | null
    offline_s: number
}

export const getUtilizationReport = (f: ReportFilters) =>
    page<UtilizationRow, {
        totals: { vehicles: number; utilization_pct: number | null; under: number; over: number; distance_km: number; trips: number; after_hours_s: number }
        thresholds: { under_pct: number; over_pct: number }
    }>('/analytics/fleet/utilization-report', f)
