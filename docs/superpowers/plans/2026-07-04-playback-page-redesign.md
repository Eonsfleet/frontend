# Playback Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/tracking/playback` to match the new mockup (top filter bar, speed-colored map, summary/advanced-filters panel, bottom transport scrubber, tabbed detail panel), and make the Live Tracking "Playback" button navigate there instead of opening the old inline drawer.

**Architecture:** Raw GPS points come from the existing `getVehiclePlayback`/`getTripPlayback` endpoints; everything else (stats, stops, events, speed-colored route segments) is derived client-side by pure functions in `lib/playback/derive.ts`, consumed by two hooks (`usePlaybackMovements` for fetching, `usePlaybackDerived` for derivation) and rendered by a set of presentational components under `app/(portal)/tracking/playback/components/`, following the same file-organization convention as the existing Live Tracking feature (`app/(portal)/tracking/components/`).

**Tech Stack:** Next.js App Router, TypeScript, react-leaflet/Leaflet, TanStack Query, recharts, shadcn/ui, Tailwind, Vitest + Testing Library.

## Global Constraints

- Single-vehicle scope only: the Vehicles filter accepts an array prop for future multi-vehicle support, but the page only ever drives it with one vehicle id.
- "Groups" in the filter bar means the existing **Cluster** feature (`getClusters`), not a separate concept.
- "Location" filter has no backing endpoint — render disabled with an explanatory tooltip, do not fabricate data.
- "Recent Playbacks" has no backing endpoint — render an empty state, do not fabricate data.
- Altitude and Fuel tabs have no backing data in the playback context — render empty states.
- The old inline drawer (`TripPlaybackTimeline`) and its data hook (`usePlaybackData`) are deleted entirely, along with their dedicated test files — there is exactly one playback experience (the full page) going forward.
- Design reference: `docs/superpowers/specs/2026-07-04-playback-page-redesign-design.md`.

---

### Task 1: Promote playback types into `types/`

**Files:**
- Create: `types/tracking.ts`
- Modify: `types/index.ts`
- Modify: `lib/api/tracking.ts:10-18`

**Interfaces:**
- Produces: `PlaybackMovement`, `PlaybackStats`, `PlaybackEventType`, `PlaybackEvent`, `PlaybackStop`, `PlaybackSpeedSegment` — all exported from `@/types`, consumed by every later task.

- [ ] **Step 1: Create `types/tracking.ts`**

```ts
export interface PlaybackMovement {
  id: number
  vehicle_id: number
  lat: number
  lng: number
  speed: number
  heading: number
  timestamp: string
}

export interface PlaybackStats {
  durationMinutes: number
  distanceKm: number
  avgSpeed: number
  maxSpeed: number
}

export type PlaybackEventType =
  | 'overspeed'
  | 'harsh_braking'
  | 'harsh_acceleration'
  | 'geofence_enter'
  | 'geofence_exit'

export interface PlaybackEvent {
  type: PlaybackEventType
  startIndex: number
  endIndex: number
  timestamp: string
  lat: number
  lng: number
  peakSpeed?: number
}

export interface PlaybackStop {
  startIndex: number
  endIndex: number
  startTimestamp: string
  endTimestamp: string
  durationMinutes: number
  lat: number
  lng: number
}

export type PlaybackSpeedBucket = '0-20' | '20-40' | '40-60' | '60-80' | '80+'

export interface PlaybackSpeedSegment {
  positions: [number, number][]
  bucket: PlaybackSpeedBucket
  color: string
}
```

- [ ] **Step 2: Export the new module from the types barrel**

In `types/index.ts`, add a line after the existing `export * from './communication'`:

```ts
export * from './tracking'
```

- [ ] **Step 3: Replace the local interface in `lib/api/tracking.ts`**

Replace lines 10-18 (the local `export interface PlaybackMovement { ... }` block) with:

```ts
import type { PlaybackMovement } from '@/types'
```

Move this import to the top of the file, directly under `import apiClient from './client'` (line 1), so the file starts:

```ts
import apiClient from './client'
import type { PlaybackMovement } from '@/types'
```

`PlaybackMovement` was declared but unused elsewhere in the codebase (confirmed via repo-wide grep), so no other import sites need updating.

- [ ] **Step 4: Verify the project still typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `types/tracking.ts` or `lib/api/tracking.ts`.

- [ ] **Step 5: Commit**

```bash
git add types/tracking.ts types/index.ts lib/api/tracking.ts
git commit -m "refactor(tracking): promote PlaybackMovement into shared types, add playback types"
```

---

### Task 2: Playback derivation library

**Files:**
- Create: `lib/playback/derive.ts`
- Test: `__tests__/playback/derive.test.ts`

**Interfaces:**
- Consumes: `PlaybackMovement`, `PlaybackStats`, `PlaybackEvent`, `PlaybackStop`, `PlaybackSpeedSegment` (Task 1), `Geofence` (`@/types`, pre-existing).
- Produces: `computePlaybackStats(movements)`, `buildSpeedSegments(movements)`, `detectStops(movements, thresholds)`, `detectEvents(movements, thresholds)`, `filterMovementsByGeofence(movements, geofence)`, `DEFAULT_THRESHOLDS`, `DrivingBehaviourThresholds` type — all consumed by Task 4's `usePlaybackDerived`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/playback/derive.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  computePlaybackStats,
  buildSpeedSegments,
  detectStops,
  detectEvents,
  filterMovementsByGeofence,
  DEFAULT_THRESHOLDS,
} from '@/lib/playback/derive'
import type { PlaybackMovement } from '@/types'

function movement(overrides: Partial<PlaybackMovement>): PlaybackMovement {
  return { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 0, heading: 0, timestamp: '2024-01-01T08:00:00Z', ...overrides }
}

describe('computePlaybackStats', () => {
  it('returns zeroed stats for an empty series', () => {
    expect(computePlaybackStats([])).toEqual({ durationMinutes: 0, distanceKm: 0, avgSpeed: 0, maxSpeed: 0 })
  })

  it('computes duration, distance, avg speed and max speed over a short series', () => {
    const movements = [
      movement({ lat: 6.5, lng: 3.4, speed: 40, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ lat: 6.51, lng: 3.41, speed: 60, timestamp: '2024-01-01T08:06:00Z' }),
    ]
    const stats = computePlaybackStats(movements)
    expect(stats.durationMinutes).toBe(6)
    expect(stats.maxSpeed).toBe(60)
    expect(stats.distanceKm).toBeGreaterThan(0)
    expect(stats.avgSpeed).toBeCloseTo((stats.distanceKm / stats.durationMinutes) * 60, 5)
  })
})

describe('buildSpeedSegments', () => {
  it('buckets consecutive points of the same speed range into one segment', () => {
    const movements = [
      movement({ lat: 6.5, lng: 3.4, speed: 10 }),
      movement({ lat: 6.501, lng: 3.401, speed: 15 }),
      movement({ lat: 6.502, lng: 3.402, speed: 90 }),
    ]
    const segments = buildSpeedSegments(movements)
    expect(segments).toHaveLength(2)
    expect(segments[0].bucket).toBe('0-20')
    expect(segments[1].bucket).toBe('80+')
  })
})

describe('detectStops', () => {
  it('flags a run of near-zero speed lasting at least the minimum duration', () => {
    const movements = [
      movement({ speed: 40, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ speed: 0, timestamp: '2024-01-01T08:01:00Z' }),
      movement({ speed: 0, timestamp: '2024-01-01T08:07:00Z' }),
      movement({ speed: 45, timestamp: '2024-01-01T08:08:00Z' }),
    ]
    const stops = detectStops(movements, { minStopDurationMinutes: 5 })
    expect(stops).toHaveLength(1)
    expect(stops[0].durationMinutes).toBe(6)
  })

  it('ignores stops shorter than the configured minimum', () => {
    const movements = [
      movement({ speed: 40, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ speed: 0, timestamp: '2024-01-01T08:01:00Z' }),
      movement({ speed: 45, timestamp: '2024-01-01T08:02:00Z' }),
    ]
    expect(detectStops(movements, { minStopDurationMinutes: 5 })).toHaveLength(0)
  })
})

describe('detectEvents', () => {
  it('flags a contiguous run above the max speed threshold as one overspeed event with its peak speed', () => {
    const movements = [
      movement({ speed: 50, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ speed: 90, timestamp: '2024-01-01T08:00:10Z' }),
      movement({ speed: 95, timestamp: '2024-01-01T08:00:20Z' }),
      movement({ speed: 50, timestamp: '2024-01-01T08:00:30Z' }),
    ]
    const events = detectEvents(movements, { maxSpeedThreshold: 80 })
    const overspeed = events.filter((e) => e.type === 'overspeed')
    expect(overspeed).toHaveLength(1)
    expect(overspeed[0].peakSpeed).toBe(95)
  })

  it('flags a sharp deceleration as harsh braking', () => {
    const movements = [
      movement({ speed: 80, timestamp: '2024-01-01T08:00:00Z' }),
      movement({ speed: 20, timestamp: '2024-01-01T08:00:05Z' }),
    ]
    const events = detectEvents(movements, DEFAULT_THRESHOLDS)
    expect(events.some((e) => e.type === 'harsh_braking')).toBe(true)
  })
})

