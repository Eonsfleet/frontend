import type { PlaybackMovement } from '@/types'

export interface PlaybackRoutePoint {
  lat: number
  lng: number
}

export interface PlaybackGap {
  startIndex: number
  endIndex: number
  start: PlaybackRoutePoint
  end: PlaybackRoutePoint
  durationMs: number
}

const EARTH_RADIUS_METERS = 6_371_000

function pointDistanceMeters(point: PlaybackRoutePoint, start: PlaybackRoutePoint, end: PlaybackRoutePoint): number {
  const meanLatitudeRadians = ((start.lat + end.lat) / 2) * (Math.PI / 180)
  const scaleX = Math.cos(meanLatitudeRadians) * (Math.PI / 180) * EARTH_RADIUS_METERS
  const scaleY = (Math.PI / 180) * EARTH_RADIUS_METERS
  const startX = start.lng * scaleX
  const startY = start.lat * scaleY
  const endX = end.lng * scaleX
  const endY = end.lat * scaleY
  const pointX = point.lng * scaleX
  const pointY = point.lat * scaleY
  const deltaX = endX - startX
  const deltaY = endY - startY
  const lengthSquared = deltaX * deltaX + deltaY * deltaY

  if (lengthSquared === 0) return Math.hypot(pointX - startX, pointY - startY)

  const projection = Math.max(0, Math.min(1, ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared))
  return Math.hypot(pointX - (startX + projection * deltaX), pointY - (startY + projection * deltaY))
}

/** Douglas-Peucker simplification for map rendering only; raw pings remain untouched for animation. */
export function simplifyRoutePoints<T extends PlaybackRoutePoint>(points: T[], toleranceMeters = 8): T[] {
  if (points.length <= 2) return points

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: Array<[number, number]> = [[0, points.length - 1]]

  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop()!
    let furthestDistance = 0
    let furthestIndex = -1

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = pointDistanceMeters(points[index], points[startIndex], points[endIndex])
      if (distance > furthestDistance) {
        furthestDistance = distance
        furthestIndex = index
      }
    }

    if (furthestIndex >= 0 && furthestDistance > toleranceMeters) {
      keep[furthestIndex] = 1
      stack.push([startIndex, furthestIndex], [furthestIndex, endIndex])
    }
  }

  return points.filter((_, index) => keep[index] === 1)
}

export function detectPlaybackGaps(movements: PlaybackMovement[], thresholdMinutes = 5): PlaybackGap[] {
  const thresholdMs = thresholdMinutes * 60_000
  const gaps: PlaybackGap[] = []

  for (let index = 1; index < movements.length; index += 1) {
    const start = movements[index - 1]
    const end = movements[index]
    const durationMs = new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime()
    if (!Number.isFinite(durationMs) || durationMs <= thresholdMs) continue

    gaps.push({
      startIndex: index - 1,
      endIndex: index,
      start: { lat: start.lat, lng: start.lng },
      end: { lat: end.lat, lng: end.lng },
      durationMs,
    })
  }

  return gaps
}