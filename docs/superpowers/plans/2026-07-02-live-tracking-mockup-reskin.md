# Live Tracking Mockup Reskin + Live Route Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Live Tracking page (`app/(portal)/tracking/`) to pixel-match the provided mockup's docked, flat enterprise-dashboard layout on desktop (and a reasoned mobile extrapolation), and add a live route trail (breadcrumb polyline) behind the selected vehicle.

**Architecture:** The page moves from `absolute`-positioned floating glass-morphism overlays to a CSS grid shell (top toolbar row / sidebar-map-panel row / bottom-cards row). Existing data-fetching, WebSocket subscriptions, marker interpolation, clustering, geofence overlay, and playback/replay logic are untouched — this is a layout and component-styling change plus one small, additive piece of new client-side state (a capped breadcrumb buffer) for the route trail.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, react-leaflet/Leaflet, TanStack Query, Zustand (`trackingUiStore`), Vitest + React Testing Library.

## Global Constraints

- No backend/API changes — everything is frontend layout, styling, and one client-side breadcrumb buffer (per spec's Non-Goals).
- No change to WS subscription architecture (`useVehicleLocations`, `usePlaybackData`, `useEcho`) beyond feeding the new trail buffer (per spec §"Live Route Trail — Implementation Notes").
- Status colors are already correct and must not change: reuse `VEHICLE_STATUS`/`VEHICLE_STATUS_ORDER` from `lib/vehicleStatus.ts` everywhere (moving=emerald, parked=blue, idle=amber, offline=rose, alarm=purple) — do not hardcode new colors (per spec §4 and existing file-header comment in `lib/vehicleStatus.ts`).
- Do not remove or alter the six "More" menu actions, tab contents (Details/Driver/Trip/Device/Live IoT), or the packet stream viewer — those already match the mockup (per spec Non-Goals).
- Route trail: selected vehicle only, session breadcrumb (not backed by the trips/routes API), capped at ~50 points or ~15 minutes, whichever is hit first, cleared on selection change/deselect (per spec §"Live Route Trail — Implementation Notes").
- Mobile/tablet (<1024px, Tailwind `lg` breakpoint) keeps existing bottom-sheet interaction patterns (`MobileAssetSheet`, `AssetPanel`'s mobile bottom-sheet mode) — restyled but not rearchitected (per spec §7).
- Test runner is Vitest: run any single file with `npx vitest run <path>`; run the whole suite with `npx vitest run`. Tests live under `__tests__/` and match `**/__tests__/**/*.{test,spec}.{ts,tsx}` (see `vitest.config.ts`). Follow the existing mocking conventions in `__tests__/tracking/components.test.tsx` (vi.mock hooks/stores/API modules, wrap query-dependent components in a `QueryClientProvider`).
- `react-leaflet`/`leaflet`/`react-leaflet-cluster` do not render in jsdom without mocking — any test importing `TrackingMap.tsx` or `page.tsx` must mock those three packages (pattern defined in Task 3).

---

### Task 1: Live route trail buffer utility

**Files:**
- Create: `lib/vehicleTrail.ts`
- Test: `__tests__/tracking/vehicleTrail.test.ts`

**Interfaces:**
- Produces: `TrailPoint { lat: number; lng: number; timestamp: number }`, `TRAIL_MAX_POINTS = 50`, `TRAIL_MAX_AGE_MS = 15 * 60_000`, `appendTrailPoint(trail: TrailPoint[], point: TrailPoint): TrailPoint[]` — pure function, returns a new array (does not mutate `trail`), drops points older than `point.timestamp - TRAIL_MAX_AGE_MS`, then caps the result to the most recent `TRAIL_MAX_POINTS`.

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/tracking/vehicleTrail.test.ts
import { describe, it, expect } from 'vitest'
import { appendTrailPoint, TRAIL_MAX_POINTS, TRAIL_MAX_AGE_MS, type TrailPoint } from '@/lib/vehicleTrail'

const pt = (lat: number, lng: number, timestamp: number): TrailPoint => ({ lat, lng, timestamp })

describe('appendTrailPoint', () => {
  it('appends a point to an empty trail', () => {
    const result = appendTrailPoint([], pt(6.5, 3.4, 1000))
    expect(result).toEqual([pt(6.5, 3.4, 1000)])
  })

  it('appends to an existing trail without mutating the input array', () => {
    const trail = [pt(6.5, 3.4, 1000)]
    const result = appendTrailPoint(trail, pt(6.51, 3.41, 2000))
    expect(trail).toHaveLength(1)
    expect(result).toEqual([pt(6.5, 3.4, 1000), pt(6.51, 3.41, 2000)])
  })

  it('drops points older than TRAIL_MAX_AGE_MS relative to the new point', () => {
    const oldPoint = pt(6.5, 3.4, 1000)
    const recentPoint = pt(6.51, 3.41, 1000 + TRAIL_MAX_AGE_MS - 1000)
    const newPoint = pt(6.52, 3.42, 1000 + TRAIL_MAX_AGE_MS + 1)
    const result = appendTrailPoint([oldPoint, recentPoint], newPoint)
    expect(result).toEqual([recentPoint, newPoint])
  })

  it('caps the trail at TRAIL_MAX_POINTS, dropping the oldest first', () => {
    let trail: TrailPoint[] = []
    for (let i = 0; i < TRAIL_MAX_POINTS + 10; i++) {
      trail = appendTrailPoint(trail, pt(i, i, i))
    }
    expect(trail).toHaveLength(TRAIL_MAX_POINTS)
    expect(trail[0].timestamp).toBe(10)
    expect(trail[trail.length - 1].timestamp).toBe(TRAIL_MAX_POINTS + 9)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/tracking/vehicleTrail.test.ts`
Expected: FAIL — `Cannot find module '@/lib/vehicleTrail'`

- [ ] **Step 3: Write the implementation**

```typescript
// lib/vehicleTrail.ts

/** A single point in a vehicle's live breadcrumb trail. */
export interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

/** Trail is capped at whichever of these limits is hit first. */
export const TRAIL_MAX_POINTS = 50;
export const TRAIL_MAX_AGE_MS = 15 * 60_000;

/**
 * Appends a point to a vehicle's breadcrumb trail, evicting points older than
 * TRAIL_MAX_AGE_MS (relative to the new point) and capping the result at
 * TRAIL_MAX_POINTS. Pure — never mutates the input array.
 */
export function appendTrailPoint(trail: TrailPoint[], point: TrailPoint): TrailPoint[] {
  const cutoff = point.timestamp - TRAIL_MAX_AGE_MS;
  const kept = trail.filter((p) => p.timestamp >= cutoff);
  const next = [...kept, point];
  return next.length > TRAIL_MAX_POINTS ? next.slice(next.length - TRAIL_MAX_POINTS) : next;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/tracking/vehicleTrail.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/vehicleTrail.ts __tests__/tracking/vehicleTrail.test.ts
git commit -m "feat(tracking): add capped breadcrumb trail buffer utility"
```

---

### Task 2: Wire the trail buffer into `useVehicleLocations`

**Files:**
- Modify: `app/(portal)/tracking/hooks/useVehicleLocations.ts`
- Test: `__tests__/tracking/useVehicleLocations.test.ts`

**Interfaces:**
- Consumes: `appendTrailPoint`, `TrailPoint` from `@/lib/vehicleTrail` (Task 1).
- Produces: hook return value gains `trails: Record<string, TrailPoint[]>` alongside the existing `locations`, `setLocations`, `interpolator`, `alarmState`.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tracking/useVehicleLocations.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVehicleLocations } from '@/app/(portal)/tracking/hooks/useVehicleLocations'

vi.mock('@/store/packetStreamStore', () => ({
  usePacketStreamStore: {
    getState: () => ({ push: vi.fn() }),
  },
}))

function makeSubscribePrivate() {
  const handlers = new Map<string, (data: any) => void>()
  const subscribePrivate = vi.fn((channel: string, event: string, cb: (data: any) => void) => {
    handlers.set(`${channel}::${event}`, cb)
    return () => handlers.delete(`${channel}::${event}`)
  })
  return { subscribePrivate, handlers }
}

const baseProps = {
  vehicles: [],
  token: 'test-token',
  organization: { id: 'org-1', attributes: { identifier: 'org-1' } },
}

describe('useVehicleLocations trail buffer', () => {
  it('appends live positions to trails only for the selected vehicle', () => {
    const { subscribePrivate, handlers } = makeSubscribePrivate()
    const { result, rerender } = renderHook(
      (props: { selectedVehicleId: string | null }) =>
        useVehicleLocations({ ...baseProps, subscribePrivate, selectedVehicleId: props.selectedVehicleId }),
      { initialProps: { selectedVehicleId: '42' } },
    )

    const locationHandler = handlers.get('location.organization.org-1::.current.recent')!

    act(() => {
      locationHandler({ vehicle_id: '42', latitude: 6.5, longitude: 3.4, speed: 10, status: 'in_transit' })
    })
    act(() => {
      locationHandler({ vehicle_id: '99', latitude: 1.1, longitude: 2.2, speed: 10, status: 'in_transit' })
    })

    expect(result.current.trails['42']).toHaveLength(1)
    expect(result.current.trails['42'][0]).toMatchObject({ lat: 6.5, lng: 3.4 })
    expect(result.current.trails['99']).toBeUndefined()

    act(() => {
      locationHandler({ vehicle_id: '42', latitude: 6.51, longitude: 3.41, speed: 12, status: 'in_transit' })
    })
    expect(result.current.trails['42']).toHaveLength(2)

    // Changing selection clears the trail buffer
    rerender({ selectedVehicleId: '99' })
    expect(result.current.trails['42']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/useVehicleLocations.test.ts`
Expected: FAIL — `result.current.trails` is `undefined`, assertions fail.

- [ ] **Step 3: Implement the trail wiring**

In `app/(portal)/tracking/hooks/useVehicleLocations.ts`, add the import near the top:

```typescript
import { appendTrailPoint, type TrailPoint } from "@/lib/vehicleTrail";
```

Add state right after the existing `interpolator` state declaration (around line 43):

```typescript
  const [trails, setTrails] = useState<Record<string, TrailPoint[]>>({});
```

Add a clear-on-selection-change effect right after the existing `selectedIdRef` sync effect (around line 48):

```typescript
  useEffect(() => {
    setTrails({});
  }, [selectedVehicleId]);
```

Inside the `.current.recent` handler (the `subscribePrivate(\`location.organization.${orgIdentifier}\`, ".current.recent", ...)` callback), add the trail append right after the existing `interpolator.ingest`/`interpolator.snap` block and before the `setLocations` call:

```typescript
          if (
            normalized.lat != null &&
            normalized.lng != null &&
            selectedIdRef.current != null &&
            String(selectedIdRef.current) === idKey
          ) {
            setTrails((prev) => ({
              ...prev,
              [idKey]: appendTrailPoint(prev[idKey] ?? [], {
                lat: normalized.lat,
                lng: normalized.lng,
                timestamp: Date.now(),
              }),
            }));
          }
```

Finally, add `trails` to the hook's return object (currently `return { locations, setLocations, interpolator, alarmState };`):

```typescript
  return {
    locations,
    setLocations,
    interpolator,
    alarmState,
    trails,
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/useVehicleLocations.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Run the full tracking test suite to check for regressions**

Run: `npx vitest run __tests__/tracking`
Expected: PASS (all existing + new tests)

- [ ] **Step 6: Commit**

```bash
git add app/\(portal\)/tracking/hooks/useVehicleLocations.ts __tests__/tracking/useVehicleLocations.test.ts
git commit -m "feat(tracking): feed live GPS packets into a per-selection breadcrumb trail"
```

---

### Task 3: Decouple Traffic overlay from Map Style; render the trail and traffic on the map

**Files:**
- Modify: `app/(portal)/tracking/utils.tsx`
- Modify: `app/(portal)/tracking/TrackingMap.tsx`
- Test: `__tests__/tracking/TrackingMap.test.tsx`

**Interfaces:**
- Consumes: `TrailPoint` from `@/lib/vehicleTrail` (Task 1); `trails` from `useVehicleLocations` (Task 2, wired in Task 12).
- Produces: `TrackingMapStyle = "standard" | "satellite" | "hybrid"` (mockup shows Traffic as a separate dropdown from Map Style, not a 4th style — see spec §2). `TrackingMap` gains two new optional props: `trail?: TrailPoint[]` (default `[]`) and `showTraffic?: boolean` (default `false`), replacing the old `mapStyle === "traffic"` check.

- [ ] **Step 1: Write the failing test**

This test mocks `react-leaflet`, `leaflet`, and `react-leaflet-cluster` as simple passthrough components so `TrackingMap` can render in jsdom without a real map engine. Every subsequent task/test that imports `TrackingMap.tsx` (directly or via `page.tsx`) reuses this exact mock block.

```typescript
// __tests__/tracking/TrackingMap.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    point: vi.fn((x: number, y: number) => ({ x, y })),
    Icon: { Default: { mergeOptions: vi.fn(), prototype: {} } },
  },
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: (props: any) => (
    <div data-testid="polyline" data-color={props.color} data-points={props.positions?.length ?? 0} />
  ),
  Polygon: () => <div data-testid="polygon" />,
  Circle: () => <div data-testid="circle" />,
  Tooltip: ({ children }: any) => <div data-testid="leaflet-tooltip">{children}</div>,
  useMap: () => ({ fitBounds: vi.fn(), flyTo: vi.fn() }),
}))

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: any) => <div data-testid="cluster-group">{children}</div>,
}))

