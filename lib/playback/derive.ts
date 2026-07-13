import type { Geofence, PlaybackEvent, PlaybackMovement, PlaybackSpeedBucket, PlaybackSpeedSegment, PlaybackStats, PlaybackStop } from '@/types'

const EARTH_RADIUS_KM = 6371
const IDLE_SPEED_KMH = 2
const HARSH_ACCEL_THRESHOLD_KMH_PER_SEC = 8

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function computePlaybackStats(movements: PlaybackMovement[]): PlaybackStats {
  if (movements.length === 0) {
    return { durationMinutes: 0, distanceKm: 0, avgSpeed: 0, maxSpeed: 0 }
  }
  let distanceKm = 0
  let maxSpeed = 0
  for (let i = 0; i < movements.length; i++) {
    maxSpeed = Math.max(maxSpeed, movements[i].speed)
    if (i > 0) distanceKm += haversineKm(movements[i - 1], movements[i])
  }
  const first = new Date(movements[0].timestamp).getTime()
  const last = new Date(movements[movements.length - 1].timestamp).getTime()
  const durationMinutes = Math.max(0, (last - first) / 60_000)
  const avgSpeed = durationMinutes > 0 ? distanceKm / (durationMinutes / 60) : 0
  return { durationMinutes, distanceKm, avgSpeed, maxSpeed }
}

const SPEED_BUCKETS: { max: number; label: PlaybackSpeedBucket; color: string }[] = [
  { max: 20, label: '0-20', color: '#22c55e' },
  { max: 40, label: '20-40', color: '#84cc16' },
  { max: 60, label: '40-60', color: '#eab308' },
  { max: 80, label: '60-80', color: '#f97316' },
  { max: Infinity, label: '80+', color: '#ef4444' },
]

function bucketFor(speed: number) {
  return SPEED_BUCKETS.find((b) => speed < b.max) ?? SPEED_BUCKETS[SPEED_BUCKETS.length - 1]
}

export function buildSpeedSegments(movements: PlaybackMovement[]): PlaybackSpeedSegment[] {
  const segments: PlaybackSpeedSegment[] = []
  for (let i = 1; i < movements.length; i++) {
    const prev = movements[i - 1]
    const curr = movements[i]
    const bucket = bucketFor(curr.speed)
    const last = segments[segments.length - 1]
    if (last && last.bucket === bucket.label) {
      last.positions.push([curr.lat, curr.lng])
    } else {
      segments.push({ positions: [[prev.lat, prev.lng], [curr.lat, curr.lng]], bucket: bucket.label, color: bucket.color })
    }
  }
  return segments
}

export interface DrivingBehaviourThresholds {
  minStopDurationMinutes: number
  maxSpeedThreshold: number
  minSpeedThreshold: number
}

export const DEFAULT_THRESHOLDS: DrivingBehaviourThresholds = {
  minStopDurationMinutes: 5,
  maxSpeedThreshold: 80,
  minSpeedThreshold: 0,
}

function pushStopIfLongEnough(
  movements: PlaybackMovement[],
  startIndex: number,
  endIndex: number,
  minStopDurationMinutes: number,
  stops: PlaybackStop[],
) {
  const startTimestamp = movements[startIndex].timestamp
  const endTimestamp = movements[endIndex].timestamp
  const durationMinutes = (new Date(endTimestamp).getTime() - new Date(startTimestamp).getTime()) / 60_000
  if (durationMinutes >= minStopDurationMinutes) {
    stops.push({
      startIndex,
      endIndex,
      startTimestamp,
      endTimestamp,
      durationMinutes,
      lat: movements[startIndex].lat,
      lng: movements[startIndex].lng,
    })
  }
}

export function detectStops(
  movements: PlaybackMovement[],
  thresholds: Pick<DrivingBehaviourThresholds, 'minStopDurationMinutes'> = DEFAULT_THRESHOLDS,
): PlaybackStop[] {
  const stops: PlaybackStop[] = []
  let runStart: number | null = null
  for (let i = 0; i < movements.length; i++) {
    const isIdle = movements[i].speed <= IDLE_SPEED_KMH
    if (isIdle && runStart === null) {
      runStart = i
    } else if (!isIdle && runStart !== null) {
      pushStopIfLongEnough(movements, runStart, i - 1, thresholds.minStopDurationMinutes, stops)
      runStart = null
    }
  }
  if (runStart !== null) {
    pushStopIfLongEnough(movements, runStart, movements.length - 1, thresholds.minStopDurationMinutes, stops)
  }
  return stops
}

