import type { PlaybackMovement } from '@/types'
import type { LatLng } from '@/lib/map/types'

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8 | 16 | 32

export interface PlaybackFrame extends PlaybackMovement {
  /** Playback clock in epoch milliseconds for exact timeline synchronization. */
  timeMs: number
  /** Lower raw movement index for the current interpolated segment. */
  index: number
  /** Segment interpolation progress, 0..1. */
  segmentProgress: number
  /** Distance travelled from playback start, estimated from route geometry. */
  distanceKm: number
  /** Remaining distance to playback end, estimated from route geometry. */
  remainingDistanceKm: number
  /** Elapsed playback time from first GPS record. */
  elapsedMs: number
  /** Remaining playback time to final GPS record. */
  remainingMs: number
  /** Whether the vehicle is effectively stationary at this frame. */
  isStopped: boolean
  /** Current stop duration when stationary. */
  stopDurationMs: number
}

export interface PlaybackPreparedPoint extends PlaybackMovement {
  timeMs: number
  cumulativeDistanceKm: number
}

const MIN_SEGMENT_MS = 1000
const TELEPORT_GAP_MS = 15 * 60 * 1000
const MAX_REASONABLE_SEGMENT_KM = 10

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function parseTime(timestamp: string | undefined, fallback: number): number {
  const time = timestamp ? new Date(timestamp).getTime() : Number.NaN
  return Number.isFinite(time) ? time : fallback
}

