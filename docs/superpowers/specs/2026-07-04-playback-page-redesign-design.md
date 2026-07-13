# Playback Page Redesign — Design

## Context

A "Playback" button already exists in the Live Tracking asset panel (`app/(portal)/tracking/components/AssetPanel.tsx`), but today it opens an inline bottom-docked drawer (`components/live/TripPlaybackTimeline.tsx`) rather than navigating anywhere. A standalone Playback page already exists at `app/(portal)/tracking/playback/page.tsx` (left-sidebar layout: vehicle/trip selects + map + bottom transport controls), but it's orphaned — nothing links to it.

The user supplied a mockup of a much richer Playback page: a top filter bar (date/time range, vehicles, groups, drivers, location, "More Filters"), a speed-colored route on the map, a right-hand panel (Playback Summary / Top Events / Top Vehicles / Recent Playbacks, or an Advanced Filters panel when toggled), a bottom transport scrubber, and a bottom tab panel (Timeline / Events / Stops / Speed / Altitude / Fuel / Vehicles) including a "Speed Over Time" chart.

Goal: rebuild the Playback page to match this mockup, and wire the AssetPanel's "Playback" button to navigate there instead of opening the inline drawer.

## Scope decisions (confirmed with user)

- **One project**: design the full page and the navigation wiring together, not as separate phases.
- **Data scope**: build the full UI now; wire everything the current API actually supports; for anything with no backend support (Recent Playbacks, multi-vehicle Top Vehicles ranking, Altitude, Fuel), show the section with an empty/placeholder state — no fabricated data.
- **Vehicle scope**: single-vehicle playback for this iteration. The Vehicles filter UI is built to accept multiple selections later, but the page only ever drives it with one vehicle id. Top Vehicles / Vehicles tab render as a single real row rather than a ranking.
- **Old drawer**: `TripPlaybackTimeline` inline drawer is removed entirely. "Playback" always navigates to the full page — there is no dual entry point to maintain.
- **Groups**: maps to the existing **Cluster** feature (`lib/api/settings.ts: getClusters`, `types/vehicle.ts: Cluster`), already used on Live Tracking via `ClusterFilterModal.tsx`. This is real, not stubbed.
- **Location**: no locations-list endpoint exists anywhere in the app. This filter is a disabled stub ("All Locations", tooltip explaining it's not available yet).

## 1. Architecture & file layout

Rebuild `app/(portal)/tracking/playback/page.tsx` in place (same route), replacing the left-sidebar layout with the mockup's top-filter-bar layout. Decomposition follows the same convention already used by the Live Tracking feature (`app/(portal)/tracking/components/`):

```
app/(portal)/tracking/playback/
  page.tsx                        — orchestration: reads searchParams, owns filter/playback state
  components/
    PlaybackFilterBar.tsx         — date/time range x2, vehicle/cluster/driver/location selects, filter chips row
    PlaybackAdvancedFilters.tsx   — right-side panel content when "More Filters" is toggled on
    PlaybackSummaryPanel.tsx      — default right-side panel: stat grid, Top Events, Top Vehicles, Recent Playbacks
    PlaybackMap.tsx               — react-leaflet map: speed-colored route, markers, legend, map controls
    PlaybackScrubber.tsx          — bottom-of-map transport control (play/pause/speed/slider)
    PlaybackBottomPanel.tsx       — tab container: Timeline / Events / Stops / Speed / Altitude / Fuel / Vehicles
    tabs/
      TimelineTab.tsx
      EventsTab.tsx
      StopsTab.tsx
      SpeedTab.tsx                — recharts "Speed Over Time" line chart
      AltitudeTab.tsx             — empty-state stub (no backend altitude data)
      FuelTab.tsx                 — empty-state stub (no backend fuel data in playback context)
      VehiclesTab.tsx             — single-row breakdown for the selected vehicle
  hooks/
    usePlaybackMovements.ts       — wraps getVehiclePlayback/getTripPlayback, normalizes to PlaybackMovement[]
    usePlaybackDerived.ts         — computes stats/events/stops/segments via lib/playback/derive.ts
```

Removed:
- `components/live/TripPlaybackTimeline.tsx`
- `app/(portal)/tracking/hooks/usePlaybackData.ts`
- The `isReplayOpen`/`playbackType`/`TripPlaybackTimeline` state and JSX in `app/(portal)/tracking/page.tsx`

Any test files under `__tests__/tracking/` referencing the removed drawer/hook must be updated or removed alongside.

## 2. Navigation wiring

`AssetPanel`'s `onPlayback` prop currently triggers `handlePlayback` in `page.tsx`, which opens the inline drawer. This changes to a `router.push`:

```ts
const handlePlayback = useCallback(() => {
  const trip = ongoingTripsData.find((t) => t.vehicleId === selectedVehicleId);
  const params = new URLSearchParams({ vehicleId: selectedVehicleId });
  if (trip) {
    params.set('tripId', trip.id);
  } else {
    // default to a recent window (e.g. last 6 hours) when there's no active trip
    params.set('start', ...);
    params.set('end', ...);
  }
  router.push(`/tracking/playback?${params.toString()}`);
}, [ongoingTripsData, selectedVehicleId, router]);
```

The Playback page reads `vehicleId` (+ optional `tripId`, or `start`/`end`) from `useSearchParams()` on mount to pre-populate the filter bar and immediately load that vehicle's data — mirroring the existing "trip mode vs. history mode" branch, driven by URL params instead of manual dropdown selection. The filter bar stays editable afterward.

## 3. Top filter bar & Advanced Filters

**`PlaybackFilterBar`**, left to right:
- **Date & Time (Start / End)** — datetime inputs driving the fetch window. Populated read-only from the trip's start/end when `tripId` is active; editing them switches to custom-range mode.
- **Vehicles** — dropdown from `vehicleApi.getVehicles`. Single-select for this iteration; component props accept an array for future multi-vehicle support.
- **Groups (Clusters)** — dropdown from `settingsApi.getClusters()`. Selecting a cluster filters the Vehicles dropdown to vehicles whose `relationships.cluster.id` matches, same pattern as `ClusterFilterModal` on Live Tracking.
- **Drivers** — dropdown from `driversApi.getDrivers()`. Selecting a driver narrows the Vehicles dropdown to that driver's currently assigned vehicle (`getDriverCurrentVehicle`); does not filter playback data directly.
- **Location** — disabled stub, "All Locations", tooltip noting it isn't available yet.
- **More Filters (N)** — toggle button with a badge showing active advanced-filter count; swaps the right panel between `PlaybackSummaryPanel` and `PlaybackAdvancedFilters`.

Below that, a **filter chips row** reflecting active quick/advanced filters, each removable via ×, plus "Clear All".

**`PlaybackAdvancedFilters`** (right panel when "More Filters" is active):
- **Vehicle Status** (Moving/Parked/Idle/Offline) — client-side filter over the fetched movement series.
- **Route** — reuses the vehicle's trip/route list (`getTripRoutes`/trips list); selecting one is equivalent to picking a trip.
- **Geofence** — from `geofencingApi.getGeofences()`. Selecting one draws its shape on the map (reusing `TrackingMap.tsx`'s `Polygon`/`Circle` rendering) and filters Geofence Enter/Exit events to it.
- **Radius** — numeric filter, only meaningful combined with a geofence center.
- **Playback Events checkboxes** — filters which derived events (§6) show as markers/timeline entries.
- **Driving Behaviour** (min/max speed, min stop duration) — feeds directly into the derivation thresholds in §6.
- **Trip Characteristics** (distance/duration range) — client-side filter/highlight; becomes more useful once multi-vehicle/multi-trip queries exist.
- **Device Filters** — disabled stub, no device-level filtering data available in playback context.

"Apply Filters" recomputes derived data client-side — no new request, except when Route or Geofence selection implies fetching different trip/geofence detail.

## 4. Map & scrubber

**`PlaybackMap`** extends the existing react-leaflet setup (dynamically imported, `ssr:false`, same Mapbox/OSM tile pattern):
- **Speed-colored route**: multiple `Polyline` segments colored by speed bucket (0–20 green, 20–40 light green, 40–60 yellow, 60–80 orange, 80+ red), computed from `buildSpeedSegments` (§6).
- **Start/end markers**: green/red circle `divIcon`s at first/last point.
- **Numbered stop markers**: small numbered dots at detected stops (§6).
- **Playback position marker**: existing animated `divIcon`, driven by the scrubber's current index.
- **Legend card**: static, bottom-left, matches the mockup's speed-bucket legend.
- **Controls**: zoom, locate/center, layers (kept from existing map); **Traffic** toggle present but disabled (no traffic-layer provider available) with a tooltip; **Map/Satellite** toggle real (swap `TileLayer` URL, no new dependency); fullscreen toggle real (Fullscreen API on the map container).

**`PlaybackScrubber`** evolves the existing bottom transport-control card: play/pause, step back/forward, speed buttons (1x/2x/4x/8x, unchanged from today), a slider spanning the selected time range with a drag tooltip showing current timestamp, and a calendar-icon shortcut back to the filter bar's date inputs.

## 5. Right panel & bottom tabs

**`PlaybackSummaryPanel`** (default right panel):
- **Stat grid**: Duration, Distance, Avg Speed, Max Speed, Stops, Events — from `computePlaybackStats` (§6), real data.
- **Top Events**: derived event types with counts (Overspeed, Harsh Braking, Geofence Exit, Excessive Idle, etc.), real.
- **Top Vehicles**: single row (selected vehicle + its distance/duration) for this iteration — becomes a real ranking once multi-vehicle is added.
- **Recent Playbacks**: empty state ("No recent playbacks yet") — no backend endpoint, no fabricated data. A code comment notes this as a future hook point (backend endpoint or local storage).

**`PlaybackBottomPanel`** tabs:
- **Timeline** — merged chronological feed (start/stop/event/end), icon + timestamp + location label, styled like `TripTab`'s list.
- **Events** — event-only subset of the timeline, filtered by Advanced Filters checkboxes.
- **Stops** — stop-only subset, with duration per stop.
- **Speed** — recharts line chart ("Speed Over Time"), following patterns in `components/analytics/AnalyticsChart.tsx`; overspeed points get a flagged marker/tooltip.
- **Altitude** — empty-state stub; `PlaybackMovement` has no altitude field today.
- **Fuel** — empty-state stub; no fuel-level field joined to playback data.
- **Vehicles** — single-row breakdown for the selected vehicle (distance/duration/avg speed).

## 6. Data & derivation logic

The API only returns raw GPS points (`PlaybackMovement { lat, lng, speed, heading, timestamp }`). Everything else is derived client-side — no new backend endpoints required for the core experience.

**Type promotion**: move `PlaybackMovement` out of `lib/api/tracking.ts` into a new `types/tracking.ts` (barrel-exported from `types/index.ts`), alongside new `PlaybackEvent`, `PlaybackStop`, `PlaybackStats` types, since the hook, derivation logic, and multiple components all consume these shapes.

**`lib/playback/derive.ts`** — pure, unit-testable functions over a sorted `PlaybackMovement[]` plus Advanced-Filter thresholds:
- `computePlaybackStats(movements)` → `{ duration, distanceKm, avgSpeed, maxSpeed }` (distance via haversine sum over consecutive points).
- `buildSpeedSegments(movements)` → polyline segments bucketed into the 5 speed bands, feeding both the map route color and the legend.
- `detectStops(movements, { minStopDurationMinutes })` → contiguous near-zero-speed runs of at least the configured duration; each becomes a numbered map marker + a Stops-tab row.
- `detectEvents(movements, { maxSpeedThreshold, minSpeedThreshold })` → Overspeed events (speed exceeds threshold) and Harsh Braking/Acceleration (speed delta over time delta exceeds a fixed constant introduced here, since no existing app-wide threshold convention applies to GPS-derived driving events).
- `filterMovementsByGeofence(movements, geofence)` → only runs when a geofence is selected; flags Geofence Enter/Exit transitions via point-in-polygon/circle checks against `Geofence` boundary data.

Advanced Filters' Driving Behaviour inputs (min/max speed, min stop duration) map directly onto these function parameters, so "Apply Filters" mostly recomputes derived data in memory rather than refetching.

## Testing

- Unit tests for `lib/playback/derive.ts` functions (stats, stops, events, speed segments, geofence filtering) — pure functions, straightforward to test with synthetic movement series.
- Update/replace `__tests__/tracking/AssetPanel.test.tsx` to assert `onPlayback` triggers navigation (not drawer state).
- Remove or rewrite any `__tests__/tracking/*` tests that reference `TripPlaybackTimeline`/`usePlaybackData`.
- Component tests for the new Playback page components following existing test patterns in `__tests__/tracking/`.