function pushOverspeedEvent(movements: PlaybackMovement[], startIndex: number, endIndex: number, events: PlaybackEvent[]) {
  let peakSpeed = 0
  for (let i = startIndex; i <= endIndex; i++) peakSpeed = Math.max(peakSpeed, movements[i].speed)
  events.push({
    type: 'overspeed',
    startIndex,
    endIndex,
    timestamp: movements[startIndex].timestamp,
    lat: movements[startIndex].lat,
    lng: movements[startIndex].lng,
    peakSpeed,
  })
}

export function detectEvents(
  movements: PlaybackMovement[],
  thresholds: Pick<DrivingBehaviourThresholds, 'maxSpeedThreshold'> = DEFAULT_THRESHOLDS,
): PlaybackEvent[] {
  const events: PlaybackEvent[] = []

  let overspeedStart: number | null = null
  for (let i = 0; i < movements.length; i++) {
    const over = movements[i].speed > thresholds.maxSpeedThreshold
    if (over && overspeedStart === null) {
      overspeedStart = i
    } else if (!over && overspeedStart !== null) {
      pushOverspeedEvent(movements, overspeedStart, i - 1, events)
      overspeedStart = null
    }
  }
  if (overspeedStart !== null) {
    pushOverspeedEvent(movements, overspeedStart, movements.length - 1, events)
  }

  for (let i = 1; i < movements.length; i++) {
    const prev = movements[i - 1]
    const curr = movements[i]
    const dtSeconds = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000
    if (dtSeconds <= 0) continue
    const rate = (curr.speed - prev.speed) / dtSeconds
    if (rate <= -HARSH_ACCEL_THRESHOLD_KMH_PER_SEC) {
      events.push({ type: 'harsh_braking', startIndex: i - 1, endIndex: i, timestamp: curr.timestamp, lat: curr.lat, lng: curr.lng })
    } else if (rate >= HARSH_ACCEL_THRESHOLD_KMH_PER_SEC) {
      events.push({ type: 'harsh_acceleration', startIndex: i - 1, endIndex: i, timestamp: curr.timestamp, lat: curr.lat, lng: curr.lng })
    }
  }

  return events.sort((a, b) => a.startIndex - b.startIndex)
}

function normalizePolygonRing(coordinates: Geofence['attributes']['coordinates']): { lat: number; lng: number }[] {
  if (Array.isArray(coordinates) && coordinates.length > 0 && Array.isArray(coordinates[0])) {
    return (coordinates as number[][]).map(([lng, lat]) => ({ lat, lng }))
  }
  if (!Array.isArray(coordinates) && 'coordinates' in coordinates) {
    return coordinates.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
  }
  return []
}

function isPointInPolygon(point: { lat: number; lng: number }, ring: { lat: number; lng: number }[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng
    const yi = ring[i].lat
    const xj = ring[j].lng
    const yj = ring[j].lat
    const intersect = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function isInsideGeofence(point: { lat: number; lng: number }, geofence: Geofence): boolean {
  const { type, coordinates, radius } = geofence.attributes
  if (type === 'circle' && !Array.isArray(coordinates) && 'lat' in coordinates) {
    return haversineKm(point, coordinates) * 1000 <= (radius ?? 0)
  }
  if (type === 'polygon') {
    return isPointInPolygon(point, normalizePolygonRing(coordinates))
  }
  return false
}

export function filterMovementsByGeofence(movements: PlaybackMovement[], geofence: Geofence): PlaybackEvent[] {
  if (movements.length === 0) return []
  const events: PlaybackEvent[] = []
  let wasInside = isInsideGeofence(movements[0], geofence)
  for (let i = 1; i < movements.length; i++) {
    const isInside = isInsideGeofence(movements[i], geofence)
    if (isInside && !wasInside) {
      events.push({ type: 'geofence_enter', startIndex: i, endIndex: i, timestamp: movements[i].timestamp, lat: movements[i].lat, lng: movements[i].lng })
    } else if (!isInside && wasInside) {
      events.push({ type: 'geofence_exit', startIndex: i, endIndex: i, timestamp: movements[i].timestamp, lat: movements[i].lat, lng: movements[i].lng })
    }
    wasInside = isInside
  }
  return events
}