export function isValidCoordinate(point: Pick<PlaybackMovement, 'lat' | 'lng'>): boolean {
  return Number.isFinite(point.lat)
    && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90
    && Math.abs(point.lng) <= 180
    && !(point.lat === 0 && point.lng === 0)
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const radiusKm = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  return 2 * radiusKm * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function bearingDegrees(a: LatLng, b: LatLng): number {
  if (a.lat === b.lat && a.lng === b.lng) return 0
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

export function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

function interpolateAngle(from: number, to: number, t: number): number {
  return (from + shortestAngleDelta(from, to) * t + 360) % 360
}

function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

function interpolateNumber(a: unknown, b: unknown, t: number): number {
  const from = finiteNumber(a)
  const to = finiteNumber(b, from)
  return from + (to - from) * t
}

function normalizeMovement(point: PlaybackMovement, index: number, fallbackTime: number): PlaybackMovement & { timeMs: number } {
  const timeMs = parseTime(point.timestamp, fallbackTime + index * MIN_SEGMENT_MS)
  return {
    ...point,
    id: Number(point.id ?? index),
    lat: finiteNumber(point.lat),
    lng: finiteNumber(point.lng),
    speed: finiteNumber(point.speed),
    heading: finiteNumber(point.heading),
    altitude: point.altitude == null ? undefined : finiteNumber(point.altitude),
    fuel_level: point.fuel_level == null ? undefined : finiteNumber(point.fuel_level),
    fuel_level_liters: point.fuel_level_liters == null ? undefined : finiteNumber(point.fuel_level_liters),
    fuel_level_percent: point.fuel_level_percent == null ? undefined : finiteNumber(point.fuel_level_percent),
    timestamp: point.timestamp || new Date(timeMs).toISOString(),
    timeMs,
  }
}

export function preparePlaybackPoints(movements: PlaybackMovement[]): PlaybackPreparedPoint[] {
  let fallbackTime = Date.now()
  let cumulativeDistanceKm = 0
  const prepared: PlaybackPreparedPoint[] = []
  const seen = new Set<string>()

  movements
    .map((point, index) => normalizeMovement(point, index, fallbackTime))
    .filter(isValidCoordinate)
    .sort((a, b) => a.timeMs - b.timeMs)
    .forEach((point, index) => {
      if (index === 0) fallbackTime = point.timeMs
      const key = `${point.timeMs}:${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`
      if (seen.has(key)) return
      seen.add(key)
      const previous = prepared[prepared.length - 1]
      const distanceKm = previous ? haversineKm(previous, point) : 0
      const timeGapMs = previous ? point.timeMs - previous.timeMs : 0
      const shouldCountDistance = timeGapMs <= TELEPORT_GAP_MS && distanceKm <= MAX_REASONABLE_SEGMENT_KM
      cumulativeDistanceKm += shouldCountDistance ? distanceKm : 0
      prepared.push({ ...point, cumulativeDistanceKm })
    })

  return prepared
}

export function interpolatePlaybackFrame(points: PlaybackPreparedPoint[], timeMs: number): PlaybackFrame | null {
  if (points.length === 0) return null
  if (points.length === 1 || timeMs <= points[0].timeMs) return frameFromPoint(points, 0, points[0].timeMs)

  const lastIndex = points.length - 1
  if (timeMs >= points[lastIndex].timeMs) return frameFromPoint(points, lastIndex, points[lastIndex].timeMs)

  let low = 0
  let high = lastIndex
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (points[mid].timeMs <= timeMs && points[mid + 1]?.timeMs >= timeMs) {
      low = mid
      break
    }
    if (points[mid].timeMs < timeMs) low = mid + 1
    else high = mid - 1
  }

  const index = Math.min(Math.max(0, low), lastIndex - 1)
  const current = points[index]
  const next = points[index + 1]
  const segmentMs = Math.max(MIN_SEGMENT_MS, next.timeMs - current.timeMs)
  const rawProgress = Math.max(0, Math.min(1, (timeMs - current.timeMs) / segmentMs))
  const eased = smoothstep(rawProgress)
  const segmentDistanceKm = Math.max(0, next.cumulativeDistanceKm - current.cumulativeDistanceKm)
  const totalDistanceKm = points[lastIndex].cumulativeDistanceKm
  const movementHeading = segmentDistanceKm > 0.005 ? bearingDegrees(current, next) : current.heading
  const nextHeading = next.heading || movementHeading
  const heading = interpolateAngle(current.heading || movementHeading, nextHeading, eased)
  const distanceKm = current.cumulativeDistanceKm + segmentDistanceKm * rawProgress
  const isStopped = interpolateNumber(current.speed, next.speed, rawProgress) < 1 || segmentDistanceKm < 0.002

  return {
    ...current,
    lat: current.lat + (next.lat - current.lat) * eased,
    lng: current.lng + (next.lng - current.lng) * eased,
    speed: interpolateNumber(current.speed, next.speed, rawProgress),
    altitude: interpolateOptional(current.altitude, next.altitude, rawProgress),
    fuel_level: interpolateOptional(current.fuel_level, next.fuel_level, rawProgress),
    fuel_level_liters: interpolateOptional(current.fuel_level_liters, next.fuel_level_liters, rawProgress),
    fuel_level_percent: interpolateOptional(current.fuel_level_percent, next.fuel_level_percent, rawProgress),
    ignition: rawProgress < 0.5 ? current.ignition : next.ignition,
    movement: isStopped ? false : (rawProgress < 0.5 ? current.movement : next.movement),
    heading,
    timestamp: new Date(timeMs).toISOString(),
    timeMs,
    index,
    segmentProgress: rawProgress,
    distanceKm,
    remainingDistanceKm: Math.max(0, totalDistanceKm - distanceKm),
    elapsedMs: Math.max(0, timeMs - points[0].timeMs),
    remainingMs: Math.max(0, points[lastIndex].timeMs - timeMs),
    isStopped,
    stopDurationMs: isStopped ? estimateStopDuration(points, index, timeMs) : 0,
  }
}

function interpolateOptional(a: unknown, b: unknown, t: number): number | undefined {
  if (a == null && b == null) return undefined
  if (a == null) return finiteNumber(b)
  if (b == null) return finiteNumber(a)
  return interpolateNumber(a, b, t)
}

function frameFromPoint(points: PlaybackPreparedPoint[], index: number, timeMs: number): PlaybackFrame {
  const point = points[index]
  const totalDistanceKm = points[points.length - 1]?.cumulativeDistanceKm ?? 0
  const isStopped = point.speed < 1 || point.movement === false
  return {
    ...point,
    timestamp: new Date(timeMs).toISOString(),
    timeMs,
    index,
    segmentProgress: 0,
    distanceKm: point.cumulativeDistanceKm,
    remainingDistanceKm: Math.max(0, totalDistanceKm - point.cumulativeDistanceKm),
    elapsedMs: Math.max(0, timeMs - points[0].timeMs),
    remainingMs: Math.max(0, points[points.length - 1].timeMs - timeMs),
    isStopped,
    stopDurationMs: isStopped ? estimateStopDuration(points, index, timeMs) : 0,
  }
}

function estimateStopDuration(points: PlaybackPreparedPoint[], index: number, timeMs: number): number {
  let start = index
  let end = index
  while (start > 0 && points[start - 1].speed < 1) start--
  while (end < points.length - 1 && points[end + 1].speed < 1) end++
  const startMs = points[start]?.timeMs ?? timeMs
  const endMs = points[end]?.timeMs ?? timeMs
  return Math.max(0, Math.max(timeMs, endMs) - startMs)
}

export function findIndexForTime(points: PlaybackPreparedPoint[], timeMs: number): number {
  if (points.length === 0) return 0
  if (timeMs <= points[0].timeMs) return 0
  const last = points.length - 1
  if (timeMs >= points[last].timeMs) return last
  let low = 0
  let high = last
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (points[mid].timeMs <= timeMs && points[mid + 1]?.timeMs >= timeMs) return mid
    if (points[mid].timeMs < timeMs) low = mid + 1
    else high = mid - 1
  }
  return Math.max(0, low - 1)
}

export function lookAheadPoint(points: PlaybackPreparedPoint[], timeMs: number, seconds = 20): LatLng | null {
  const frame = interpolatePlaybackFrame(points, timeMs + seconds * 1000)
  return frame ? { lat: frame.lat, lng: frame.lng } : null
}