vi.mock('@/app/(portal)/tracking/components/TrafficOverlay', () => ({
  TrafficOverlay: () => <div data-testid="traffic-overlay" />,
}))

import TrackingMap from '@/app/(portal)/tracking/TrackingMap'
import { MAP_LAYERS, getMarkerSVG, getVehicleIcon } from '@/app/(portal)/tracking/utils'

const baseProps = {
  filteredVehicles: [],
  locations: {},
  selectedVehicle: null,
  setSelectedVehicle: vi.fn(),
  vehicles: [],
  TILE_URL: MAP_LAYERS.standard,
  getMarkerSVG,
  getVehicleIcon,
}

describe('TrackingMap live route trail', () => {
  it('does not render a trail polyline when no vehicle is selected', () => {
    const { queryByTestId } = render(<TrackingMap {...baseProps} trail={[]} />)
    expect(queryByTestId('polyline')).toBeNull()
  })

  it('does not render a trail polyline with fewer than 2 points', () => {
    const selectedVehicle = { id: '42', attributes: { body_type: 'truck' } }
    const { queryByTestId } = render(
      <TrackingMap {...baseProps} selectedVehicle={selectedVehicle} trail={[{ lat: 6.5, lng: 3.4, timestamp: 1 }]} />,
    )
    expect(queryByTestId('polyline')).toBeNull()
  })

  it('renders a solid blue trail polyline for the selected vehicle with 2+ points', () => {
    const selectedVehicle = { id: '42', attributes: { body_type: 'truck' } }
    const trail = [
      { lat: 6.5, lng: 3.4, timestamp: 1 },
      { lat: 6.51, lng: 3.41, timestamp: 2 },
    ]
    const { getByTestId } = render(<TrackingMap {...baseProps} selectedVehicle={selectedVehicle} trail={trail} />)
    const polyline = getByTestId('polyline')
    expect(polyline.dataset.color).toBe('#2563eb')
    expect(polyline.dataset.points).toBe('2')
  })
})

