/**
 * Formatting for the telemetry reports. A missing figure is shown as a dash,
 * never 0: the backend sends null when something was not measured.
 */

const TZ = 'Africa/Lagos'

export const dash = '—'

export const formatDateTime = (iso: string | null | undefined): string => {
    if (!iso) return dash
    return new Date(iso).toLocaleString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return dash
    return new Date(iso.length <= 10 ? `${iso}T12:00:00+01:00` : iso).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatTime = (iso: string | null | undefined): string => {
    if (!iso) return dash
    return new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

/** 5400 → "1 h 30 min"; 45 → "45 s". */
export const formatDuration = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined) return dash
    if (seconds < 60) return `${Math.round(seconds)} s`
    const h = Math.floor(seconds / 3600)
    const m = Math.round((seconds % 3600) / 60)
    if (h === 0) return `${m} min`
    return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export const formatNumber = (value: number | null | undefined, digits = 1, unit = ''): string => {
    if (value === null || value === undefined) return dash
    const text = value.toLocaleString('en-GB', { maximumFractionDigits: digits })
    return unit ? `${text} ${unit}` : text
}

export const formatPlace = (place: { lat: number; lon: number } | null | undefined): string =>
    place ? `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}` : dash

export const mapLink = (place: { lat: number; lon: number } | null | undefined): string | null =>
    place ? `https://www.google.com/maps?q=${place.lat},${place.lon}` : null

/** YYYY-MM-DD in Lagos time, for start_date / end_date. */
export const localDate = (date: Date): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
