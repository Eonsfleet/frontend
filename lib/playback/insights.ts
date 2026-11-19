import type { PlaybackEvent, PlaybackMovement, PlaybackStop } from '@/types'

const IDLE_SPEED_KMH = 2
/** A silence longer than this is "no data", not driving/idling/parked time. */
const NO_DATA_GAP_MS = 10 * 60_000

export function isOn(value: PlaybackMovement['ignition']): boolean | null {
  if (value === null || value === undefined || value === '') return null
  const s = String(value).toLowerCase()
  if (['1', 'true', 'on'].includes(s)) return true
  if (['0', 'false', 'off'].includes(s)) return false
  return null
}

export interface TimeBreakdown {
  movingMs: number
  /** Engine on, not moving. Only counted when ignition is reported. */
  idleMs: number
  /** Not moving and engine off (or ignition unknown). */
  stoppedMs: number
  noDataMs: number
  totalMs: number
}

export function computeTimeBreakdown(movements: PlaybackMovement[]): TimeBreakdown {
  const out: TimeBreakdown = { movingMs: 0, idleMs: 0, stoppedMs: 0, noDataMs: 0, totalMs: 0 }
  for (let i = 1; i < movements.length; i++) {
    const prev = movements[i - 1]
    const dt = new Date(movements[i].timestamp).getTime() - new Date(prev.timestamp).getTime()
    if (!Number.isFinite(dt) || dt <= 0) continue
    out.totalMs += dt
    if (dt > NO_DATA_GAP_MS) out.noDataMs += dt
    else if (prev.speed > IDLE_SPEED_KMH) out.movingMs += dt
    else if (isOn(prev.ignition) === true) out.idleMs += dt
    else out.stoppedMs += dt
  }
  return out
}

export interface FuelSummary {
  unit: 'L' | '%'
  start: number
  end: number
  consumed: number
  refuelled: number
  refuelCount: number
  /** Sudden drops while the vehicle was not moving — worth a manager's attention. */
  suspectedDrains: { index: number; timestamp: string; amount: number }[]
}

function fuelOf(m: PlaybackMovement, unit: 'L' | '%'): number | undefined {
  return unit === 'L' ? m.fuel_level_liters : (m.fuel_level_percent ?? m.fuel_level)
}

export function computeFuelSummary(movements: PlaybackMovement[]): FuelSummary | null {
  const unit: 'L' | '%' = movements.some((m) => m.fuel_level_liters != null) ? 'L' : '%'
  const series = movements
    .map((m, index) => ({ index, v: fuelOf(m, unit), m }))
    .filter((p): p is { index: number; v: number; m: PlaybackMovement } => p.v != null && p.v >= 0)
  if (series.length < 2) return null

  // A jump this big in one step is a refuel/drain, not consumption (units: L or %).
  const jump = unit === 'L' ? 8 : 8
  let consumed = 0
  let refuelled = 0
  let refuelCount = 0
  const suspectedDrains: FuelSummary['suspectedDrains'] = []
  for (let i = 1; i < series.length; i++) {
    const delta = series[i].v - series[i - 1].v
    if (delta >= jump) {
      refuelled += delta
      refuelCount++
    } else if (delta <= -jump) {
      if (series[i].m.speed <= IDLE_SPEED_KMH) {
        suspectedDrains.push({ index: series[i].index, timestamp: series[i].m.timestamp, amount: -delta })
      } else consumed += -delta
    } else if (delta < 0) consumed += -delta
  }
  return { unit, start: series[0].v, end: series[series.length - 1].v, consumed, refuelled, refuelCount, suspectedDrains }
}

export interface BehaviourSummary {
  overspeed: number
  harshBraking: number
  harshAcceleration: number
  overspeedMinutes: number
  geofenceEntries: number
  geofenceExits: number
  /** Harsh + overspeed events per 100 km, so long and short windows compare fairly. */
  incidentsPer100Km: number | null
}

export function summariseBehaviour(events: PlaybackEvent[], movements: PlaybackMovement[], distanceKm: number): BehaviourSummary {
  const count = (t: PlaybackEvent['type']) => events.filter((e) => e.type === t).length
  let overspeedMs = 0
  for (const e of events) {
    if (e.type !== 'overspeed') continue
    const a = movements[e.startIndex]
    const b = movements[Math.min(e.endIndex + 1, movements.length - 1)]
    if (a && b) overspeedMs += Math.max(0, new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
  const incidents = count('overspeed') + count('harsh_braking') + count('harsh_acceleration')
  return {
    overspeed: count('overspeed'),
    harshBraking: count('harsh_braking'),
    harshAcceleration: count('harsh_acceleration'),
    overspeedMinutes: overspeedMs / 60_000,
    geofenceEntries: count('geofence_enter'),
    geofenceExits: count('geofence_exit'),
    incidentsPer100Km: distanceKm >= 1 ? (incidents / distanceKm) * 100 : null,
  }
}

export function longestStop(stops: PlaybackStop[]): PlaybackStop | null {
  return stops.reduce<PlaybackStop | null>((best, s) => (!best || s.durationMinutes > best.durationMinutes ? s : best), null)
}

export function formatMs(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