describe('TrackingMap traffic overlay', () => {
  it('is hidden by default', () => {
    const { queryByTestId } = render(<TrackingMap {...baseProps} />)
    expect(queryByTestId('traffic-overlay')).toBeNull()
  })

  it('renders when showTraffic is true and not in replay mode', () => {
    const { getByTestId } = render(<TrackingMap {...baseProps} showTraffic />)
    expect(getByTestId('traffic-overlay')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/TrackingMap.test.tsx`
Expected: FAIL — no trail polyline rendered (prop doesn't exist yet), traffic overlay still gated on `mapStyle === "traffic"` which no longer exists as a style.

- [ ] **Step 3: Update `utils.tsx`**

Replace the `MAP_LAYERS`/`TrackingMapStyle` block (current lines 6–18):

```typescript
export const MAP_LAYERS = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  hybrid: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

export type TrackingMapStyle = keyof typeof MAP_LAYERS;
```

(This drops the old `traffic` tile-URL entry and its comment — traffic is now a separate boolean overlay toggle, not a base map style, matching the mockup's separate "Traffic" and "Map Style" dropdowns.)

- [ ] **Step 4: Update `TrackingMap.tsx`**

Add the import near the top (alongside the other local imports):

```typescript
import type { TrailPoint } from "@/lib/vehicleTrail";
```

Update the `TrackingMapProps` interface — replace `mapStyle?: TrackingMapStyle;` with:

```typescript
  mapStyle?: TrackingMapStyle;
  showTraffic?: boolean;
  trail?: TrailPoint[];
```

Update the function signature's destructured props/defaults — change:

```typescript
  mapStyle = "standard",
```

to:

```typescript
  mapStyle = "standard",
  showTraffic = false,
  trail = [],
```

Replace the traffic-overlay condition:

```typescript
        {mapStyle === "traffic" && !isReplayMode && (
          <TrafficOverlay filteredVehicles={filteredVehicles} locations={locations} />
        )}
```

with:

```typescript
        {showTraffic && !isReplayMode && (
          <TrafficOverlay filteredVehicles={filteredVehicles} locations={locations} />
        )}
```

Add the live trail polyline immediately after that block:

```typescript
        {!isReplayMode && selectedVehicle && trail.length > 1 && (
          <Polyline
            positions={trail.map((p) => [p.lat, p.lng])}
            color="#2563eb"
            weight={4}
            opacity={0.85}
          />
        )}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/TrackingMap.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add app/\(portal\)/tracking/utils.tsx app/\(portal\)/tracking/TrackingMap.tsx __tests__/tracking/TrackingMap.test.tsx
git commit -m "feat(tracking): render live route trail; decouple traffic overlay from map style"
```

---

### Task 4: Map-corner zoom control and bottom status legend

**Files:**
- Create: `app/(portal)/tracking/components/MapZoomControl.tsx`
- Create: `app/(portal)/tracking/components/MapLegend.tsx`
- Test: `__tests__/tracking/MapControls.test.tsx`

**Interfaces:**
- Consumes: `VEHICLE_STATUS`, `VEHICLE_STATUS_ORDER` from `@/lib/vehicleStatus` (existing).
- Produces: `MapZoomControl` (no props — reads `window.leafletMap`, same pattern the old `TrackingControlDeck` used), `MapLegend` (no props).

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/tracking/MapControls.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MapZoomControl } from '@/app/(portal)/tracking/components/MapZoomControl'
import { MapLegend } from '@/app/(portal)/tracking/components/MapLegend'

describe('MapZoomControl', () => {
  it('calls window.leafletMap.zoomIn / zoomOut on click', () => {
    const zoomIn = vi.fn()
    const zoomOut = vi.fn()
    ;(window as any).leafletMap = { zoomIn, zoomOut }

    const { getByLabelText } = render(<MapZoomControl />)
    fireEvent.click(getByLabelText('Zoom in'))
    fireEvent.click(getByLabelText('Zoom out'))

    expect(zoomIn).toHaveBeenCalledTimes(1)
    expect(zoomOut).toHaveBeenCalledTimes(1)
  })
})

describe('MapLegend', () => {
  it('renders one entry per status, in canonical order, with correct labels', () => {
    const { getAllByTestId } = render(<MapLegend />)
    const entries = getAllByTestId('legend-entry')
    expect(entries.map((el) => el.textContent)).toEqual(['Moving', 'Parked', 'Idle', 'Offline', 'Alarm'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/tracking/MapControls.test.tsx`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement `MapZoomControl.tsx`**

```typescript
// app/(portal)/tracking/components/MapZoomControl.tsx
"use client";

import { Plus, Minus } from "lucide-react";

export function MapZoomControl() {
  return (
    <div className="hidden md:flex absolute left-4 top-4 z-30 flex-col bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => (window as any).leafletMap?.zoomIn()}
        aria-label="Zoom in"
        className="h-9 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        onClick={() => (window as any).leafletMap?.zoomOut()}
        aria-label="Zoom out"
        className="h-9 w-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Implement `MapLegend.tsx`**

```typescript
// app/(portal)/tracking/components/MapLegend.tsx
"use client";

import { VEHICLE_STATUS, VEHICLE_STATUS_ORDER } from "@/lib/vehicleStatus";
import { cn } from "@/lib/utils";

export function MapLegend() {
  return (
    <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-30 items-center gap-4 bg-white border border-slate-200 rounded-full shadow-lg px-5 py-2.5 pointer-events-none">
      {VEHICLE_STATUS_ORDER.map((key) => {
        const cfg = VEHICLE_STATUS[key];
        return (
          <div key={key} data-testid="legend-entry" className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/tracking/MapControls.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add app/\(portal\)/tracking/components/MapZoomControl.tsx app/\(portal\)/tracking/components/MapLegend.tsx __tests__/tracking/MapControls.test.tsx
git commit -m "feat(tracking): add map-corner zoom control and status legend pill"
```

---

### Task 5: `TrackingTopBar` (replaces `TrackingControlDeck`)

**Files:**
- Create: `app/(portal)/tracking/components/TrackingTopBar.tsx`
- Delete: `app/(portal)/tracking/components/TrackingControlDeck.tsx`
- Test: `__tests__/tracking/TrackingTopBar.test.tsx`

**Interfaces:**
- Consumes: `TrackingMapStyle` from `@/app/(portal)/tracking/utils` (Task 3); `DropdownMenu*` from `@/components/ui/dropdown-menu`; `Sheet*` from `@/components/ui/sheet`.
- Produces:

```typescript
interface TrackingTopBarProps {
  locationSearch: string;
  setLocationSearch: (v: string) => void;
  onLocationSearchSubmit: () => void;
  mapStyle: TrackingMapStyle;
  setMapStyle: (s: TrackingMapStyle) => void;
  showTraffic: boolean;
  setShowTraffic: (v: boolean) => void;
  showGeofences: boolean;
  setShowGeofences: (v: boolean) => void;
  viewMode: "all" | "focused";
  setViewMode: (m: "all" | "focused") => void;
  selectedClusterIds: string[];
  onOpenClusterModal: () => void;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}
```

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tracking/TrackingTopBar.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { TrackingTopBar } from '@/app/(portal)/tracking/components/TrackingTopBar'

const baseProps = {
  locationSearch: '',
  setLocationSearch: vi.fn(),
  onLocationSearchSubmit: vi.fn(),
  mapStyle: 'standard' as const,
  setMapStyle: vi.fn(),
  showTraffic: false,
  setShowTraffic: vi.fn(),
  showGeofences: false,
  setShowGeofences: vi.fn(),
  viewMode: 'all' as const,
  setViewMode: vi.fn(),
  selectedClusterIds: [],
  onOpenClusterModal: vi.fn(),
  onRefresh: vi.fn(),
  isFullscreen: false,
  onToggleFullscreen: vi.fn(),
}

describe('TrackingTopBar', () => {
  it('renders the location search input with the mockup placeholder', () => {
    render(<TrackingTopBar {...baseProps} />)
    expect(screen.getByPlaceholderText('Search location / address')).toBeInTheDocument()
  })

  it('calls setLocationSearch as the user types and submits on Enter', () => {
    render(<TrackingTopBar {...baseProps} />)
    const input = screen.getByPlaceholderText('Search location / address')
    fireEvent.change(input, { target: { value: 'Ikeja' } })
    expect(baseProps.setLocationSearch).toHaveBeenCalledWith('Ikeja')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(baseProps.onLocationSearchSubmit).toHaveBeenCalled()
  })

  it('calls onRefresh when the refresh button is clicked', () => {
    render(<TrackingTopBar {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Re-sync fleet data'))
    expect(baseProps.onRefresh).toHaveBeenCalled()
  })

  it('calls onToggleFullscreen when the fullscreen button is clicked', () => {
    render(<TrackingTopBar {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Fullscreen'))
    expect(baseProps.onToggleFullscreen).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/TrackingTopBar.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `TrackingTopBar.tsx`**

```typescript
// app/(portal)/tracking/components/TrackingTopBar.tsx
"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  Map as MapIcon,
  Satellite,
  Layers,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  Maximize,
  Minimize,
  Crosshair,
  Menu,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { TrackingMapStyle } from "../utils";

const MAP_STYLE_LABEL: Record<TrackingMapStyle, string> = {
  standard: "Street",
  satellite: "Satellite",
  hybrid: "Hybrid",
};

const MAP_STYLE_ICON: Record<TrackingMapStyle, typeof MapIcon> = {
  standard: MapIcon,
  satellite: Satellite,
  hybrid: Layers,
};

interface TrackingTopBarProps {
  locationSearch: string;
  setLocationSearch: (v: string) => void;
  onLocationSearchSubmit: () => void;
  mapStyle: TrackingMapStyle;
  setMapStyle: (s: TrackingMapStyle) => void;
  showTraffic: boolean;
  setShowTraffic: (v: boolean) => void;
  showGeofences: boolean;
  setShowGeofences: (v: boolean) => void;
  viewMode: "all" | "focused";
  setViewMode: (m: "all" | "focused") => void;
  selectedClusterIds: string[];
  onOpenClusterModal: () => void;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function TrackingTopBar({
  locationSearch,
  setLocationSearch,
  onLocationSearchSubmit,
  mapStyle,
  setMapStyle,
  showTraffic,
  setShowTraffic,
  showGeofences,
  setShowGeofences,
  viewMode,
  setViewMode,
  selectedClusterIds,
  onOpenClusterModal,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
}: TrackingTopBarProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const CurrentStyleIcon = MAP_STYLE_ICON[mapStyle];

  const iconButtonClass =
    "h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors";
  const activeIconButtonClass = "bg-blue-50 text-blue-600 hover:bg-blue-100";

  return (
    <div className="h-14 w-full flex items-center gap-3 px-4 border-b border-slate-200 bg-white">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={locationSearch}
          onChange={(e) => setLocationSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onLocationSearchSubmit();
          }}
          placeholder="Search location / address"
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
        />
      </div>

      {/* Desktop controls */}
      <div className="hidden lg:flex items-center gap-2 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 px-3 rounded-xl border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <Radio className={cn("h-4 w-4", showTraffic ? "text-blue-600" : "text-slate-400")} />
              Traffic
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem checked={showTraffic} onCheckedChange={setShowTraffic}>
              Show fleet-speed traffic
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 px-3 rounded-xl border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <CurrentStyleIcon className="h-4 w-4 text-slate-500" />
              Map Style
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Map Style</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={mapStyle} onValueChange={(v) => setMapStyle(v as TrackingMapStyle)}>
              {(Object.keys(MAP_STYLE_LABEL) as TrackingMapStyle[]).map((style) => (
                <DropdownMenuRadioItem key={style} value={style}>
                  {MAP_STYLE_LABEL[style]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => setShowGeofences(!showGeofences)}
          aria-label="Toggle layers"
          className={cn(iconButtonClass, showGeofences && activeIconButtonClass)}
        >
          <Layers className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        <button
          onClick={() => setViewMode(viewMode === "all" ? "focused" : "all")}
          aria-label="Toggle focus mode"
          className={cn(iconButtonClass, viewMode === "focused" && activeIconButtonClass)}
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          onClick={onOpenClusterModal}
          aria-label="Filter by cluster"
          className={cn(iconButtonClass, selectedClusterIds.length > 0 && activeIconButtonClass)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button onClick={onRefresh} aria-label="Re-sync fleet data" className={iconButtonClass}>
          <RefreshCw className="h-4 w-4" />
        </button>
        <button onClick={onToggleFullscreen} aria-label="Fullscreen" className={iconButtonClass}>
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile/tablet: collapse everything but search into one filters sheet */}
      <button
        onClick={() => setMobileFiltersOpen(true)}
        aria-label="Map filters"
        className="lg:hidden h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600"
      >
        <Menu className="h-4 w-4" />
      </button>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl lg:hidden">
          <SheetHeader>
            <SheetTitle>Map Filters</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Map Style</p>
              <div className="flex gap-2">
                {(Object.keys(MAP_STYLE_LABEL) as TrackingMapStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setMapStyle(style)}
                    className={cn(
                      "flex-1 h-10 rounded-xl border text-sm font-medium",
                      mapStyle === style
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-200 text-slate-600",
                    )}
                  >
                    {MAP_STYLE_LABEL[style]}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700 flex items-center gap-2">
                <Radio className="h-4 w-4" /> Traffic
              </span>
              <input
                type="checkbox"
                checked={showTraffic}
                onChange={(e) => setShowTraffic(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700 flex items-center gap-2">
                <Layers className="h-4 w-4" /> Geofence Layer
              </span>
              <input
                type="checkbox"
                checked={showGeofences}
                onChange={(e) => setShowGeofences(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <button
              onClick={onRefresh}
              className="w-full h-10 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-sm font-medium text-slate-700"
            >
              <RefreshCw className="h-4 w-4" /> Re-sync fleet data
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 4: Delete `TrackingControlDeck.tsx`**

```bash
git rm app/\(portal\)/tracking/components/TrackingControlDeck.tsx
```

- [ ] **Step 5: Run test and lint to verify it passes**

Run: `npx vitest run __tests__/tracking/TrackingTopBar.test.tsx`
Expected: PASS (4 tests)

Run: `npx eslint app/\(portal\)/tracking/components/TrackingTopBar.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(portal\)/tracking/components/TrackingTopBar.tsx __tests__/tracking/TrackingTopBar.test.tsx
git commit -m "feat(tracking): add docked top toolbar with Traffic/Map Style dropdowns, retire floating control deck"
```

---

### Task 6: `StatusFilters` tab-strip restyle

**Files:**
- Modify: `app/(portal)/tracking/components/StatusFilters.tsx`
- Test: `__tests__/tracking/StatusFilters.test.tsx`

**Interfaces:**
- No prop or exported-type changes — `StatusFilter` type and `StatusFiltersProps` are unchanged. Only internal markup/classNames change, plus label format changes from `"Moving (178)"` to `"Moving 178"` to match the mockup.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tracking/StatusFilters.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusFilters } from '@/app/(portal)/tracking/components/StatusFilters'

const vehicles = [
  { id: '1', attributes: {} },
  { id: '2', attributes: {} },
  { id: '3', attributes: {} },
] as any

const locations = {
  '1': { status: 'in_transit', is_online: true },
  '2': { status: 'idle', is_online: true },
  '3': { is_online: false },
}

describe('StatusFilters', () => {
  it('renders mockup-style "Label Count" tabs (no parentheses)', () => {
    render(
      <StatusFilters vehicles={vehicles} locations={locations} statusFilter="all" onStatusChange={vi.fn()} />,
    )
    expect(screen.getByText('All 3')).toBeInTheDocument()
    expect(screen.getByText('Moving 1')).toBeInTheDocument()
    expect(screen.getByText('Idle 1')).toBeInTheDocument()
    expect(screen.getByText('Offline 1')).toBeInTheDocument()
  })

  it('calls onStatusChange with the clicked filter key', () => {
    const onStatusChange = vi.fn()
    render(
      <StatusFilters vehicles={vehicles} locations={locations} statusFilter="all" onStatusChange={onStatusChange} />,
    )
    fireEvent.click(screen.getByText('Moving 1'))
    expect(onStatusChange).toHaveBeenCalledWith('moving')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/StatusFilters.test.tsx`
Expected: FAIL — current text is `"Moving (1)"`, not `"Moving 1"`.

- [ ] **Step 3: Update `StatusFilters.tsx`**

Replace the whole file:

```typescript
// app/(portal)/tracking/components/StatusFilters.tsx
"use client";

import { Vehicle } from "@/types";
import { cn } from "@/lib/utils";
import { VEHICLE_STATUS } from "@/lib/vehicleStatus";

export type StatusFilter =
  | "all"
  | "moving"
  | "idle"
  | "parked"
  | "online"
  | "offline"
  | "alarm";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "moving", label: "Moving" },
  { key: "idle", label: "Idle" },
  { key: "parked", label: "Parked" },
  { key: "offline", label: "Offline" },
  { key: "online", label: "Online" },
  { key: "alarm", label: "Alarm" },
] as const;

const ACTIVE_TEXT: Record<StatusFilter, string> = {
  moving: VEHICLE_STATUS.moving.text,
  idle: VEHICLE_STATUS.idle.text,
  parked: VEHICLE_STATUS.parked.text,
  offline: VEHICLE_STATUS.offline.text,
  alarm: VEHICLE_STATUS.alarm.text,
  online: "text-blue-600",
  all: "text-slate-900",
};

interface StatusFiltersProps {
  vehicles: Vehicle[];
  locations: Record<string, any>;
  alarmState?: Record<string, boolean>;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
}

export function StatusFilters({
  vehicles,
  locations,
  alarmState = {},
  statusFilter,
  onStatusChange,
}: StatusFiltersProps) {
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar border-b border-slate-100">
      {FILTERS.map(({ key: s, label }) => {
        const count =
          s === "all"
            ? vehicles.length
            : vehicles.filter((v: Vehicle) => {
                const loc = locations[v.id];
                if (s === "moving") return loc?.status === "in_transit";
                if (s === "idle") return loc?.status === "idle";
                if (s === "parked") return loc?.status === "parked";
                if (s === "online") return loc?.is_online === true;
                if (s === "offline") return loc?.is_online === false || !loc;
                if (s === "alarm") return alarmState[v.id] === true;
                return false;
              }).length;

        const isActive = statusFilter === s;

        return (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={cn(
              "shrink-0 pb-2 pt-1 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
              isActive
                ? cn(ACTIVE_TEXT[s], "border-current")
                : "text-slate-400 border-transparent hover:text-slate-600",
            )}
          >
            {label} {count}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/StatusFilters.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/\(portal\)/tracking/components/StatusFilters.tsx __tests__/tracking/StatusFilters.test.tsx
git commit -m "style(tracking): restyle status filters as an underline tab strip matching the mockup"
```

---

### Task 7: `VehicleListItem` denser row restyle

**Files:**
- Modify: `app/(portal)/tracking/components/VehicleListItem.tsx`
- Test: `__tests__/tracking/VehicleListItem.test.tsx`

**Interfaces:**
- No prop changes (`VehicleListItemProps` unchanged). Only internal markup/classNames change to a flatter, denser row.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tracking/VehicleListItem.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VehicleListItem } from '@/app/(portal)/tracking/components/VehicleListItem'

const vehicle = {
  id: '1',
  attributes: { registration_number: 'ABC-123-XD', make: 'Toyota', model: 'Hilux' },
} as any

describe('VehicleListItem', () => {
  it('renders plate, status label, and speed', () => {
    const loc = { status: 'in_transit', is_online: true, speed: 58, address: 'Ikeja, Lagos' }
    render(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
    expect(screen.getByText('Moving')).toBeInTheDocument()
    expect(screen.getByText(/58/)).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<VehicleListItem vehicle={vehicle} loc={null} isSelected={false} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('marks the row aria-pressed when selected', () => {
    render(<VehicleListItem vehicle={vehicle} loc={null} isSelected onSelect={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
```

- [ ] **Step 2: Run test to verify it fails or passes incidentally**

Run: `npx vitest run __tests__/tracking/VehicleListItem.test.tsx`
Expected: The first two assertions likely already pass against the current implementation (it already renders plate/status/speed); this task's job is the restyle, not new behavior — this test's real purpose is to lock in the same observable behavior through the restyle. Confirm PASS before continuing (if it fails, note which assertion and adjust the query, e.g. the current status text casing, before proceeding — do not change the test to match broken behavior).

- [ ] **Step 3: Update `VehicleListItem.tsx`**

Replace the file body (imports unchanged) — replace everything from the `return (` statement onward:

```typescript
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`${vehicle.attributes.registration_number}, ${statusCfg.label}, ${loc?.speed ?? 0} km/h`}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
        isSelected ? "bg-blue-50" : "hover:bg-slate-50",
      )}
    >
      <div className="h-9 w-9 rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-slate-100 text-slate-400">
        {vehicle.attributes.image ? (
          <img src={vehicle.attributes.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Truck className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-900 truncate">
            {vehicle.attributes.registration_number}
          </h4>
          <span className={cn("text-[11px] font-semibold shrink-0", statusCfg.text)}>{statusCfg.label}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[11px] text-slate-400 truncate">
            {loc?.address || `${vehicle.attributes.make} ${vehicle.attributes.model}`}
          </p>
          <span className="text-[11px] text-slate-400 shrink-0">
            {loc?.speed ?? 0} km/h
          </span>
        </div>
        <p className="text-[10px] text-slate-300 mt-0.5">{lastUpdate}</p>
      </div>
    </div>
  );
}
```

Note: `hasActiveAlarm`, `fuelPct`, `fuelL` are still computed above this block (unused-var lint would flag `fuelPct`/`fuelL` if dropped from render — either keep a small fuel readout inline next to speed, e.g. append `· {fuelPct}%` when not null, or remove their computation along with the JSX). Keep the fuel display: change the speed line to:

```typescript
          <span className="text-[11px] text-slate-400 shrink-0">
            {fuelPct != null ? `${fuelPct}% · ` : ""}{loc?.speed ?? 0} km/h
          </span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/VehicleListItem.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/\(portal\)/tracking/components/VehicleListItem.tsx __tests__/tracking/VehicleListItem.test.tsx
git commit -m "style(tracking): restyle asset list rows to a denser, flatter treatment"
```

---

### Task 8: `TrackingSidebar` docked panel restyle

**Files:**
- Modify: `app/(portal)/tracking/components/TrackingSidebar.tsx`
- Test: `__tests__/tracking/TrackingSidebar.test.tsx`

**Interfaces:**
- Consumes: restyled `StatusFilters` (Task 6), restyled `VehicleListItem` (Task 7).
- No prop changes to `TrackingSidebarProps`. The panel goes from an `absolute`-positioned floating rounded card to a `static`, flush, full-height docked column — it becomes a plain block, so its **parent** (`page.tsx`, Task 12) is responsible for grid placement; this component itself just fills `h-full w-full` of whatever container it's placed in.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tracking/TrackingSidebar.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrackingSidebar } from '@/app/(portal)/tracking/components/TrackingSidebar'

vi.mock('@/store/trackingUiStore', () => ({
  useTrackingUiStore: () => ({ isAssetListCollapsed: false, toggleAssetList: vi.fn() }),
}))

const vehicles = [
  { id: '1', attributes: { registration_number: 'ABC-123-XD' } },
] as any

const baseProps = {
  viewMode: 'all' as const,
  vehicles,
  filteredVehicles: vehicles,
  locations: { '1': { status: 'in_transit', is_online: true, speed: 58 } },
  selectedVehicleId: null,
  setSelectedVehicleId: vi.fn(),
  isLoadingVehicles: false,
  statusFilter: 'all' as const,
  setStatusFilter: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  ongoingTripsCount: 0,
  ongoingTripsData: [],
  setIsReplayOpen: vi.fn(),
  isLoadingTrips: false,
}

describe('TrackingSidebar', () => {
  it('renders the docked panel as a static block filling its container (no fixed/absolute positioning)', () => {
    const { container } = render(<TrackingSidebar {...baseProps} />)
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toMatch(/\babsolute\b/)
    expect(root.className).toMatch(/\bh-full\b/)
    expect(root.className).toMatch(/\bw-full\b/)
  })

  it('renders the asset count badge and vehicle rows', () => {
    render(<TrackingSidebar {...baseProps} />)
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/TrackingSidebar.test.tsx`
Expected: FAIL — current root has `absolute left-6 top-6 bottom-6 ...` classes.

- [ ] **Step 3: Update `TrackingSidebar.tsx`**

Replace the collapsed-state early return block:

```typescript
  if (isAssetListCollapsed) {
    return (
      <div className="hidden md:flex h-full flex-col pointer-events-none">
        <button
          onClick={toggleAssetList}
          aria-label="Expand asset list"
          className="pointer-events-auto self-start mt-2 h-12 w-8 rounded-r-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }
```

Replace the main return block's outer wrapper and inner panel (everything from `return (` to the end of the file):

```typescript
  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">
            {viewMode === "all" ? "Assets" : "Active Trips"}
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            ({viewMode === "all" ? vehicles.length : ongoingTripsCount})
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={viewMode === "all" ? "Search vehicle" : "Search trips"}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === "all" ? (
          <>
            <div className="px-4 pt-2">
              <StatusFilters
                vehicles={vehicles}
                locations={locations}
                alarmState={alarmState}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
              />
            </div>

            {isLoadingVehicles ? (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {Array.from({ length: 8 }).map((_, i) => (
                  <AssetCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="p-8 text-center">
                  <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-400">
                    {vehicles.length === 0 ? "No assets yet" : "No assets match your filters"}
                  </p>
                </div>
              </div>
            ) : shouldVirtualize ? (
              <div ref={listParentRef} className="flex-1 overflow-y-auto no-scrollbar">
                <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => (
                    <div
                      key={filteredVehicles[virtualRow.index].id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {renderCard(filteredVehicles[virtualRow.index])}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {filteredVehicles.map(renderCard)}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {isLoadingTrips ? (
              Array.from({ length: 6 }).map((_, i) => <AssetCardSkeleton key={i} />)
            ) : ongoingTripsData.length === 0 ? (
              <div className="p-8 text-center">
                <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-400">No ongoing missions</p>
              </div>
            ) : (
              ongoingTripsData.map((trip) => (
                <TripListItem
                  key={trip.id}
                  trip={trip}
                  isSelected={String(selectedVehicleId) === String(trip.vehicleId)}
                  locations={locations}
                  onSelect={() => {
                    if (trip.vehicleId) {
                      setSelectedVehicleId(trip.vehicleId);
                      setIsReplayOpen(true);
                    }
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

Note: `renderCard`, `virtualizer`, `listParentRef`, `shouldVirtualize`, `toggleAssetList` and the other hook/derived-value declarations earlier in the file are unchanged — only the two `return` JSX blocks above are replaced. The collapse toggle button that used to sit inside the floating card (`absolute -right-3 top-4 ...`) is dropped, since a docked panel has no room for an edge-floating collapse affordance in the new layout; `toggleAssetList`/`isAssetListCollapsed` remain wired through the `page.tsx` grid (Task 12) via the collapsed-state early return above, which is unchanged in behavior — it's now just non-floating too.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/TrackingSidebar.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/\(portal\)/tracking/components/TrackingSidebar.tsx __tests__/tracking/TrackingSidebar.test.tsx
git commit -m "style(tracking): dock the asset sidebar as a flush panel instead of a floating card"
```

---

### Task 9: `AssetPanel` hero-photo header + responsive dual layout

**Files:**
- Modify: `app/(portal)/tracking/components/AssetPanel.tsx`
- Test: `__tests__/tracking/AssetPanel.test.tsx`

**Interfaces:**
- No prop changes to `AssetPanelProps`. New responsive contract: at `<lg` the panel keeps today's `fixed` bottom-sheet behavior (unchanged); at `lg+` it becomes `static h-full w-full` so it participates as a normal grid cell in `page.tsx` (Task 12) instead of a `fixed` slide-in overlay — this is what lets the map reflow when the panel opens/closes, per spec §5/§1.
- Header gains a hero vehicle photo using the existing `vehicle.attributes.image` field (same field `VehicleListItem` already reads), with a generic truck-silhouette fallback.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tracking/AssetPanel.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssetPanel } from '@/app/(portal)/tracking/components/AssetPanel'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/trackingUiStore', () => ({
  useTrackingUiStore: () => ({
    activeTab: 'details',
    setActiveTab: vi.fn(),
    isAssetPanelCollapsed: false,
    toggleAssetPanel: vi.fn(),
  }),
}))
vi.mock('@/lib/api/drivers', () => ({ getDriverById: vi.fn().mockResolvedValue({ data: { attributes: {} } }) }))
vi.mock('@/lib/api/trips', () => ({ getActiveTripForVehicle: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/api/tracking', () => ({ getDeviceStatus: vi.fn().mockResolvedValue(null) }))
vi.mock('@/hooks/useResolvedVehicleTelemetry', () => ({
  useResolvedVehicleTelemetry: () => ({ fuel: null, batteryV: null, satellites: null, engineHours: null, address: '' }),
}))

const vehicle = {
  id: '1',
  attributes: { make: 'Toyota', model: 'Hilux', registration_number: 'ABC-123-XD', image: null },
  relationships: {},
} as any

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('AssetPanel', () => {
  it('is a static, full-size block at desktop widths (no fixed positioning class outside the mobile breakpoint)', () => {
    const { container } = render(
      <AssetPanel
        isOpen
        onClose={vi.fn()}
        selectedVehicle={vehicle}
        locations={{}}
        vehicles={[vehicle]}
        onLiveTrack={vi.fn()}
        onPlayback={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/lg:static/)
    expect(root.className).toMatch(/lg:h-full/)
    expect(root.className).toMatch(/lg:w-full/)
  })

  it('renders a fallback truck icon when the vehicle has no photo', () => {
    render(
      <AssetPanel
        isOpen
        onClose={vi.fn()}
        selectedVehicle={vehicle}
        locations={{}}
        vehicles={[vehicle]}
        onLiveTrack={vi.fn()}
        onPlayback={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByTestId('asset-panel-photo-fallback')).toBeInTheDocument()
  })

  it('renders the vehicle photo when vehicle.attributes.image is set', () => {
    const vehicleWithPhoto = { ...vehicle, attributes: { ...vehicle.attributes, image: '/photo.jpg' } }
    render(
      <AssetPanel
        isOpen
        onClose={vi.fn()}
        selectedVehicle={vehicleWithPhoto}
        locations={{}}
        vehicles={[vehicleWithPhoto]}
        onLiveTrack={vi.fn()}
        onPlayback={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByAltText('Toyota Hilux')).toHaveAttribute('src', '/photo.jpg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/AssetPanel.test.tsx`
Expected: FAIL — current root has `fixed ... md:inset-y-0 md:right-0 ...` (no `lg:static`), and there is no `data-testid="asset-panel-photo-fallback"` or vehicle-photo `<img>`.

- [ ] **Step 3: Update `AssetPanel.tsx`**

Replace the root wrapper's `className` (the `cn(...)` call inside the outer `<div ... role="complementary">`):

```typescript
      className={cn(
        "bg-white shadow-2xl flex flex-col",
        // Mobile/tablet (<lg): fixed bottom sheet, unchanged behavior
        "fixed inset-x-0 bottom-0 top-auto h-[75vh] w-full rounded-t-3xl z-50 transition-transform duration-500",
        isOpen ? "translate-y-0" : "translate-y-full",
        // Desktop (lg+): static grid cell so the map column can reflow around it
        "lg:static lg:translate-y-0 lg:inset-auto lg:h-full lg:w-full lg:rounded-none lg:z-auto lg:shadow-none lg:border-l lg:border-slate-200",
      )}
```

Replace the header block (`{/* Header */}` through its closing `</div>`) with a hero-photo header:

```typescript
      {/* Header */}
      <div className="relative border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <span
            className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border", statusCfg.badge)}
          >
            {statusCfg.label}
          </span>
          <button
            onClick={toggleAssetPanel}
            aria-label="Collapse asset panel"
            className="hidden md:flex lg:hidden h-8 w-8 rounded-full bg-white/80 hover:bg-white items-center justify-center text-slate-400 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close asset panel"
            className="h-8 w-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-32 flex items-center justify-center bg-white">
          {selectedVehicle.attributes.image ? (
            <img
              src={selectedVehicle.attributes.image}
              alt={`${selectedVehicle.attributes.make} ${selectedVehicle.attributes.model}`}
              className="h-full object-contain"
            />
          ) : (
            <div data-testid="asset-panel-photo-fallback" className="h-20 w-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
              <Truck className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="px-6 pb-4">
          <h2 className="text-sm font-bold text-slate-900 truncate">
            {selectedVehicle.attributes.make} {selectedVehicle.attributes.model}
          </h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{plate}</p>
        </div>
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/AssetPanel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full tracking suite to check for regressions in the quick-actions/tabs/More menu, which are untouched**

Run: `npx vitest run __tests__/tracking`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/\(portal\)/tracking/components/AssetPanel.tsx __tests__/tracking/AssetPanel.test.tsx
git commit -m "style(tracking): hero vehicle photo header on the asset panel; dock panel at desktop widths"
```

---

### Task 10: `BottomCards` docked strip restyle

**Files:**
- Modify: `app/(portal)/tracking/components/BottomCards.tsx`
- Test: `__tests__/tracking/BottomCards.test.tsx`

**Interfaces:**
- No prop changes to `BottomCardsProps`. Only the `CardShell` internal styling changes from a floating rounded card to a flatter docked card (the outer positioning/container is handled by `page.tsx` in Task 12, not by this component).

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tracking/BottomCards.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BottomCards } from '@/app/(portal)/tracking/components/BottomCards'

vi.mock('@/lib/api/trips', () => ({ getActiveTripForVehicle: vi.fn().mockResolvedValue(null) }))

const vehicle = { id: '1', attributes: {} } as any
const loc = { speed: 58, heading: 45, ignition: true, address: 'Ikeja, Lagos', is_online: true, satellites: 9 }

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('BottomCards', () => {
  it('renders the three mockup card titles', () => {
    render(<BottomCards selectedVehicle={vehicle} loc={loc} />, { wrapper: Wrapper })
    expect(screen.getByText('Current Trip')).toBeInTheDocument()
    expect(screen.getByText('Location & Movement')).toBeInTheDocument()
    expect(screen.getByText('Device Status')).toBeInTheDocument()
  })

  it('renders live speed and address in the Location & Movement card', () => {
    render(<BottomCards selectedVehicle={vehicle} loc={loc} />, { wrapper: Wrapper })
    expect(screen.getByText('58 km/h')).toBeInTheDocument()
    expect(screen.getByText('Ikeja, Lagos')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails or passes incidentally**

Run: `npx vitest run __tests__/tracking/BottomCards.test.tsx`
Expected: This should already PASS against the current implementation (same data, same text) — the point of this test is to lock in identical output through the restyle. Confirm PASS now, before touching the component, so the restyle in Step 3 has a real regression guard.

- [ ] **Step 3: Update `BottomCards.tsx`**

Replace the `CardShell` function:

```typescript
function CardShell({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 min-w-56 shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}
```

Replace the `Row` function:

```typescript
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <span className="text-[11px] font-semibold text-slate-800">{value ?? "—"}</span>
    </div>
  );
}
```

Replace the outer wrapper className in the returned JSX:

```typescript
    <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar">
```

(All other JSX — the three `<CardShell>` blocks and the `<AIInsightsCard>` — is unchanged.)

- [ ] **Step 4: Run test to verify it still passes**

Run: `npx vitest run __tests__/tracking/BottomCards.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/\(portal\)/tracking/components/BottomCards.tsx __tests__/tracking/BottomCards.test.tsx
git commit -m "style(tracking): flatten bottom stat cards to match the docked mockup strip"
```

---

### Task 11: `MobileAssetSheet` restyle

**Files:**
- Modify: `app/(portal)/tracking/components/MobileAssetSheet.tsx`
- Test: `__tests__/tracking/MobileAssetSheet.test.tsx`

**Interfaces:**
- No prop changes to `MobileAssetSheetProps`. Consumes the already-restyled `StatusFilters` (Task 6) and `VehicleListItem` (Task 7) — most of the visual change is automatic; this task updates the sheet's own search-input styling to match and confirms the automatic pickup renders correctly.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tracking/MobileAssetSheet.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileAssetSheet } from '@/app/(portal)/tracking/components/MobileAssetSheet'

const vehicles = [
  { id: '1', attributes: { registration_number: 'ABC-123-XD' } },
] as any

const baseProps = {
  vehicles,
  filteredVehicles: vehicles,
  locations: { '1': { status: 'in_transit', is_online: true, speed: 58 } },
  alarmState: {},
  selectedVehicleId: null,
  setSelectedVehicleId: vi.fn(),
  isLoadingVehicles: false,
  statusFilter: 'all' as const,
  setStatusFilter: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
}

describe('MobileAssetSheet', () => {
  it('opens the sheet and shows the restyled search input placeholder', () => {
    render(<MobileAssetSheet {...baseProps} />)
    fireEvent.click(screen.getByText(/Assets \(1\)/))
    expect(screen.getByPlaceholderText('Search vehicle')).toBeInTheDocument()
  })

  it('lists vehicles using the restyled row', () => {
    render(<MobileAssetSheet {...baseProps} />)
    fireEvent.click(screen.getByText(/Assets \(1\)/))
    expect(screen.getByText('ABC-123-XD')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/MobileAssetSheet.test.tsx`
Expected: FAIL — current placeholder text is `"SEARCH ASSETS..."`, not `"Search vehicle"`.

- [ ] **Step 3: Update `MobileAssetSheet.tsx`**

Replace the search input block inside `SheetContent`:

```typescript
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vehicle"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
```

Replace the "no results" block's className (from `bg-slate-50 rounded-3xl border border-dashed border-slate-200` to a flatter treatment matching Task 8):

```typescript
                <div className="p-8 text-center">
                  <Navigation className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-400">
                    No assets match your filters
                  </p>
                </div>
```

Replace the `space-y-2` wrapper around the vehicle list (`<div className="flex-1 overflow-y-auto space-y-2 pb-4">`) with a flush list (rows now carry their own `border-b` divider from the restyled `VehicleListItem`, so `space-y-2` — which adds gaps that no longer suit a flush-row list — is removed):

```typescript
            <div className="flex-1 overflow-y-auto pb-4">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/MobileAssetSheet.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/\(portal\)/tracking/components/MobileAssetSheet.tsx __tests__/tracking/MobileAssetSheet.test.tsx
git commit -m "style(tracking): align mobile asset sheet search/list styling with the desktop restyle"
```

---

### Task 12: `page.tsx` grid shell — wire everything together

**Files:**
- Modify: `app/(portal)/tracking/page.tsx`
- Delete: `app/(portal)/tracking/components/SelectedVehicleBar.tsx`
- Test: `__tests__/tracking/page.test.tsx`

**Interfaces:**
- Consumes everything from Tasks 1–11: `useVehicleLocations`'s new `trails` (Task 2), `TrackingMap`'s new `trail`/`showTraffic` props (Task 3), `MapZoomControl`/`MapLegend` (Task 4), `TrackingTopBar` (Task 5), the restyled `TrackingSidebar`/`AssetPanel`/`BottomCards`/`MobileAssetSheet` (Tasks 8–11), and the narrowed `TrackingMapStyle` (Task 3).
- Removes: `SelectedVehicleBar` usage and file, `TrackingControlDeck` usage (already deleted in Task 5).

- [ ] **Step 1: Write the failing test**

This reuses the `react-leaflet`/`leaflet`/`react-leaflet-cluster` mock pattern from Task 3, plus mocks every data/hook dependency `page.tsx` calls.

```typescript
// __tests__/tracking/page.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})), point: vi.fn((x: number, y: number) => ({ x, y })) },
}))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: any) => <div>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  Polyline: () => null,
  Polygon: () => null,
  Circle: () => null,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn(), flyTo: vi.fn() }),
}))
vi.mock('react-leaflet-cluster', () => ({ default: ({ children }: any) => <div>{children}</div> }))

vi.mock('@/lib/api/vehicles', () => ({
  getVehiclesBatched: vi.fn().mockResolvedValue([
    { id: '1', attributes: { registration_number: 'ABC-123-XD', make: 'Toyota', model: 'Hilux' }, relationships: {} },
  ]),
}))
vi.mock('@/lib/api/trips', () => ({
  getTrips: vi.fn().mockResolvedValue({ data: { trips: [] } }),
  getActiveTripForVehicle: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/api/settings', () => ({ getClusters: vi.fn().mockResolvedValue({ data: { clusters: [] } }) }))
vi.mock('@/lib/api/geofencing', () => ({ getGeofences: vi.fn().mockResolvedValue({ data: { geofences: [] } }) }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ token: 'tok', organization: { id: 'org-1' } }) }))
vi.mock('@/store/uiStore', () => ({ useUIStore: () => ({ setSidebarCollapsed: vi.fn() }) }))
vi.mock('@/hooks/useEcho', () => ({ useEcho: () => ({ subscribePrivate: vi.fn() }) }))
vi.mock('@/hooks/useConnectionStatus', () => ({ useConnectionStatus: () => ({ status: 'connected' }) }))
vi.mock('@/store/trackingUiStore', () => ({
  useTrackingUiStore: () => ({
    setActiveTab: vi.fn(),
    activeTab: 'details',
    isAssetPanelCollapsed: false,
    toggleAssetPanel: vi.fn(),
    isAssetListCollapsed: false,
    toggleAssetList: vi.fn(),
  }),
}))

import TrackingPage from '@/app/(portal)/tracking/page'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('TrackingPage grid shell', () => {
  it('renders the top toolbar search input and the asset list', async () => {
    render(<TrackingPage />, { wrapper: Wrapper })
    expect(screen.getByPlaceholderText('Search location / address')).toBeInTheDocument()
    expect(await screen.findByText('ABC-123-XD')).toBeInTheDocument()
  })

  it('does not render the removed floating SelectedVehicleBar quick-action pill', async () => {
    render(<TrackingPage />, { wrapper: Wrapper })
    await screen.findByText('ABC-123-XD')
    expect(screen.queryByText('Velocity')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/page.test.tsx`
Expected: FAIL — `page.tsx` still imports the deleted `TrackingControlDeck` (breaks the build) and has no `"Search location / address"` input yet.

- [ ] **Step 3: Rewrite `page.tsx`**

Replace the whole file:

```typescript
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Vehicle, Trip } from "@/types";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useEcho } from "@/hooks/useEcho";
import * as api from "@/lib/api/vehicles";
import * as tripApi from "@/lib/api/trips";
import { getClusters } from "@/lib/api/settings";
import { getGeofences } from "@/lib/api/geofencing";
import TrackingMap from "./TrackingMap";
import { AssetPanel } from "./components/AssetPanel";
import { TripPlaybackTimeline } from "@/components/live/TripPlaybackTimeline";
import { MAP_LAYERS, getMarkerSVG, getVehicleIcon, type TrackingMapStyle } from "./utils";
import { useVehicleLocations } from "./hooks/useVehicleLocations";
import { usePlaybackData } from "./hooks/usePlaybackData";
import { TrackingSidebar } from "./components/TrackingSidebar";
import { TrackingTopBar } from "./components/TrackingTopBar";
import { MapZoomControl } from "./components/MapZoomControl";
import { MapLegend } from "./components/MapLegend";
import { ClusterFilterModal } from "./components/ClusterFilterModal";
import { StatusFilter } from "./components/StatusFilters";
import { ConnectionBanner } from "./components/ConnectionBanner";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useTrackingUiStore } from "@/store/trackingUiStore";
import { BottomCards } from "./components/BottomCards";
import { MobileAssetSheet } from "./components/MobileAssetSheet";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

export default function TrackingPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "focused">("all");
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("standard");
  const [showTraffic, setShowTraffic] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [clusterModalOpen, setClusterModalOpen] = useState(false);
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [showGeofences, setShowGeofences] = useState(false);
  const [zoomResetKey, setZoomResetKey] = useState(0);
  const [playbackType, setPlaybackType] = useState<"trip" | "history">("trip");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 1),
    to: new Date(),
  });

  const resetZoom = () => setZoomResetKey((prev) => prev + 1);

  const { token, organization } = useAuthStore();
  const { setSidebarCollapsed } = useUIStore();
  const { subscribePrivate } = useEcho();
  const { status: connectionStatus } = useConnectionStatus();
  const { setActiveTab } = useTrackingUiStore();

  const { data: vehicleData, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles-tracking"],
    queryFn: () => api.getVehiclesBatched(),
    enabled: !!token,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const { data: clustersData } = useQuery({
    queryKey: ["clusters-tracking"],
    queryFn: () => getClusters({ per_page: 100 }),
    enabled: !!token,
  });

  const { data: tripData, isLoading: isLoadingTrips } = useQuery({
    queryKey: ["trips", { status: "in_progress" }],
    queryFn: () => tripApi.getTrips({ status: "in_progress" }),
    enabled: !!token && viewMode === "focused",
  });

  const { data: geofencesData } = useQuery({
    queryKey: ["geofences-tracking"],
    queryFn: () => getGeofences({ per_page: 100 }),
    enabled: !!token && showGeofences,
  });

  const vehicles = useMemo(() => vehicleData ?? [], [vehicleData]);
  const ongoingTrips = useMemo(() => tripData?.data?.trips || [], [tripData]);
  const clusters = useMemo(() => clustersData?.data?.clusters || [], [clustersData]);
  const geofences = useMemo(() => geofencesData?.data?.geofences || [], [geofencesData]);

  const { locations, interpolator, alarmState, trails } = useVehicleLocations({
    vehicles,
    token,
    organization,
    subscribePrivate,
    selectedVehicleId,
  });

  const selectedVehicle = useMemo(
    () =>
      vehicles.find((v: Vehicle) => String(v.id) === String(selectedVehicleId)) || null,
    [vehicles, selectedVehicleId],
  );

  const selectedTrail = useMemo(
    () => (selectedVehicleId ? trails[selectedVehicleId] ?? [] : []),
    [trails, selectedVehicleId],
  );

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  const filteredVehicles = useMemo(() => {
    let result = vehicles;
    if (selectedClusterIds.length > 0) {
      result = result.filter((v: Vehicle) => {
        const clusterId = String(v.relationships?.cluster?.id || "");
        return selectedClusterIds.includes(clusterId);
      });
    }
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter((v: Vehicle) => {
        const currentDriver = v.relationships?.current_driver;
        const driverName = Array.isArray(currentDriver) ? undefined : currentDriver?.name;
        const imei = v.relationships?.device?.imei ?? v.relationships?.device?.data?.imei;
        const deviceSerial = v.relationships?.device?.serial_number;
        const haystack = [
          v.attributes.registration_number,
          v.attributes.make,
          v.attributes.model,
          driverName,
          imei,
          deviceSerial,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (statusFilter !== "all") {
      result = result.filter((v: Vehicle) => {
        const loc = locations[v.id];
        if (statusFilter === "moving") return loc?.status === "in_transit";
        if (statusFilter === "idle") return loc?.status === "idle";
        if (statusFilter === "parked") return loc?.status === "parked";
        if (statusFilter === "online") return loc?.is_online === true;
        if (statusFilter === "offline") return loc?.is_online === false || !loc;
        if (statusFilter === "alarm") return alarmState[v.id] === true;
        return false;
      });
    }
    return result;
  }, [vehicles, debouncedSearchQuery, statusFilter, locations, selectedClusterIds, alarmState]);

  // Clear selection if the selected vehicle is not in the filtered results
  useEffect(() => {
    if (
      selectedVehicleId &&
      !filteredVehicles.find((v: Vehicle) => String(v.id) === String(selectedVehicleId))
    ) {
      setSelectedVehicleId(null);
    }
  }, [filteredVehicles, selectedVehicleId]);

  const ongoingTripsData = useMemo(() => {
    return ongoingTrips.map((trip: Trip) => {
      const relVehicle = trip.relationships?.vehicle;
      const bestVehicleId =
        relVehicle?.id ||
        trip.attributes?.vehicleId ||
        trip.attributes?.vehicle_id;
      const fleetVehicle = bestVehicleId
        ? vehicles.find((v: Vehicle) => String(v.id) === String(bestVehicleId))
        : null;
      return {
        ...trip,
        vehiclePlate:
          fleetVehicle?.attributes.registration_number ||
          relVehicle?.registration_number ||
          "N/A",
        vehicleId: bestVehicleId ? String(bestVehicleId) : null,
        startTime: trip.attributes.planned_start_time || trip.attributes?.created_at,
        endTime: trip.attributes.planned_end_time || new Date().toISOString(),
      };
    });
  }, [ongoingTrips, vehicles]);

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

  useEffect(() => {
    setSidebarCollapsed(true);
    return () => setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }, []);

  const wasDisconnectedRef = useRef(false);
  useEffect(() => {
    if (connectionStatus === "disconnected" || connectionStatus === "failed") {
      wasDisconnectedRef.current = true;
    } else if (connectionStatus === "connected" && wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["vehicles-tracking"] });
    }
  }, [connectionStatus, queryClient]);

  const handleLocationSearchSubmit = useCallback(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return;
    const match = vehicles.find((v: Vehicle) => {
      const loc = locations[v.id];
      return (
        v.attributes.registration_number?.toLowerCase().includes(q) ||
        (loc?.address ?? "").toLowerCase().includes(q)
      );
    });
    const loc = match ? locations[match.id] : null;
    if (loc?.lat && loc?.lng) {
      (window as any).leafletMap?.flyTo([loc.lat, loc.lng], 16);
    }
  }, [locationSearch, vehicles, locations]);

  return (
    <UpgradeGate
      module="geofence"
      featureName="Live Tracking"
      description="Monitor your fleet in real-time with precise telemetry and location data."
    >
      <div
        ref={containerRef}
        className={cn(
          "h-screen w-full grid overflow-hidden bg-white",
          "grid-rows-[56px_1fr]",
          selectedVehicle ? "lg:grid-rows-[56px_1fr_auto]" : "lg:grid-rows-[56px_1fr]",
          "grid-cols-1",
          selectedVehicle ? "lg:grid-cols-[320px_1fr_380px]" : "lg:grid-cols-[320px_1fr_0px]",
          "transition-[grid-template-columns] duration-300 ease-in-out",
        )}
      >
        <div className="col-span-full row-start-1">
          <TrackingTopBar
            locationSearch={locationSearch}
            setLocationSearch={setLocationSearch}
            onLocationSearchSubmit={handleLocationSearchSubmit}
            mapStyle={mapStyle}
            setMapStyle={setMapStyle}
            showTraffic={showTraffic}
            setShowTraffic={setShowTraffic}
            showGeofences={showGeofences}
            setShowGeofences={setShowGeofences}
            viewMode={viewMode}
            setViewMode={setViewMode}
            selectedClusterIds={selectedClusterIds}
            onOpenClusterModal={() => setClusterModalOpen(true)}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["vehicles-tracking"] })}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>

        <div className="hidden lg:block row-start-2 border-r border-slate-200 overflow-hidden">
          <TrackingSidebar
            viewMode={viewMode}
            vehicles={vehicles}
            filteredVehicles={filteredVehicles}
            locations={locations}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            isLoadingVehicles={isLoadingVehicles}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            ongoingTripsCount={ongoingTrips.length}
            ongoingTripsData={ongoingTripsData}
            setIsReplayOpen={setIsReplayOpen}
            isLoadingTrips={isLoadingTrips}
            alarmState={alarmState}
          />
        </div>

        <div className="relative row-start-2 overflow-hidden">
          <TrackingMap
            filteredVehicles={filteredVehicles}
            locations={locations}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={(v) => setSelectedVehicleId(v?.id)}
            vehicles={vehicles}
            TILE_URL={MAP_LAYERS[mapStyle]}
            mapStyle={mapStyle}
            showTraffic={showTraffic}
            trail={selectedTrail}
            getMarkerSVG={getMarkerSVG}
            getVehicleIcon={getVehicleIcon}
            statusFilter={statusFilter}
            zoomResetKey={zoomResetKey}
            showGeofences={showGeofences}
            geofences={geofences}
            interpolator={interpolator}
            alarmState={alarmState}
          />
          <MapZoomControl />
          <MapLegend />
          <ConnectionBanner />
        </div>

        <div className="hidden lg:block row-start-2 overflow-hidden">
          <AssetPanel
            isOpen={!!selectedVehicle}
            onClose={() => {
              setSelectedVehicleId(null);
              resetZoom();
            }}
            selectedVehicle={selectedVehicle}
            locations={locations}
            vehicles={vehicles}
            onLiveTrack={() => {
              const loc = selectedVehicle ? locations[selectedVehicle.id] : null;
              if (loc?.lat && loc?.lng) {
                (window as any).leafletMap?.flyTo([loc.lat, loc.lng], 16);
              }
            }}
            onPlayback={() => {
              const hasTrip = ongoingTripsData.some((t) => t.vehicleId === selectedVehicleId);
              setPlaybackType(hasTrip ? "trip" : "history");
              setIsReplayOpen(true);
            }}
          />
        </div>

        {selectedVehicle && (
          <div className="hidden lg:flex row-start-3 col-start-2 border-t border-slate-200 p-4 gap-3 overflow-x-auto">
            <BottomCards
              selectedVehicle={selectedVehicle}
              loc={locations[selectedVehicle.id]}
              hasActiveAlarm={alarmState[selectedVehicle.id] === true}
            />
          </div>
        )}

        {/* Mobile (<lg): vehicle detail panel keeps its existing bottom-sheet presentation */}
        <div className="lg:hidden">
          <AssetPanel
            isOpen={!!selectedVehicle}
            onClose={() => {
              setSelectedVehicleId(null);
              resetZoom();
            }}
            selectedVehicle={selectedVehicle}
            locations={locations}
            vehicles={vehicles}
            onLiveTrack={() => {
              const loc = selectedVehicle ? locations[selectedVehicle.id] : null;
              if (loc?.lat && loc?.lng) {
                (window as any).leafletMap?.flyTo([loc.lat, loc.lng], 16);
              }
            }}
            onPlayback={() => {
              const hasTrip = ongoingTripsData.some((t) => t.vehicleId === selectedVehicleId);
              setPlaybackType(hasTrip ? "trip" : "history");
              setIsReplayOpen(true);
            }}
          />
        </div>

        <MobileAssetSheet
          vehicles={vehicles}
          filteredVehicles={filteredVehicles}
          locations={locations}
          alarmState={alarmState}
          selectedVehicleId={selectedVehicleId}
          setSelectedVehicleId={setSelectedVehicleId}
          isLoadingVehicles={isLoadingVehicles}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      <ClusterFilterModal
        open={clusterModalOpen}
        onOpenChange={setClusterModalOpen}
        clusters={clusters}
        selectedClusterIds={selectedClusterIds}
        setSelectedClusterIds={setSelectedClusterIds}
      />

      <TripPlaybackTimeline
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        data={playbackData}
        currentIndex={playbackIndex}
        onIndexChange={setPlaybackIndex}
        isPlaying={isPlayingPlayback}
        setIsPlaying={setIsPlayingPlayback}
        isLoading={isLoadingPlayback}
        title={playbackType === "trip" ? "TRIP REPLAY" : "HISTORY REPLAY"}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </UpgradeGate>
  );
}
```

Note two things this rewrite deliberately does versus the original:
1. `AssetPanel` is now rendered **twice** — once inside the `hidden lg:block` grid cell (desktop docked layout) and once inside a `lg:hidden` wrapper (mobile bottom sheet, using `AssetPanel`'s own responsive classes from Task 9 to do the right thing at each breakpoint). This is necessary because CSS Grid placement (`row-start-2` at `lg+`) and `fixed` bottom-sheet placement (`<lg`) are mutually exclusive positioning contexts for the same element — duplicating the mount is simpler and safer than trying to make one instance serve both layouts via className alone, and `AssetPanel` returns `null` cheaply when `!selectedVehicle`.
2. `SelectedVehicleBar` is no longer imported or rendered — its quick actions live permanently in the docked `AssetPanel` header now (per spec §4).

- [ ] **Step 4: Delete `SelectedVehicleBar.tsx`**

```bash
git rm app/\(portal\)/tracking/components/SelectedVehicleBar.tsx
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/page.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Run the full tracking test suite**

Run: `npx vitest run __tests__/tracking`
Expected: PASS — all tests from Tasks 1–12.

- [ ] **Step 7: Type-check and lint the whole tracking directory**

Run: `npx tsc --noEmit`
Expected: no new errors. If `SelectedVehicleBar`/`TrackingControlDeck` are referenced anywhere else in the codebase (e.g. a barrel export), fix those references now.

Run: `npx eslint "app/(portal)/tracking/**/*.{ts,tsx}"`
Expected: no errors.

- [ ] **Step 8: Manual verification in the browser**

Run: `npm run dev`, open `/tracking`, and confirm against the mockup:
- Top toolbar shows the location search, Traffic dropdown, Map Style dropdown, and Layers icon.
- Left panel shows the "All / Moving / Idle / Parked / Offline" tab strip with live counts.
- Selecting a moving vehicle shows a solid blue trail growing behind its marker as new WS packets arrive, and shows its photo (or fallback) in the right panel header.
- Deselecting, then selecting a different vehicle, does not show the previous vehicle's trail.
- The bottom-center legend pill and top-left zoom control render on the map.
- Bottom-of-map stat card row appears only when a vehicle is selected, and disappears (with the map/right panel reflowing) on deselect.
- Resize below 1024px width and confirm the mobile bottom-sheet asset list and vehicle detail panel still work as before, restyled.

- [ ] **Step 9: Commit**

```bash
git add app/\(portal\)/tracking/page.tsx __tests__/tracking/page.test.tsx
git commit -m "feat(tracking): rebuild page shell as a docked grid layout matching the mockup"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (grid shell) → Task 12. §2 (top toolbar) → Task 5. §3 (asset panel tab strip/rows) → Tasks 6–8. §4 (map: zoom, legend, trail) → Tasks 3–4. §5 (hero photo header) → Task 9. §6 (bottom cards) → Task 10. §7 (mobile) → Tasks 5, 9, 11, 12. Live route trail implementation notes → Tasks 1–3. All Non-Goals respected — no task touches tab content, the "More" menu, the packet stream viewer, or any backend/API code.
- **Type consistency:** `TrailPoint` defined once in Task 1 (`lib/vehicleTrail.ts`) and imported identically in Tasks 2, 3, and 12. `trails: Record<string, TrailPoint[]>` returned from `useVehicleLocations` in Task 2 matches its consumption in Task 12 (`trails[selectedVehicleId]`). `TrackingMapStyle` narrowed to `"standard" | "satellite" | "hybrid"` in Task 3 and used with that exact same union in Task 5's `TrackingTopBarProps` and Task 12's `useState<TrackingMapStyle>`. `TrackingMap`'s new `trail`/`showTraffic` props (Task 3) match exactly how Task 12 passes them (`trail={selectedTrail}`, `showTraffic={showTraffic}`).
- **No placeholders:** every step includes complete, runnable code — no "TBD," no "similar to Task N" without the actual code repeated in place.