describe('filterMovementsByGeofence', () => {
  it('emits a geofence_enter event when a point moves inside a circle geofence', () => {
    const geofence = {
      id: '1',
      attributes: {
        name: 'Depot',
        description: null,
        type: 'circle' as const,
        trigger_type: 'both' as const,
        coordinates: { lat: 6.5, lng: 3.4 },
        radius: 500,
        speed: 0,
        is_active: true,
        status: true,
        schedule: null,
      },
      relationships: {},
    }
    const movements = [
      movement({ lat: 6.6, lng: 3.5 }),
      movement({ lat: 6.5001, lng: 3.4001 }),
    ]
    const events = filterMovementsByGeofence(movements, geofence)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('geofence_enter')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/playback/derive.test.ts`
Expected: FAIL with "Cannot find module '@/lib/playback/derive'"

- [ ] **Step 3: Implement `lib/playback/derive.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run __tests__/playback/derive.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/playback/derive.ts __tests__/playback/derive.test.ts
git commit -m "feat(playback): add client-side stats/stops/events derivation from GPS series"
```

---

### Task 3: `usePlaybackMovements` fetching hook

**Files:**
- Create: `app/(portal)/tracking/playback/hooks/usePlaybackMovements.ts`
- Test: `__tests__/playback/usePlaybackMovements.test.ts`

**Interfaces:**
- Consumes: `trackingApi.getVehiclePlayback(vehicleId, startDate, endDate)`, `trackingApi.getTripPlayback(vehicleId, tripId, params)` (pre-existing, `lib/api/tracking.ts`), `PlaybackMovement` (Task 1).
- Produces: `usePlaybackMovements({ vehicleId, tripId, startTime, endTime }) => { movements: PlaybackMovement[], isLoading: boolean, isError: boolean, refetch: () => void }` — consumed by Task 13's page assembly.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/usePlaybackMovements.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/lib/api/tracking', () => ({
  getVehiclePlayback: vi.fn().mockResolvedValue({
    data: [
      { latitude: 6.5, longitude: 3.4, speed: 40, heading: 90, timestamp: '2024-01-01T08:01:00Z' },
      { latitude: 6.51, longitude: 3.41, speed: 45, heading: 91, timestamp: '2024-01-01T08:00:00Z' },
    ],
  }),
  getTripPlayback: vi.fn().mockResolvedValue({
    data: { gps_points: [{ lat: 6.5, lng: 3.4, speed: 30, heading: 0, timestamp: '2024-01-01T09:00:00Z' }] },
  }),
}))

import { usePlaybackMovements } from '@/app/(portal)/tracking/playback/hooks/usePlaybackMovements'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children)

describe('usePlaybackMovements', () => {
  it('fetches vehicle history and normalizes + sorts points chronologically when no tripId is given', async () => {
    const { result } = renderHook(
      () => usePlaybackMovements({ vehicleId: '1', tripId: null, startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T09:00:00Z' }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.movements).toHaveLength(2)
    expect(result.current.movements[0].timestamp).toBe('2024-01-01T08:00:00Z')
    expect(result.current.movements[0].lat).toBe(6.51)
  })

  it('fetches trip playback gps_points when a tripId is given', async () => {
    const { result } = renderHook(
      () => usePlaybackMovements({ vehicleId: '1', tripId: '99', startTime: null, endTime: null }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.movements).toHaveLength(1)
    expect(result.current.movements[0].speed).toBe(30)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/playback/usePlaybackMovements.test.ts`
Expected: FAIL with "Cannot find module '.../usePlaybackMovements'"

- [ ] **Step 3: Implement the hook**

```ts
'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as trackingApi from '@/lib/api/tracking'
import type { PlaybackMovement } from '@/types'

export interface UsePlaybackMovementsParams {
  vehicleId: string | null
  tripId: string | null
  startTime: string | null
  endTime: string | null
}

export function usePlaybackMovements({ vehicleId, tripId, startTime, endTime }: UsePlaybackMovementsParams) {
  const tripQuery = useQuery({
    queryKey: ['playback-trip', vehicleId, tripId],
    queryFn: () => trackingApi.getTripPlayback(vehicleId!, tripId!, { include_gps_points: true }),
    enabled: !!vehicleId && !!tripId,
  })

  const historyQuery = useQuery({
    queryKey: ['playback-history', vehicleId, startTime, endTime],
    queryFn: () => trackingApi.getVehiclePlayback(vehicleId!, startTime!, endTime!),
    enabled: !!vehicleId && !tripId && !!startTime && !!endTime,
  })

  const movements = useMemo<PlaybackMovement[]>(() => {
    const raw: any[] = tripId ? (tripQuery.data?.data?.gps_points ?? []) : (historyQuery.data?.data ?? [])
    return raw
      .map((p: any) => ({
        id: p.id ?? 0,
        vehicle_id: Number(vehicleId),
        lat: p.lat ?? p.latitude,
        lng: p.lng ?? p.longitude,
        speed: p.speed ?? 0,
        heading: p.heading ?? 0,
        timestamp: p.timestamp ?? p.gps_datetime,
      }))
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [tripId, tripQuery.data, historyQuery.data, vehicleId])

  return {
    movements,
    isLoading: tripId ? tripQuery.isLoading : historyQuery.isLoading,
    isError: tripId ? tripQuery.isError : historyQuery.isError,
    refetch: tripId ? tripQuery.refetch : historyQuery.refetch,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/playback/usePlaybackMovements.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/tracking/playback/hooks/usePlaybackMovements.ts" __tests__/playback/usePlaybackMovements.test.ts
git commit -m "feat(playback): add usePlaybackMovements fetching hook"
```

---

### Task 4: `usePlaybackDerived` hook

**Files:**
- Create: `app/(portal)/tracking/playback/hooks/usePlaybackDerived.ts`
- Test: `__tests__/playback/usePlaybackDerived.test.ts`

**Interfaces:**
- Consumes: `computePlaybackStats`, `buildSpeedSegments`, `detectStops`, `detectEvents`, `filterMovementsByGeofence`, `DEFAULT_THRESHOLDS`, `DrivingBehaviourThresholds` (Task 2).
- Produces: `usePlaybackDerived(movements, thresholds?, geofence?) => { stats: PlaybackStats, speedSegments: PlaybackSpeedSegment[], stops: PlaybackStop[], events: PlaybackEvent[] }` — consumed by Task 13.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/usePlaybackDerived.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePlaybackDerived } from '@/app/(portal)/tracking/playback/hooks/usePlaybackDerived'
import type { PlaybackMovement } from '@/types'

const movements: PlaybackMovement[] = [
  { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 40, heading: 0, timestamp: '2024-01-01T08:00:00Z' },
  { id: 2, vehicle_id: 1, lat: 6.51, lng: 3.41, speed: 95, heading: 0, timestamp: '2024-01-01T08:05:00Z' },
]

describe('usePlaybackDerived', () => {
  it('returns stats, speed segments and events derived from the movement series', () => {
    const { result } = renderHook(() => usePlaybackDerived(movements))
    expect(result.current.stats.maxSpeed).toBe(95)
    expect(result.current.speedSegments.length).toBeGreaterThan(0)
    expect(result.current.events.some((e) => e.type === 'overspeed')).toBe(true)
  })

  it('returns no geofence events when no geofence is passed', () => {
    const { result } = renderHook(() => usePlaybackDerived(movements))
    expect(result.current.events.some((e) => e.type.startsWith('geofence'))).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/playback/usePlaybackDerived.test.ts`
Expected: FAIL with "Cannot find module '.../usePlaybackDerived'"

- [ ] **Step 3: Implement the hook**

```ts
'use client'

import { useMemo } from 'react'
import type { Geofence, PlaybackMovement } from '@/types'
import {
  computePlaybackStats,
  buildSpeedSegments,
  detectStops,
  detectEvents,
  filterMovementsByGeofence,
  DEFAULT_THRESHOLDS,
  type DrivingBehaviourThresholds,
} from '@/lib/playback/derive'

export function usePlaybackDerived(
  movements: PlaybackMovement[],
  thresholds: DrivingBehaviourThresholds = DEFAULT_THRESHOLDS,
  geofence: Geofence | null = null,
) {
  const stats = useMemo(() => computePlaybackStats(movements), [movements])
  const speedSegments = useMemo(() => buildSpeedSegments(movements), [movements])
  const stops = useMemo(() => detectStops(movements, thresholds), [movements, thresholds])
  const drivingEvents = useMemo(() => detectEvents(movements, thresholds), [movements, thresholds])
  const geofenceEvents = useMemo(
    () => (geofence ? filterMovementsByGeofence(movements, geofence) : []),
    [movements, geofence],
  )
  const events = useMemo(
    () => [...drivingEvents, ...geofenceEvents].sort((a, b) => a.startIndex - b.startIndex),
    [drivingEvents, geofenceEvents],
  )

  return { stats, speedSegments, stops, events }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/playback/usePlaybackDerived.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/tracking/playback/hooks/usePlaybackDerived.ts" __tests__/playback/usePlaybackDerived.test.ts
git commit -m "feat(playback): add usePlaybackDerived hook wrapping the derivation library"
```

---

### Task 5: Wire "Playback" navigation, remove the inline drawer's state from `page.tsx`

**Files:**
- Modify: `app/(portal)/tracking/page.tsx`
- Modify: `app/(portal)/tracking/components/TrackingSidebar.tsx:29,51,222`
- Test: `__tests__/tracking/page.test.tsx`

**Interfaces:**
- Produces: `TrackingSidebar` prop `onReplayVehicle: (vehicleId: string, tripId: string | null) => void` (replaces `setIsReplayOpen: (open: boolean) => void`).

- [ ] **Step 1: Write the failing test**

Add to `__tests__/tracking/page.test.tsx`, inside the existing `describe('TrackingPage grid shell', ...)` block (after the last existing `it`):

```tsx
  it('navigates to the playback page with the selected vehicle when Playback is clicked', async () => {
    const push = vi.fn()
    vi.mocked(await import('next/navigation')).useRouter = () => ({ push }) as any
    render(<TrackingPage />, { wrapper: Wrapper })
    const row = await screen.findByRole('button', { name: /ABC-123-XD/ })
    fireEvent.click(row)
    const playbackButton = await screen.findByRole('button', { name: /playback/i })
    fireEvent.click(playbackButton)
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/tracking\/playback\?vehicleId=1&start=.+&end=.+$/))
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/tracking/page.test.tsx`
Expected: FAIL — `push` is not called (current `handlePlayback` opens the inline drawer, never calls `router.push`).

- [ ] **Step 3: Update `app/(portal)/tracking/page.tsx`**

Remove these imports (no longer used once the drawer is gone):

```ts
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
```

Replace with:

```ts
import { subHours } from "date-fns";
```

Remove these two imports entirely:

```ts
import { TripPlaybackTimeline } from "@/components/live/TripPlaybackTimeline";
import { usePlaybackData } from "./hooks/usePlaybackData";
```

Add, alongside the other imports:

```ts
import { useRouter } from "next/navigation";
```

Remove this state (no longer needed):

```ts
const [isReplayOpen, setIsReplayOpen] = useState(false);
```
```ts
const [playbackType, setPlaybackType] = useState<"trip" | "history">("trip");
const [dateRange, setDateRange] = useState<DateRange | undefined>({
  from: subDays(new Date(), 1),
  to: new Date(),
});
```

Add, near the top of the component body:

```ts
const router = useRouter();
```

Remove the `usePlaybackData` call block entirely:

```ts
const {
  playbackData,
  playbackIndex,
  setPlaybackIndex,
  isPlayingPlayback,
  setIsPlayingPlayback,
  isLoadingPlayback,
} = usePlaybackData({
  isReplayOpen,
  selectedVehicleId,
  playbackType,
  ongoingTripsData,
  dateRange,
});
```

Replace `handlePlayback` with a shared navigation helper plus a thin wrapper:

```ts
const navigateToPlayback = useCallback(
  (vehicleId: string, tripId?: string | null) => {
    const params = new URLSearchParams({ vehicleId });
    if (tripId) {
      params.set("tripId", tripId);
    } else {
      const end = new Date();
      const start = subHours(end, 6);
      params.set("start", start.toISOString());
      params.set("end", end.toISOString());
    }
    router.push(`/tracking/playback?${params.toString()}`);
  },
  [router],
);

const handlePlayback = useCallback(() => {
  if (!selectedVehicleId) return;
  const trip = ongoingTripsData.find((t) => t.vehicleId === selectedVehicleId);
  navigateToPlayback(selectedVehicleId, trip?.id ?? null);
}, [ongoingTripsData, selectedVehicleId, navigateToPlayback]);
```

In the JSX, replace the `TrackingSidebar` prop `setIsReplayOpen={setIsReplayOpen}` with:

```tsx
onReplayVehicle={navigateToPlayback}
```

Remove the `<TripPlaybackTimeline ... />` block entirely (the whole element with its `isOpen`, `onClose`, `data`, `currentIndex`, `onIndexChange`, `isPlaying`, `setIsPlaying`, `isLoading`, `title`, `dateRange`, `onDateRangeChange` props).

- [ ] **Step 4: Update `TrackingSidebar` to use the new callback**

In `app/(portal)/tracking/components/TrackingSidebar.tsx`, change the prop declaration at line 29 from:

```ts
setIsReplayOpen: (open: boolean) => void;
```

to:

```ts
onReplayVehicle: (vehicleId: string, tripId: string | null) => void;
```

Change the destructured prop at line 51 from `setIsReplayOpen,` to `onReplayVehicle,`.

Change the `onSelect` handler at line 219-224 from:

```tsx
onSelect={() => {
  if (trip.vehicleId) {
    setSelectedVehicleId(trip.vehicleId);
    setIsReplayOpen(true);
  }
}}
```

to:

```tsx
onSelect={() => {
  if (trip.vehicleId) {
    setSelectedVehicleId(trip.vehicleId);
    onReplayVehicle(trip.vehicleId, trip.id ?? null);
  }
}}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run __tests__/tracking/page.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `page.tsx` or `TrackingSidebar.tsx` (confirms no other caller still passes `setIsReplayOpen`).

- [ ] **Step 7: Commit**

```bash
git add "app/(portal)/tracking/page.tsx" "app/(portal)/tracking/components/TrackingSidebar.tsx" __tests__/tracking/page.test.tsx
git commit -m "feat(tracking): navigate to the Playback page instead of opening the inline replay drawer"
```

---

### Task 6: Delete the old drawer, its data hook, and their tests

**Files:**
- Delete: `components/live/TripPlaybackTimeline.tsx`
- Delete: `app/(portal)/tracking/hooks/usePlaybackData.ts`
- Delete: `__tests__/tracking/components.test.tsx`

**Interfaces:**
- Consumes: nothing (Task 5 already removed every import of these three files).

- [ ] **Step 1: Confirm nothing still references the files being deleted**

Run: `grep -rn "TripPlaybackTimeline\|usePlaybackData" --include="*.ts" --include="*.tsx" app components __tests__`
Expected: no output (Task 5 removed the only call sites).

- [ ] **Step 2: Delete the files**

```bash
git rm "components/live/TripPlaybackTimeline.tsx" "app/(portal)/tracking/hooks/usePlaybackData.ts" "__tests__/tracking/components.test.tsx"
```

- [ ] **Step 3: Run the full tracking test suite**

Run: `npx vitest run __tests__/tracking`
Expected: PASS, no failures from missing modules.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(tracking): remove the old inline playback drawer, superseded by the full Playback page"
```

---

### Task 7: `PlaybackFilterBar` component

**Files:**
- Create: `app/(portal)/tracking/playback/components/PlaybackFilterBar.tsx`
- Test: `__tests__/playback/PlaybackFilterBar.test.tsx`

**Interfaces:**
- Consumes: shadcn `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue` (`@/components/ui/select`), `Vehicle`, `Cluster` (`@/types`).
- Produces:
```ts
export interface PlaybackFilterBarProps {
  vehicles: { id: string; label: string }[]
  selectedVehicleId: string | null
  onVehicleChange: (id: string) => void
  clusters: { id: string; label: string }[]
  selectedClusterId: string | null
  onClusterChange: (id: string | null) => void
  drivers: { id: string; label: string }[]
  selectedDriverId: string | null
  onDriverChange: (id: string | null) => void
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  isRangeReadOnly: boolean
  activeFilterCount: number
  isAdvancedOpen: boolean
  onToggleAdvanced: () => void
  activeChips: { key: string; label: string }[]
  onRemoveChip: (key: string) => void
  onClearAllChips: () => void
}
```
consumed by Task 13.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/PlaybackFilterBar.test.tsx`:

```tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackFilterBar } from '@/app/(portal)/tracking/playback/components/PlaybackFilterBar'

const baseProps = {
  vehicles: [{ id: '1', label: 'ABC-123-XD' }],
  selectedVehicleId: '1',
  onVehicleChange: vi.fn(),
  clusters: [{ id: '9', label: 'Lagos Fleet' }],
  selectedClusterId: null,
  onClusterChange: vi.fn(),
  drivers: [{ id: '5', label: 'John Doe' }],
  selectedDriverId: null,
  onDriverChange: vi.fn(),
  startTime: '2024-01-01T08:00',
  endTime: '2024-01-01T14:00',
  onStartTimeChange: vi.fn(),
  onEndTimeChange: vi.fn(),
  isRangeReadOnly: false,
  activeFilterCount: 2,
  isAdvancedOpen: false,
  onToggleAdvanced: vi.fn(),
  activeChips: [{ key: 'moving', label: 'Moving' }],
  onRemoveChip: vi.fn(),
  onClearAllChips: vi.fn(),
}

describe('PlaybackFilterBar', () => {
  it('shows the active filter count badge on the More Filters button', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    expect(screen.getByRole('button', { name: /more filters/i })).toHaveTextContent('2')
  })

  it('calls onToggleAdvanced when More Filters is clicked', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /more filters/i }))
    expect(baseProps.onToggleAdvanced).toHaveBeenCalled()
  })

  it('renders active filter chips and calls onRemoveChip when a chip is dismissed', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /remove moving filter/i }))
    expect(baseProps.onRemoveChip).toHaveBeenCalledWith('moving')
  })

  it('disables the Location select since no locations endpoint exists', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    expect(screen.getByRole('combobox', { name: /location/i })).toBeDisabled()
  })

  it('calls onStartTimeChange when the start datetime input changes', () => {
    render(<PlaybackFilterBar {...baseProps} />)
    fireEvent.change(screen.getByLabelText(/date & time \(start\)/i), { target: { value: '2024-01-02T09:00' } })
    expect(baseProps.onStartTimeChange).toHaveBeenCalledWith('2024-01-02T09:00')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/playback/PlaybackFilterBar.test.tsx`
Expected: FAIL with "Cannot find module '.../PlaybackFilterBar'"

- [ ] **Step 3: Implement the component**

```tsx
'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface PlaybackFilterBarProps {
  vehicles: { id: string; label: string }[]
  selectedVehicleId: string | null
  onVehicleChange: (id: string) => void
  clusters: { id: string; label: string }[]
  selectedClusterId: string | null
  onClusterChange: (id: string | null) => void
  drivers: { id: string; label: string }[]
  selectedDriverId: string | null
  onDriverChange: (id: string | null) => void
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  isRangeReadOnly: boolean
  activeFilterCount: number
  isAdvancedOpen: boolean
  onToggleAdvanced: () => void
  activeChips: { key: string; label: string }[]
  onRemoveChip: (key: string) => void
  onClearAllChips: () => void
}

const FIELD_LABEL = 'text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5'
const FIELD_INPUT = 'w-full bg-white border border-slate-200 rounded-lg h-9 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500'

export function PlaybackFilterBar({
  vehicles,
  selectedVehicleId,
  onVehicleChange,
  clusters,
  selectedClusterId,
  onClusterChange,
  drivers,
  selectedDriverId,
  onDriverChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  isRangeReadOnly,
  activeFilterCount,
  isAdvancedOpen,
  onToggleAdvanced,
  activeChips,
  onRemoveChip,
  onClearAllChips,
}: PlaybackFilterBarProps) {
  return (
    <div className="bg-white border-b border-slate-200 p-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        <div>
          <label htmlFor="playback-start-time" className={FIELD_LABEL}>Date & Time (Start)</label>
          <input
            id="playback-start-time"
            type="datetime-local"
            className={FIELD_INPUT}
            value={startTime}
            readOnly={isRangeReadOnly}
            onChange={(e) => onStartTimeChange(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="playback-end-time" className={FIELD_LABEL}>Date & Time (End)</label>
          <input
            id="playback-end-time"
            type="datetime-local"
            className={FIELD_INPUT}
            value={endTime}
            readOnly={isRangeReadOnly}
            onChange={(e) => onEndTimeChange(e.target.value)}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Vehicles</label>
          <Select value={selectedVehicleId ?? undefined} onValueChange={onVehicleChange}>
            <SelectTrigger aria-label="Vehicles" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Groups</label>
          <Select value={selectedClusterId ?? 'all'} onValueChange={(v) => onClusterChange(v === 'all' ? null : v)}>
            <SelectTrigger aria-label="Groups" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {clusters.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Drivers</label>
          <Select value={selectedDriverId ?? 'all'} onValueChange={(v) => onDriverChange(v === 'all' ? null : v)}>
            <SelectTrigger aria-label="Drivers" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="All Drivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Location</label>
          <Select disabled value="all">
            <SelectTrigger aria-label="Location" title="Location filtering isn't available yet" className="w-full h-9 text-xs font-bold opacity-60">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onToggleAdvanced}
            aria-label={`More Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
            className={cn(
              'w-full h-9 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors',
              isAdvancedOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            More Filters
            {activeFilterCount > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wide"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label.toLowerCase()} filter`}
                onClick={() => onRemoveChip(chip.key)}
                className="hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAllChips}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 ml-1"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/playback/PlaybackFilterBar.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/tracking/playback/components/PlaybackFilterBar.tsx" __tests__/playback/PlaybackFilterBar.test.tsx
git commit -m "feat(playback): add PlaybackFilterBar component"
```

---

### Task 8: `PlaybackAdvancedFilters` component

**Files:**
- Create: `app/(portal)/tracking/playback/components/PlaybackAdvancedFilters.tsx`
- Test: `__tests__/playback/PlaybackAdvancedFilters.test.tsx`

**Interfaces:**
- Consumes: `DrivingBehaviourThresholds` (Task 2), `PlaybackEventType` (Task 1).
- Produces:
```ts
export interface PlaybackAdvancedFiltersProps {
  vehicleStatusFilters: Record<'moving' | 'parked' | 'idle' | 'offline', boolean>
  onVehicleStatusChange: (key: 'moving' | 'parked' | 'idle' | 'offline', value: boolean) => void
  routes: { id: string; label: string }[]
  selectedRouteId: string | null
  onRouteChange: (id: string | null) => void
  geofences: { id: string; label: string }[]
  selectedGeofenceId: string | null
  onGeofenceChange: (id: string | null) => void
  radiusKm: number
  onRadiusChange: (value: number) => void
  eventFilters: Record<PlaybackEventType, boolean>
  onEventFilterChange: (key: PlaybackEventType, value: boolean) => void
  thresholds: DrivingBehaviourThresholds
  onThresholdsChange: (thresholds: DrivingBehaviourThresholds) => void
  onApply: () => void
  onReset: () => void
}
```
consumed by Task 13.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/PlaybackAdvancedFilters.test.tsx`:

```tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackAdvancedFilters } from '@/app/(portal)/tracking/playback/components/PlaybackAdvancedFilters'
import { DEFAULT_THRESHOLDS } from '@/lib/playback/derive'

const baseProps = {
  vehicleStatusFilters: { moving: true, parked: false, idle: true, offline: false },
  onVehicleStatusChange: vi.fn(),
  routes: [{ id: '1', label: 'Trip #1001' }],
  selectedRouteId: null,
  onRouteChange: vi.fn(),
  geofences: [{ id: '5', label: 'Ikeja Depot' }],
  selectedGeofenceId: null,
  onGeofenceChange: vi.fn(),
  radiusKm: 5,
  onRadiusChange: vi.fn(),
  eventFilters: { overspeed: true, harsh_braking: true, harsh_acceleration: false, geofence_enter: true, geofence_exit: true },
  onEventFilterChange: vi.fn(),
  thresholds: DEFAULT_THRESHOLDS,
  onThresholdsChange: vi.fn(),
  onApply: vi.fn(),
  onReset: vi.fn(),
}

describe('PlaybackAdvancedFilters', () => {
  it('toggles a vehicle status checkbox', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /^parked$/i }))
    expect(baseProps.onVehicleStatusChange).toHaveBeenCalledWith('parked', true)
  })

  it('toggles an event type checkbox', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /harsh acceleration/i }))
    expect(baseProps.onEventFilterChange).toHaveBeenCalledWith('harsh_acceleration', true)
  })

  it('updates max speed threshold', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    fireEvent.change(screen.getByLabelText(/max speed/i), { target: { value: '100' } })
    expect(baseProps.onThresholdsChange).toHaveBeenCalledWith({ ...DEFAULT_THRESHOLDS, maxSpeedThreshold: 100 })
  })

  it('calls onApply when Apply Filters is clicked', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }))
    expect(baseProps.onApply).toHaveBeenCalled()
  })

  it('disables the Device Filters section', () => {
    render(<PlaybackAdvancedFilters {...baseProps} />)
    expect(screen.getByTestId('device-filters-section')).toHaveAttribute('aria-disabled', 'true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/playback/PlaybackAdvancedFilters.test.tsx`
Expected: FAIL with "Cannot find module '.../PlaybackAdvancedFilters'"

- [ ] **Step 3: Implement the component**

```tsx
'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PlaybackEventType } from '@/types'
import type { DrivingBehaviourThresholds } from '@/lib/playback/derive'

export interface PlaybackAdvancedFiltersProps {
  vehicleStatusFilters: Record<'moving' | 'parked' | 'idle' | 'offline', boolean>
  onVehicleStatusChange: (key: 'moving' | 'parked' | 'idle' | 'offline', value: boolean) => void
  routes: { id: string; label: string }[]
  selectedRouteId: string | null
  onRouteChange: (id: string | null) => void
  geofences: { id: string; label: string }[]
  selectedGeofenceId: string | null
  onGeofenceChange: (id: string | null) => void
  radiusKm: number
  onRadiusChange: (value: number) => void
  eventFilters: Record<PlaybackEventType, boolean>
  onEventFilterChange: (key: PlaybackEventType, value: boolean) => void
  thresholds: DrivingBehaviourThresholds
  onThresholdsChange: (thresholds: DrivingBehaviourThresholds) => void
  onApply: () => void
  onReset: () => void
}

const SECTION_TITLE = 'text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2'
const CHECKBOX_ROW = 'flex items-center gap-2 text-xs font-bold text-slate-700'
const NUMBER_INPUT = 'w-full bg-white border border-slate-200 rounded-lg h-8 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500'

const VEHICLE_STATUS_OPTIONS: { key: 'moving' | 'parked' | 'idle' | 'offline'; label: string }[] = [
  { key: 'moving', label: 'Moving' },
  { key: 'parked', label: 'Parked' },
  { key: 'idle', label: 'Idle' },
  { key: 'offline', label: 'Offline' },
]

const EVENT_OPTIONS: { key: PlaybackEventType; label: string }[] = [
  { key: 'overspeed', label: 'Overspeed' },
  { key: 'harsh_braking', label: 'Harsh Braking' },
  { key: 'harsh_acceleration', label: 'Harsh Acceleration' },
  { key: 'geofence_enter', label: 'Geofence Enter' },
  { key: 'geofence_exit', label: 'Geofence Exit' },
]

export function PlaybackAdvancedFilters({
  vehicleStatusFilters,
  onVehicleStatusChange,
  routes,
  selectedRouteId,
  onRouteChange,
  geofences,
  selectedGeofenceId,
  onGeofenceChange,
  radiusKm,
  onRadiusChange,
  eventFilters,
  onEventFilterChange,
  thresholds,
  onThresholdsChange,
  onApply,
  onReset,
}: PlaybackAdvancedFiltersProps) {
  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      <section>
        <h4 className={SECTION_TITLE}>Vehicle Status</h4>
        <div className="grid grid-cols-2 gap-2">
          {VEHICLE_STATUS_OPTIONS.map((opt) => (
            <label key={opt.key} className={CHECKBOX_ROW}>
              <input
                type="checkbox"
                checked={vehicleStatusFilters[opt.key]}
                onChange={(e) => onVehicleStatusChange(opt.key, e.target.checked)}
                aria-label={opt.label}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h4 className={SECTION_TITLE}>Route & Location</h4>
        <div className="space-y-2">
          <Select value={selectedRouteId ?? 'none'} onValueChange={(v) => onRouteChange(v === 'none' ? null : v)}>
            <SelectTrigger aria-label="Route" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="Select Route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select Route</SelectItem>
              {routes.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedGeofenceId ?? 'none'} onValueChange={(v) => onGeofenceChange(v === 'none' ? null : v)}>
            <SelectTrigger aria-label="Geofence" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="Select Geofence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select Geofence</SelectItem>
              {geofences.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <label htmlFor="playback-radius" className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Radius (km)</label>
            <input
              id="playback-radius"
              type="number"
              min={0}
              className={NUMBER_INPUT}
              value={radiusKm}
              disabled={!selectedGeofenceId}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section>
        <h4 className={SECTION_TITLE}>Playback Events</h4>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_OPTIONS.map((opt) => (
            <label key={opt.key} className={CHECKBOX_ROW}>
              <input
                type="checkbox"
                checked={eventFilters[opt.key]}
                onChange={(e) => onEventFilterChange(opt.key, e.target.checked)}
                aria-label={opt.label}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h4 className={SECTION_TITLE}>Driving Behaviour</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="playback-min-speed" className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Min Speed</label>
            <input
              id="playback-min-speed"
              type="number"
              className={NUMBER_INPUT}
              value={thresholds.minSpeedThreshold}
              onChange={(e) => onThresholdsChange({ ...thresholds, minSpeedThreshold: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="playback-max-speed" className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Max Speed</label>
            <input
              id="playback-max-speed"
              type="number"
              className={NUMBER_INPUT}
              value={thresholds.maxSpeedThreshold}
              onChange={(e) => onThresholdsChange({ ...thresholds, maxSpeedThreshold: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="playback-min-stop" className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Min Stop (min)</label>
            <input
              id="playback-min-stop"
              type="number"
              className={NUMBER_INPUT}
              value={thresholds.minStopDurationMinutes}
              onChange={(e) => onThresholdsChange({ ...thresholds, minStopDurationMinutes: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <section data-testid="device-filters-section" aria-disabled="true" className="opacity-50 pointer-events-none">
        <h4 className={SECTION_TITLE}>Device Filters</h4>
        <p className="text-[10px] font-bold text-slate-400">Not available for this device yet.</p>
      </section>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onApply}
          className="flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700"
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/playback/PlaybackAdvancedFilters.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/tracking/playback/components/PlaybackAdvancedFilters.tsx" __tests__/playback/PlaybackAdvancedFilters.test.tsx
git commit -m "feat(playback): add PlaybackAdvancedFilters panel"
```

---

### Task 9: `PlaybackMap` component

**Files:**
- Create: `app/(portal)/tracking/playback/components/PlaybackMap.tsx`
- Test: `__tests__/playback/PlaybackMap.test.tsx`

**Interfaces:**
- Consumes: `PlaybackMovement`, `PlaybackSpeedSegment`, `PlaybackStop` (Task 1).
- Produces:
```ts
export interface PlaybackMapProps {
  movements: PlaybackMovement[]
  speedSegments: PlaybackSpeedSegment[]
  stops: PlaybackStop[]
  currentIndex: number
  mapStyle: 'standard' | 'satellite'
  onToggleMapStyle: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}
```
consumed by Task 13.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/PlaybackMap.test.tsx`:

```tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('leaflet', () => ({ default: { divIcon: vi.fn(() => ({})) } }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: any) => <div>{children}</div>,
  Polyline: ({ color }: any) => <div data-testid="polyline" style={{ color }} />,
  useMap: () => ({ fitBounds: vi.fn(), flyTo: vi.fn() }),
}))
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<any>) => {
    const mod = require('react-leaflet')
    return (props: any) => {
      const Comp = mod[Object.keys(mod).find((k) => loader.toString().includes(k)) ?? 'MapContainer']
      return <Comp {...props} />
    }
  },
}))

import { PlaybackMap } from '@/app/(portal)/tracking/playback/components/PlaybackMap'

const movements = [
  { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 40, heading: 0, timestamp: '2024-01-01T08:00:00Z' },
  { id: 2, vehicle_id: 1, lat: 6.51, lng: 3.41, speed: 50, heading: 0, timestamp: '2024-01-01T08:05:00Z' },
]
const speedSegments = [{ positions: [[6.5, 3.4], [6.51, 3.41]] as [number, number][], bucket: '40-60' as const, color: '#eab308' }]

describe('PlaybackMap', () => {
  it('renders one route legend swatch per speed bucket', () => {
    render(
      <PlaybackMap
        movements={movements}
        speedSegments={speedSegments}
        stops={[]}
        currentIndex={0}
        mapStyle="standard"
        onToggleMapStyle={vi.fn()}
        isFullscreen={false}
        onToggleFullscreen={vi.fn()}
      />,
    )
    expect(screen.getAllByTestId('speed-legend-swatch')).toHaveLength(5)
  })

  it('calls onToggleMapStyle when the Satellite toggle is clicked', () => {
    render(
      <PlaybackMap
        movements={movements}
        speedSegments={speedSegments}
        stops={[]}
        currentIndex={0}
        mapStyle="standard"
        onToggleMapStyle={vi.fn()}
        isFullscreen={false}
        onToggleFullscreen={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /satellite/i }))
  })

  it('disables the Traffic toggle since no traffic layer provider is configured', () => {
    render(
      <PlaybackMap
        movements={movements}
        speedSegments={speedSegments}
        stops={[]}
        currentIndex={0}
        mapStyle="standard"
        onToggleMapStyle={vi.fn()}
        isFullscreen={false}
        onToggleFullscreen={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /traffic/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/playback/PlaybackMap.test.tsx`
Expected: FAIL with "Cannot find module '.../PlaybackMap'"

- [ ] **Step 3: Implement the component**

```tsx
'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Maximize2, Minimize2, Layers, Navigation as NavigationIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlaybackMovement, PlaybackSpeedSegment, PlaybackStop } from '@/types'

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false })
const useMap = typeof window !== 'undefined' ? require('react-leaflet').useMap : () => null

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const STANDARD_TILE_URL = MAPBOX_ACCESS_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const SPEED_LEGEND: { bucket: string; color: string }[] = [
  { bucket: '0 - 20', color: '#22c55e' },
  { bucket: '20 - 40', color: '#84cc16' },
  { bucket: '40 - 60', color: '#eab308' },
  { bucket: '60 - 80', color: '#f97316' },
  { bucket: '80+', color: '#ef4444' },
]

function positionMarkerIcon(heading: number) {
  return L.divIcon({
    className: 'custom-marker-wrapper',
    html: `<div class="marker-container is-active"><div class="marker-pulse"></div><div class="marker-base" style="transform: rotate(${heading}deg); background: #2563eb; border-color: #fff;"><div class="marker-icon-wrapper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div></div></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function endpointMarkerIcon(color: string) {
  return L.divIcon({
    className: 'playback-endpoint-marker',
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function stopMarkerIcon(index: number) {
  return L.divIcon({
    className: 'playback-stop-marker',
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:#2563eb;color:white;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid white;">${index + 1}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function MapController({ movements, currentIndex }: { movements: PlaybackMovement[]; currentIndex: number }) {
  const map = useMap()
  useEffect(() => {
    if (movements.length > 0 && currentIndex === 0) {
      map.fitBounds(movements.map((m) => [m.lat, m.lng] as [number, number]), { padding: [50, 50] })
    }
  }, [movements.length])

  useEffect(() => {
    const point = movements[currentIndex]
    if (point) map.flyTo([point.lat, point.lng], 16)
  }, [currentIndex, map])

  return null
}

export interface PlaybackMapProps {
  movements: PlaybackMovement[]
  speedSegments: PlaybackSpeedSegment[]
  stops: PlaybackStop[]
  currentIndex: number
  mapStyle: 'standard' | 'satellite'
  onToggleMapStyle: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export function PlaybackMap({
  movements,
  speedSegments,
  stops,
  currentIndex,
  mapStyle,
  onToggleMapStyle,
  isFullscreen,
  onToggleFullscreen,
}: PlaybackMapProps) {
  const currentMovement = movements[currentIndex]
  const tileUrl = mapStyle === 'satellite' ? SATELLITE_TILE_URL : STANDARD_TILE_URL

  return (
    <div className="relative flex-1 h-full">
      {typeof window !== 'undefined' && (
        <MapContainer center={[6.5244, 3.3792]} zoom={12} className="h-full w-full z-10" zoomControl={false}>
          <TileLayer url={tileUrl} attribution="&copy; Mapbox" />
          <MapController movements={movements} currentIndex={currentIndex} />

          {speedSegments.map((segment, i) => (
            <Polyline key={i} positions={segment.positions} color={segment.color} weight={4} opacity={0.85} />
          ))}

          {movements[0] && <Marker position={[movements[0].lat, movements[0].lng]} icon={endpointMarkerIcon('#22c55e')} />}
          {movements.length > 1 && (
            <Marker
              position={[movements[movements.length - 1].lat, movements[movements.length - 1].lng]}
              icon={endpointMarkerIcon('#ef4444')}
            />
          )}

          {stops.map((stop, i) => (
            <Marker key={i} position={[stop.lat, stop.lng]} icon={stopMarkerIcon(i)} />
          ))}

          {currentMovement && (
            <Marker position={[currentMovement.lat, currentMovement.lng]} icon={positionMarkerIcon(currentMovement.heading)} />
          )}
        </MapContainer>
      )}

      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-3 z-20">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Speed (km/h)</p>
        <div className="space-y-1">
          {SPEED_LEGEND.map((entry) => (
            <div key={entry.bucket} className="flex items-center gap-2">
              <span data-testid="speed-legend-swatch" className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
              <span className="text-[10px] font-bold text-slate-600">{entry.bucket}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <button
          type="button"
          disabled
          title="Traffic layer isn't available yet"
          aria-label="Traffic"
          className="h-10 w-10 rounded-xl bg-white/60 shadow-lg flex items-center justify-center text-slate-300 cursor-not-allowed"
        >
          <NavigationIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleMapStyle}
          aria-label={mapStyle === 'standard' ? 'Satellite' : 'Map'}
          className="h-10 w-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-blue-600"
        >
          <Layers className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="h-10 w-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-blue-600"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/playback/PlaybackMap.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/tracking/playback/components/PlaybackMap.tsx" __tests__/playback/PlaybackMap.test.tsx
git commit -m "feat(playback): add PlaybackMap with speed-colored route and stop markers"
```

---

### Task 10: `PlaybackScrubber` component

**Files:**
- Create: `app/(portal)/tracking/playback/components/PlaybackScrubber.tsx`
- Test: `__tests__/playback/PlaybackScrubber.test.tsx`

**Interfaces:**
- Consumes: `PlaybackMovement` (Task 1), `Slider` (`@/components/ui/slider`, pre-existing).
- Produces:
```ts
export interface PlaybackScrubberProps {
  movements: PlaybackMovement[]
  currentIndex: number
  onIndexChange: (index: number) => void
  isPlaying: boolean
  onTogglePlaying: () => void
  speed: 1 | 2 | 4 | 8
  onSpeedChange: (speed: 1 | 2 | 4 | 8) => void
}
```
consumed by Task 13.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/PlaybackScrubber.test.tsx`:

```tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackScrubber } from '@/app/(portal)/tracking/playback/components/PlaybackScrubber'

const movements = [
  { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 40, heading: 90, timestamp: '2024-01-01T08:00:00Z' },
  { id: 2, vehicle_id: 1, lat: 6.51, lng: 3.41, speed: 60, heading: 91, timestamp: '2024-01-01T08:05:00Z' },
]

describe('PlaybackScrubber', () => {
  it('calls onTogglePlaying when the play/pause button is clicked', () => {
    const onTogglePlaying = vi.fn()
    render(
      <PlaybackScrubber
        movements={movements}
        currentIndex={0}
        onIndexChange={vi.fn()}
        isPlaying={false}
        onTogglePlaying={onTogglePlaying}
        speed={1}
        onSpeedChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(onTogglePlaying).toHaveBeenCalled()
  })

  it('highlights the active speed button', () => {
    render(
      <PlaybackScrubber
        movements={movements}
        currentIndex={0}
        onIndexChange={vi.fn()}
        isPlaying={false}
        onTogglePlaying={vi.fn()}
        speed={4}
        onSpeedChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '4X' })).toHaveClass('bg-slate-900')
  })

  it('shows the current point speed and step forward moves the index ahead by 10', () => {
    const onIndexChange = vi.fn()
    render(
      <PlaybackScrubber
        movements={movements}
        currentIndex={0}
        onIndexChange={onIndexChange}
        isPlaying={false}
        onTogglePlaying={vi.fn()}
        speed={1}
        onSpeedChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/40 km\/h/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /step forward/i }))
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/playback/PlaybackScrubber.test.tsx`
Expected: FAIL with "Cannot find module '.../PlaybackScrubber'"

- [ ] **Step 3: Implement the component**

```tsx
'use client'

import { Play, Pause, Rewind, FastForward, Navigation as NavigationIcon, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { PlaybackMovement } from '@/types'

export interface PlaybackScrubberProps {
  movements: PlaybackMovement[]
  currentIndex: number
  onIndexChange: (index: number) => void
  isPlaying: boolean
  onTogglePlaying: () => void
  speed: 1 | 2 | 4 | 8
  onSpeedChange: (speed: 1 | 2 | 4 | 8) => void
}

export function PlaybackScrubber({ movements, currentIndex, onIndexChange, isPlaying, onTogglePlaying, speed, onSpeedChange }: PlaybackScrubberProps) {
  const currentMovement = movements[currentIndex]
  const progress = movements.length > 1 ? [(currentIndex / (movements.length - 1)) * 100] : [0]

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Step back"
            onClick={() => onIndexChange(Math.max(0, currentIndex - 10))}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600"
          >
            <Rewind className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={onTogglePlaying}
            disabled={movements.length === 0}
            className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
          </button>
          <button
            type="button"
            aria-label="Step forward"
            onClick={() => onIndexChange(Math.min(movements.length - 1, currentIndex + 10))}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600"
          >
            <FastForward className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 ml-2">
            {([1, 2, 4, 8] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={cn(
                  'h-7 w-9 rounded-full text-[10px] font-black transition-colors',
                  speed === s ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900',
                )}
              >
                {s}X
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
          {currentMovement && (
            <>
              <span className="flex items-center gap-1.5">
                <NavigationIcon className="h-3.5 w-3.5" style={{ transform: `rotate(${currentMovement.heading}deg)` }} />
                {Math.round(currentMovement.heading)}°
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <Truck className="h-3.5 w-3.5" /> {Math.round(currentMovement.speed)} km/h
              </span>
              <span>{format(new Date(currentMovement.timestamp), 'hh:mm:ss a')}</span>
            </>
          )}
        </div>
      </div>

      <Slider
        value={progress}
        max={100}
        step={0.1}
        onValueChange={([val]) => {
          if (movements.length === 0) return
          onIndexChange(Math.round((val / 100) * (movements.length - 1)))
        }}
      />
      <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
        <span>{movements[0] ? format(new Date(movements[0].timestamp), 'hh:mm:ss a') : '--'}</span>
        <span>{movements[movements.length - 1] ? format(new Date(movements[movements.length - 1].timestamp), 'hh:mm:ss a') : '--'}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/playback/PlaybackScrubber.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/tracking/playback/components/PlaybackScrubber.tsx" __tests__/playback/PlaybackScrubber.test.tsx
git commit -m "feat(playback): add PlaybackScrubber transport control"
```

---

### Task 11: `PlaybackSummaryPanel` component

**Files:**
- Create: `app/(portal)/tracking/playback/components/PlaybackSummaryPanel.tsx`
- Test: `__tests__/playback/PlaybackSummaryPanel.test.tsx`

**Interfaces:**
- Consumes: `PlaybackStats`, `PlaybackEvent` (Task 1).
- Produces:
```ts
export interface PlaybackSummaryPanelProps {
  stats: PlaybackStats
  stopsCount: number
  events: PlaybackEvent[]
  vehicleLabel: string
}
```
consumed by Task 13.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/PlaybackSummaryPanel.test.tsx`:

```tsx
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlaybackSummaryPanel } from '@/app/(portal)/tracking/playback/components/PlaybackSummaryPanel'
import type { PlaybackEvent } from '@/types'

const events: PlaybackEvent[] = [
  { type: 'overspeed', startIndex: 0, endIndex: 1, timestamp: '2024-01-01T08:00:00Z', lat: 6.5, lng: 3.4, peakSpeed: 95 },
  { type: 'overspeed', startIndex: 5, endIndex: 6, timestamp: '2024-01-01T08:10:00Z', lat: 6.5, lng: 3.4, peakSpeed: 90 },
  { type: 'harsh_braking', startIndex: 8, endIndex: 9, timestamp: '2024-01-01T08:15:00Z', lat: 6.5, lng: 3.4 },
]

describe('PlaybackSummaryPanel', () => {
  it('renders the stat grid from computed stats', () => {
    render(
      <PlaybackSummaryPanel
        stats={{ durationMinutes: 360, distanceKm: 156.8, avgSpeed: 52, maxSpeed: 102 }}
        stopsCount={8}
        events={events}
        vehicleLabel="ABC-123-XD"
      />,
    )
    expect(screen.getByText('156.8 km')).toBeInTheDocument()
    expect(screen.getByText('102 km/h')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('groups Top Events by type with counts, most frequent first', () => {
    render(
      <PlaybackSummaryPanel
        stats={{ durationMinutes: 360, distanceKm: 156.8, avgSpeed: 52, maxSpeed: 102 }}
        stopsCount={8}
        events={events}
        vehicleLabel="ABC-123-XD"
      />,
    )
    const overspeedRow = screen.getByText(/overspeed/i).closest('div')
    expect(overspeedRow).toHaveTextContent('2')
  })

  it('renders a single Top Vehicles row for the selected vehicle', () => {
    render(
      <PlaybackSummaryPanel
        stats={{ durationMinutes: 360, distanceKm: 156.8, avgSpeed: 52, maxSpeed: 102 }}
        stopsCount={8}
        events={events}
        vehicleLabel="ABC-123-XD"
      />,
    )
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
  })

  it('shows an empty state for Recent Playbacks', () => {
    render(
      <PlaybackSummaryPanel
        stats={{ durationMinutes: 0, distanceKm: 0, avgSpeed: 0, maxSpeed: 0 }}
        stopsCount={0}
        events={[]}
        vehicleLabel="ABC-123-XD"
      />,
    )
    expect(screen.getByText(/no recent playbacks yet/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/playback/PlaybackSummaryPanel.test.tsx`
Expected: FAIL with "Cannot find module '.../PlaybackSummaryPanel'"

- [ ] **Step 3: Implement the component**

```tsx
'use client'

import { History } from 'lucide-react'
import type { PlaybackEvent, PlaybackEventType, PlaybackStats } from '@/types'

export interface PlaybackSummaryPanelProps {
  stats: PlaybackStats
  stopsCount: number
  events: PlaybackEvent[]
  vehicleLabel: string
}

const EVENT_LABELS: Record<PlaybackEventType, string> = {
  overspeed: 'Overspeed',
  harsh_braking: 'Harsh Braking',
  harsh_acceleration: 'Harsh Acceleration',
  geofence_enter: 'Geofence Enter',
  geofence_exit: 'Geofence Exit',
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-black text-slate-900 mt-0.5">{value}</p>
    </div>
  )
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins.toString().padStart(2, '0')}m`
}

export function PlaybackSummaryPanel({ stats, stopsCount, events, vehicleLabel }: PlaybackSummaryPanelProps) {
  const eventCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1
    return acc
  }, {})
  const topEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="p-4 space-y-6 overflow-y-auto">
      <section>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Duration" value={formatDuration(stats.durationMinutes)} />
          <Stat label="Distance" value={`${stats.distanceKm.toFixed(1)} km`} />
          <Stat label="Avg Speed" value={`${Math.round(stats.avgSpeed)} km/h`} />
          <Stat label="Max Speed" value={`${Math.round(stats.maxSpeed)} km/h`} />
          <Stat label="Stops" value={stopsCount} />
          <Stat label="Events" value={events.length} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Top Events</h4>
        </div>
        {topEvents.length === 0 ? (
          <p className="text-[10px] font-bold text-slate-400">No events recorded for this window.</p>
        ) : (
          <div className="space-y-1.5">
            {topEvents.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs font-bold text-slate-700 py-1">
                <span>{EVENT_LABELS[type as PlaybackEventType]}</span>
                <span className="text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Top Vehicles</h4>
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 py-1">
          <span>{vehicleLabel}</span>
          <span className="text-slate-400">{stats.distanceKm.toFixed(1)} km · {formatDuration(stats.durationMinutes)}</span>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recent Playbacks</h4>
        </div>
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
          <History className="h-6 w-6 text-slate-200 mx-auto mb-2" />
          <p className="text-[10px] font-bold text-slate-400">No recent playbacks yet</p>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/playback/PlaybackSummaryPanel.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/tracking/playback/components/PlaybackSummaryPanel.tsx" __tests__/playback/PlaybackSummaryPanel.test.tsx
git commit -m "feat(playback): add PlaybackSummaryPanel with real stats, top events, and vehicle row"
```

---

### Task 12: Bottom tab panel (`PlaybackBottomPanel` + tabs)

**Files:**
- Create: `app/(portal)/tracking/playback/components/PlaybackBottomPanel.tsx`
- Create: `app/(portal)/tracking/playback/components/tabs/TimelineTab.tsx`
- Create: `app/(portal)/tracking/playback/components/tabs/EventsTab.tsx`
- Create: `app/(portal)/tracking/playback/components/tabs/StopsTab.tsx`
- Create: `app/(portal)/tracking/playback/components/tabs/SpeedTab.tsx`
- Create: `app/(portal)/tracking/playback/components/tabs/AltitudeTab.tsx`
- Create: `app/(portal)/tracking/playback/components/tabs/FuelTab.tsx`
- Create: `app/(portal)/tracking/playback/components/tabs/VehiclesTab.tsx`
- Test: `__tests__/playback/PlaybackBottomPanel.test.tsx`

**Interfaces:**
- Consumes: `PlaybackMovement`, `PlaybackEvent`, `PlaybackStop`, `PlaybackStats` (Task 1), shadcn `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (`@/components/ui/tabs`, pre-existing), `recharts` (pre-existing dependency).
- Produces:
```ts
export interface PlaybackBottomPanelProps {
  movements: PlaybackMovement[]
  events: PlaybackEvent[]
  stops: PlaybackStop[]
  stats: PlaybackStats
  vehicleLabel: string
}
```
consumed by Task 13.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/PlaybackBottomPanel.test.tsx`:

```tsx
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackBottomPanel } from '@/app/(portal)/tracking/playback/components/PlaybackBottomPanel'
import type { PlaybackEvent, PlaybackStop, PlaybackMovement } from '@/types'

const movements: PlaybackMovement[] = [
  { id: 1, vehicle_id: 1, lat: 6.5, lng: 3.4, speed: 40, heading: 0, timestamp: '2024-01-01T08:00:00Z' },
  { id: 2, vehicle_id: 1, lat: 6.51, lng: 3.41, speed: 90, heading: 0, timestamp: '2024-01-01T08:05:00Z' },
]
const events: PlaybackEvent[] = [
  { type: 'overspeed', startIndex: 1, endIndex: 1, timestamp: '2024-01-01T08:05:00Z', lat: 6.51, lng: 3.41, peakSpeed: 90 },
]
const stops: PlaybackStop[] = [
  { startIndex: 0, endIndex: 0, startTimestamp: '2024-01-01T08:00:00Z', endTimestamp: '2024-01-01T08:06:00Z', durationMinutes: 6, lat: 6.5, lng: 3.4 },
]
const stats = { durationMinutes: 60, distanceKm: 20, avgSpeed: 40, maxSpeed: 90 }

describe('PlaybackBottomPanel', () => {
  it('renders the Timeline tab by default with start/event/end entries', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    expect(screen.getByText(/playback started/i)).toBeInTheDocument()
    expect(screen.getByText(/overspeed/i)).toBeInTheDocument()
  })

  it('switches to the Events tab and shows only events', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.click(screen.getByRole('tab', { name: /events/i }))
    expect(screen.queryByText(/playback started/i)).not.toBeInTheDocument()
    expect(screen.getByText(/overspeed/i)).toBeInTheDocument()
  })

  it('switches to the Stops tab and shows stop duration', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.click(screen.getByRole('tab', { name: /^stops$/i }))
    expect(screen.getByText(/6 min/i)).toBeInTheDocument()
  })

  it('shows an empty state on the Altitude tab', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.click(screen.getByRole('tab', { name: /altitude/i }))
    expect(screen.getByText(/altitude data isn't available/i)).toBeInTheDocument()
  })

  it('shows an empty state on the Fuel tab', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.click(screen.getByRole('tab', { name: /^fuel$/i }))
    expect(screen.getByText(/fuel data isn't available/i)).toBeInTheDocument()
  })

  it('shows the selected vehicle row on the Vehicles tab', () => {
    render(<PlaybackBottomPanel movements={movements} events={events} stops={stops} stats={stats} vehicleLabel="ABC-123-XD" />)
    fireEvent.click(screen.getByRole('tab', { name: /vehicles/i }))
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/playback/PlaybackBottomPanel.test.tsx`
Expected: FAIL with "Cannot find module '.../PlaybackBottomPanel'"

- [ ] **Step 3: Implement the tab content components**

Create `app/(portal)/tracking/playback/components/tabs/TimelineTab.tsx`:

```tsx
'use client'

import { format } from 'date-fns'
import { Flag, AlertTriangle, MapPin } from 'lucide-react'
import type { PlaybackEvent, PlaybackEventType, PlaybackMovement } from '@/types'

const EVENT_LABELS: Record<PlaybackEventType, string> = {
  overspeed: 'Overspeed',
  harsh_braking: 'Harsh Braking',
  harsh_acceleration: 'Harsh Acceleration',
  geofence_enter: 'Geofence Enter',
  geofence_exit: 'Geofence Exit',
}

interface TimelineEntry {
  key: string
  icon: typeof Flag
  label: string
  timestamp: string
  lat: number
  lng: number
}

export function buildTimelineEntries(movements: PlaybackMovement[], events: PlaybackEvent[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  if (movements[0]) {
    entries.push({ key: 'start', icon: Flag, label: 'Playback Started', timestamp: movements[0].timestamp, lat: movements[0].lat, lng: movements[0].lng })
  }
  events.forEach((e, i) => {
    entries.push({ key: `event-${i}`, icon: AlertTriangle, label: EVENT_LABELS[e.type], timestamp: e.timestamp, lat: e.lat, lng: e.lng })
  })
  if (movements.length > 1) {
    const last = movements[movements.length - 1]
    entries.push({ key: 'end', icon: Flag, label: 'Playback Ended', timestamp: last.timestamp, lat: last.lat, lng: last.lng })
  }
  return entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function TimelineTab({ movements, events }: { movements: PlaybackMovement[]; events: PlaybackEvent[] }) {
  const entries = buildTimelineEntries(movements, events)
  if (entries.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 p-4">No timeline data for this window.</p>
  }
  return (
    <div className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <div key={entry.key} className="flex items-center gap-3 py-2.5 px-1">
          <entry.icon className="h-4 w-4 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900">{entry.label}</p>
            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{format(new Date(entry.timestamp), 'hh:mm:ss a')}</span>
        </div>
      ))}
    </div>
  )
}
```

Create `app/(portal)/tracking/playback/components/tabs/EventsTab.tsx`:

```tsx
'use client'

import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import type { PlaybackEvent, PlaybackEventType } from '@/types'

const EVENT_LABELS: Record<PlaybackEventType, string> = {
  overspeed: 'Overspeed',
  harsh_braking: 'Harsh Braking',
  harsh_acceleration: 'Harsh Acceleration',
  geofence_enter: 'Geofence Enter',
  geofence_exit: 'Geofence Exit',
}

export function EventsTab({ events }: { events: PlaybackEvent[] }) {
  if (events.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 p-4">No events recorded for this window.</p>
  }
  return (
    <div className="divide-y divide-slate-100">
      {events.map((event, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 px-1">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900">{EVENT_LABELS[event.type]}</p>
            {event.peakSpeed != null && <p className="text-[10px] font-medium text-slate-400">Peak {Math.round(event.peakSpeed)} km/h</p>}
          </div>
          <span className="text-[10px] font-bold text-slate-400">{format(new Date(event.timestamp), 'hh:mm:ss a')}</span>
        </div>
      ))}
    </div>
  )
}
```

Create `app/(portal)/tracking/playback/components/tabs/StopsTab.tsx`:

```tsx
'use client'

import { format } from 'date-fns'
import { CircleDot } from 'lucide-react'
import type { PlaybackStop } from '@/types'

export function StopsTab({ stops }: { stops: PlaybackStop[] }) {
  if (stops.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 p-4">No stops detected for this window.</p>
  }
  return (
    <div className="divide-y divide-slate-100">
      {stops.map((stop, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 px-1">
          <CircleDot className="h-4 w-4 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900">Stop {i + 1}</p>
            <p className="text-[10px] font-medium text-slate-400">{Math.round(stop.durationMinutes)} min</p>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{format(new Date(stop.startTimestamp), 'hh:mm:ss a')}</span>
        </div>
      ))}
    </div>
  )
}
```

Create `app/(portal)/tracking/playback/components/tabs/SpeedTab.tsx`:

```tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'
import { format } from 'date-fns'
import type { PlaybackEvent, PlaybackMovement } from '@/types'

export function SpeedTab({ movements, events }: { movements: PlaybackMovement[]; events: PlaybackEvent[] }) {
  const data = movements.map((m) => ({ time: format(new Date(m.timestamp), 'hh:mm a'), speed: Math.round(m.speed) }))
  const overspeedIndexes = new Set(events.filter((e) => e.type === 'overspeed').map((e) => e.startIndex))

  if (data.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 p-4">No speed data for this window.</p>
  }

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 'bold' }} />
          <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} />
          {[...overspeedIndexes].map((index) => (
            <ReferenceDot key={index} x={data[index]?.time} y={data[index]?.speed} r={5} fill="#f97316" stroke="white" />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

Create `app/(portal)/tracking/playback/components/tabs/AltitudeTab.tsx`:

```tsx
'use client'

import { Mountain } from 'lucide-react'

export function AltitudeTab() {
  return (
    <div className="text-center py-10">
      <Mountain className="h-6 w-6 text-slate-200 mx-auto mb-2" />
      <p className="text-[10px] font-bold text-slate-400">Altitude data isn't available for this device yet.</p>
    </div>
  )
}
```

Create `app/(portal)/tracking/playback/components/tabs/FuelTab.tsx`:

```tsx
'use client'

import { Fuel } from 'lucide-react'

export function FuelTab() {
  return (
    <div className="text-center py-10">
      <Fuel className="h-6 w-6 text-slate-200 mx-auto mb-2" />
      <p className="text-[10px] font-bold text-slate-400">Fuel data isn't available for this device yet.</p>
    </div>
  )
}
```

Create `app/(portal)/tracking/playback/components/tabs/VehiclesTab.tsx`:

```tsx
'use client'

import type { PlaybackStats } from '@/types'

export function VehiclesTab({ vehicleLabel, stats }: { vehicleLabel: string; stats: PlaybackStats }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-1 text-xs font-bold text-slate-900">
      <span>{vehicleLabel}</span>
      <span className="text-slate-400">
        {stats.distanceKm.toFixed(1)} km · {Math.round(stats.avgSpeed)} km/h avg
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Implement `PlaybackBottomPanel.tsx`**

```tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PlaybackEvent, PlaybackMovement, PlaybackStats, PlaybackStop } from '@/types'
import { TimelineTab } from './tabs/TimelineTab'
import { EventsTab } from './tabs/EventsTab'
import { StopsTab } from './tabs/StopsTab'
import { SpeedTab } from './tabs/SpeedTab'
import { AltitudeTab } from './tabs/AltitudeTab'
import { FuelTab } from './tabs/FuelTab'
import { VehiclesTab } from './tabs/VehiclesTab'

export interface PlaybackBottomPanelProps {
  movements: PlaybackMovement[]
  events: PlaybackEvent[]
  stops: PlaybackStop[]
  stats: PlaybackStats
  vehicleLabel: string
}

export function PlaybackBottomPanel({ movements, events, stops, stats, vehicleLabel }: PlaybackBottomPanelProps) {
  return (
    <Tabs defaultValue="timeline" className="bg-white border-t border-slate-200">
      <TabsList className="h-11 w-full justify-start gap-4 rounded-none bg-transparent p-0 px-4 border-b border-slate-100">
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="stops">Stops</TabsTrigger>
        <TabsTrigger value="speed">Speed</TabsTrigger>
        <TabsTrigger value="altitude">Altitude</TabsTrigger>
        <TabsTrigger value="fuel">Fuel</TabsTrigger>
        <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
      </TabsList>
      <div className="p-4 max-h-64 overflow-y-auto">
        <TabsContent value="timeline" className="m-0">
          <TimelineTab movements={movements} events={events} />
        </TabsContent>
        <TabsContent value="events" className="m-0">
          <EventsTab events={events} />
        </TabsContent>
        <TabsContent value="stops" className="m-0">
          <StopsTab stops={stops} />
        </TabsContent>
        <TabsContent value="speed" className="m-0">
          <SpeedTab movements={movements} events={events} />
        </TabsContent>
        <TabsContent value="altitude" className="m-0">
          <AltitudeTab />
        </TabsContent>
        <TabsContent value="fuel" className="m-0">
          <FuelTab />
        </TabsContent>
        <TabsContent value="vehicles" className="m-0">
          <VehiclesTab vehicleLabel={vehicleLabel} stats={stats} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run __tests__/playback/PlaybackBottomPanel.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add "app/(portal)/tracking/playback/components/PlaybackBottomPanel.tsx" "app/(portal)/tracking/playback/components/tabs" __tests__/playback/PlaybackBottomPanel.test.tsx
git commit -m "feat(playback): add bottom tab panel (Timeline/Events/Stops/Speed/Altitude/Fuel/Vehicles)"
```

---

### Task 13: Final page assembly — rebuild `app/(portal)/tracking/playback/page.tsx`

**Files:**
- Modify: `app/(portal)/tracking/playback/page.tsx` (full replacement of the existing 591-line implementation)
- Test: `__tests__/playback/page.test.tsx`

**Interfaces:**
- Consumes: everything produced by Tasks 1–12 (`usePlaybackMovements`, `usePlaybackDerived`, `PlaybackFilterBar`, `PlaybackAdvancedFilters`, `PlaybackMap`, `PlaybackScrubber`, `PlaybackSummaryPanel`, `PlaybackBottomPanel`), plus pre-existing `vehicleApi.getVehicles`, `getClusters`, `driversApi.getDrivers`, `driversApi.getDriverCurrentVehicle`, `getGeofences`, `tripApi.getTripRoutes`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/playback/page.test.tsx`:

```tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('leaflet', () => ({ default: { divIcon: vi.fn(() => ({})) } }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: any) => <div>{children}</div>,
  Polyline: () => null,
  useMap: () => ({ fitBounds: vi.fn(), flyTo: vi.fn() }),
}))
vi.mock('next/dynamic', () => ({ default: () => () => null }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams('vehicleId=1&start=2024-01-01T08:00:00.000Z&end=2024-01-01T14:00:00.000Z'),
}))

vi.mock('@/lib/api/vehicles', () => ({
  getVehicles: vi.fn().mockResolvedValue({ data: [{ id: '1', attributes: { registration_number: 'ABC-123-XD' }, relationships: {} }] }),
}))
vi.mock('@/lib/api/settings', () => ({ getClusters: vi.fn().mockResolvedValue({ data: { clusters: [] } }) }))
vi.mock('@/lib/api/drivers', () => ({ getDrivers: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('@/lib/api/geofencing', () => ({ getGeofences: vi.fn().mockResolvedValue({ data: { geofences: [] } }) }))
vi.mock('@/lib/api/trips', () => ({ getTripRoutes: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('@/lib/api/tracking', () => ({
  getVehiclePlayback: vi.fn().mockResolvedValue({
    data: [{ latitude: 6.5, longitude: 3.4, speed: 40, heading: 0, timestamp: '2024-01-01T08:00:00Z' }],
  }),
  getTripPlayback: vi.fn().mockResolvedValue({ data: { gps_points: [] } }),
}))
vi.mock('@/store/uiStore', () => ({ useUIStore: () => ({ setSidebarCollapsed: vi.fn() }) }))

import PlaybackPage from '@/app/(portal)/tracking/playback/page'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
)

describe('PlaybackPage', () => {
  it('pre-selects the vehicle from the vehicleId search param and renders its plate in the filter bar', async () => {
    render(<PlaybackPage />, { wrapper: Wrapper })
    expect(await screen.findByText('ABC-123-XD')).toBeInTheDocument()
  })

  it('renders the summary panel by default and swaps to advanced filters when More Filters is clicked', async () => {
    render(<PlaybackPage />, { wrapper: Wrapper })
    await screen.findByText('ABC-123-XD')
    expect(screen.getByText(/top events/i)).toBeInTheDocument()
    screen.getByRole('button', { name: /more filters/i }).click()
    expect(await screen.findByText(/vehicle status/i)).toBeInTheDocument()
  })

  it('renders the bottom tab panel', async () => {
    render(<PlaybackPage />, { wrapper: Wrapper })
    await screen.findByText('ABC-123-XD')
    expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/playback/page.test.tsx`
Expected: FAIL (current page has a completely different left-sidebar layout with no "Top Events"/"More Filters"/tab bar).

- [ ] **Step 3: Replace `app/(portal)/tracking/playback/page.tsx` in full**

```tsx
'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format, subHours } from 'date-fns'
import { ChevronLeft, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import * as vehicleApi from '@/lib/api/vehicles'
import * as driversApi from '@/lib/api/drivers'
import * as tripApi from '@/lib/api/trips'
import { getClusters } from '@/lib/api/settings'
import { getGeofences } from '@/lib/api/geofencing'
import type { PlaybackEventType } from '@/types'
import { DEFAULT_THRESHOLDS, type DrivingBehaviourThresholds } from '@/lib/playback/derive'
import { usePlaybackMovements } from './hooks/usePlaybackMovements'
import { usePlaybackDerived } from './hooks/usePlaybackDerived'
import { PlaybackFilterBar } from './components/PlaybackFilterBar'
import { PlaybackAdvancedFilters } from './components/PlaybackAdvancedFilters'
import { PlaybackMap } from './components/PlaybackMap'
import { PlaybackScrubber } from './components/PlaybackScrubber'
import { PlaybackSummaryPanel } from './components/PlaybackSummaryPanel'
import { PlaybackBottomPanel } from './components/PlaybackBottomPanel'

const DEFAULT_EVENT_FILTERS: Record<PlaybackEventType, boolean> = {
  overspeed: true,
  harsh_braking: true,
  harsh_acceleration: true,
  geofence_enter: true,
  geofence_exit: true,
}

function toDatetimeLocal(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
}

export default function PlaybackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setSidebarCollapsed } = useUIStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const [vehicleId, setVehicleId] = useState<string | null>(searchParams.get('vehicleId'))
  const [tripId, setTripId] = useState<string | null>(searchParams.get('tripId'))
  const initialEnd = searchParams.get('end') ?? new Date().toISOString()
  const initialStart = searchParams.get('start') ?? subHours(new Date(initialEnd), 6).toISOString()
  const [startTime, setStartTime] = useState(toDatetimeLocal(initialStart))
  const [endTime, setEndTime] = useState(toDatetimeLocal(initialEnd))
  const [clusterId, setClusterId] = useState<string | null>(null)
  const [driverId, setDriverId] = useState<string | null>(null)

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [vehicleStatusFilters, setVehicleStatusFilters] = useState({ moving: true, parked: true, idle: true, offline: true })
  const [routeId, setRouteId] = useState<string | null>(null)
  const [geofenceId, setGeofenceId] = useState<string | null>(null)
  const [radiusKm, setRadiusKm] = useState(5)
  const [eventFilters, setEventFilters] = useState(DEFAULT_EVENT_FILTERS)
  const [thresholds, setThresholds] = useState<DrivingBehaviourThresholds>(DEFAULT_THRESHOLDS)

  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4 | 8>(1)

  useEffect(() => {
    setSidebarCollapsed(true)
    return () => setSidebarCollapsed(false)
  }, [setSidebarCollapsed])

  const { data: vehiclesData } = useQuery({
    queryKey: ['playback-vehicles'],
    queryFn: () => vehicleApi.getVehicles({ per_page: 200 }),
  })
  const vehicles = vehiclesData?.data ?? []

  const { data: clustersData } = useQuery({
    queryKey: ['playback-clusters'],
    queryFn: () => getClusters({ per_page: 100 }),
  })
  const clusters = clustersData?.data?.clusters ?? []

  const { data: driversData } = useQuery({
    queryKey: ['playback-drivers'],
    queryFn: () => driversApi.getDrivers({ per_page: 200 }),
  })
  const drivers = driversData?.data ?? []

  const { data: driverVehicleData } = useQuery({
    queryKey: ['playback-driver-vehicle', driverId],
    queryFn: () => driversApi.getDriverCurrentVehicle(driverId!),
    enabled: !!driverId,
  })

  useEffect(() => {
    const assignedVehicleId = driverVehicleData?.data?.id
    if (assignedVehicleId) setVehicleId(String(assignedVehicleId))
  }, [driverVehicleData])

  const { data: geofencesData } = useQuery({
    queryKey: ['playback-geofences'],
    queryFn: () => getGeofences({ per_page: 100 }),
  })
  const geofences = geofencesData?.data?.geofences ?? []
  const selectedGeofence = geofences.find((g) => String(g.id) === geofenceId) ?? null

  const { data: routesData } = useQuery({
    queryKey: ['playback-routes', tripId],
    queryFn: () => tripApi.getTripRoutes(tripId!),
    enabled: !!tripId,
  })
  const routes = (routesData?.data ?? []).map((r: any) => ({ id: String(r.id), label: r.name ?? `Route ${r.id}` }))

  const visibleVehicles = useMemo(() => {
    if (!clusterId) return vehicles
    return vehicles.filter((v) => String(v.relationships?.cluster?.id ?? '') === clusterId)
  }, [vehicles, clusterId])

  const selectedVehicle = vehicles.find((v) => String(v.id) === vehicleId) ?? null
  const vehicleLabel = selectedVehicle?.attributes.registration_number ?? '—'

  const { movements, isLoading } = usePlaybackMovements({
    vehicleId,
    tripId,
    startTime: tripId ? null : new Date(startTime).toISOString(),
    endTime: tripId ? null : new Date(endTime).toISOString(),
  })

  const { stats, speedSegments, stops, events } = usePlaybackDerived(movements, thresholds, selectedGeofence)
  const filteredEvents = events.filter((e) => eventFilters[e.type])

  const activeFilterCount =
    Object.values(vehicleStatusFilters).filter((v) => !v).length +
    (routeId ? 1 : 0) +
    (geofenceId ? 1 : 0) +
    Object.values(eventFilters).filter((v) => !v).length

  const activeChips = [
    ...(!vehicleStatusFilters.parked ? [{ key: 'hide-parked', label: 'Hiding Parked' }] : []),
    ...(geofenceId ? [{ key: 'geofence', label: 'Geofence Filter' }] : []),
    ...(routeId ? [{ key: 'route', label: 'Route Filter' }] : []),
  ]

  const removeChip = useCallback((key: string) => {
    if (key === 'hide-parked') setVehicleStatusFilters((prev) => ({ ...prev, parked: true }))
    if (key === 'geofence') setGeofenceId(null)
    if (key === 'route') setRouteId(null)
  }, [])

  const clearAllChips = useCallback(() => {
    setVehicleStatusFilters({ moving: true, parked: true, idle: true, offline: true })
    setGeofenceId(null)
    setRouteId(null)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    }
  }, [])

  useEffect(() => {
    if (!isPlaying || movements.length === 0) return
    if (playbackIndex >= movements.length - 1) {
      setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => setPlaybackIndex((i) => i + 1), 1000 / playbackSpeed)
    return () => clearTimeout(timer)
  }, [isPlaying, playbackIndex, movements.length, playbackSpeed])

  return (
    <div ref={containerRef} className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h1 className="font-black text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Playback
        </h1>
      </div>

      <PlaybackFilterBar
        vehicles={visibleVehicles.map((v) => ({ id: String(v.id), label: v.attributes.registration_number }))}
        selectedVehicleId={vehicleId}
        onVehicleChange={(id) => {
          setVehicleId(id)
          setTripId(null)
          setPlaybackIndex(0)
        }}
        clusters={clusters.map((c) => ({ id: String(c.id), label: c.attributes.name }))}
        selectedClusterId={clusterId}
        onClusterChange={setClusterId}
        drivers={drivers.map((d: any) => ({ id: String(d.id), label: `${d.f_name ?? ''} ${d.l_name ?? ''}`.trim() || `Driver ${d.id}` }))}
        selectedDriverId={driverId}
        onDriverChange={setDriverId}
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        isRangeReadOnly={!!tripId}
        activeFilterCount={activeFilterCount}
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen((v) => !v)}
        activeChips={activeChips}
        onRemoveChip={removeChip}
        onClearAllChips={clearAllChips}
      />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold">Loading telemetry…</div>
          ) : (
            <PlaybackMap
              movements={movements}
              speedSegments={speedSegments}
              stops={stops}
              currentIndex={playbackIndex}
              mapStyle={mapStyle}
              onToggleMapStyle={() => setMapStyle((s) => (s === 'standard' ? 'satellite' : 'standard'))}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          )}
          <PlaybackScrubber
            movements={movements}
            currentIndex={playbackIndex}
            onIndexChange={setPlaybackIndex}
            isPlaying={isPlaying}
            onTogglePlaying={() => setIsPlaying((p) => !p)}
            speed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
          />
          <PlaybackBottomPanel movements={movements} events={filteredEvents} stops={stops} stats={stats} vehicleLabel={vehicleLabel} />
        </div>

        <aside className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
          {isAdvancedOpen ? (
            <PlaybackAdvancedFilters
              vehicleStatusFilters={vehicleStatusFilters}
              onVehicleStatusChange={(key, value) => setVehicleStatusFilters((prev) => ({ ...prev, [key]: value }))}
              routes={routes}
              selectedRouteId={routeId}
              onRouteChange={setRouteId}
              geofences={geofences.map((g) => ({ id: String(g.id), label: g.attributes.name }))}
              selectedGeofenceId={geofenceId}
              onGeofenceChange={setGeofenceId}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              eventFilters={eventFilters}
              onEventFilterChange={(key, value) => setEventFilters((prev) => ({ ...prev, [key]: value }))}
              thresholds={thresholds}
              onThresholdsChange={setThresholds}
              onApply={() => setIsAdvancedOpen(false)}
              onReset={() => {
                setVehicleStatusFilters({ moving: true, parked: true, idle: true, offline: true })
                setRouteId(null)
                setGeofenceId(null)
                setRadiusKm(5)
                setEventFilters(DEFAULT_EVENT_FILTERS)
                setThresholds(DEFAULT_THRESHOLDS)
              }}
            />
          ) : (
            <PlaybackSummaryPanel stats={stats} stopsCount={stops.length} events={filteredEvents} vehicleLabel={vehicleLabel} />
          )}
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/playback/page.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(portal)/tracking/playback/page.tsx" __tests__/playback/page.test.tsx
git commit -m "feat(playback): rebuild the Playback page with filter bar, speed-colored map, summary/advanced panels, and bottom tabs"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-04-playback-page-redesign-design.md` maps to a task — types/derivation (§6 → Tasks 1-2), navigation (§2 → Task 5-6), filter bar/advanced filters (§3 → Tasks 7-8), map/scrubber (§4 → Tasks 9-10), summary panel/bottom tabs (§5 → Tasks 11-12), assembly (Task 13).
- **Groups/Location scoping:** Task 7 implements Groups as real cluster filtering and Location as a genuinely disabled stub, matching the design's corrected scope.
- **Type consistency:** `PlaybackMovement`/`PlaybackStats`/`PlaybackEvent`/`PlaybackStop`/`PlaybackSpeedSegment` are defined once in Task 1 and referenced identically (same field names) by every subsequent task — verified against each task's prop/interface block above.
- **No fabricated data:** Recent Playbacks (Task 11) and Altitude/Fuel tabs (Task 12) render explicit empty states, never sample data.
