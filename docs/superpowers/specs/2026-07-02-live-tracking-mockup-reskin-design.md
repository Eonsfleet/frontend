# Live Tracking — Mockup Reskin & Live Route Trail

**Date:** 2026-07-02
**Status:** Approved for planning

## Context

The Live Tracking page (`app/(portal)/tracking/`) already implements nearly all of the
functionality shown in the provided mockup (asset list with search/status filters, map
with live vehicle markers, a vehicle detail panel with Live Track/Playback/Route History
actions, a "More" menu with Nearby Assets/Send Command/Immobilize/Geofence/Share
Location/Download Report, Details/Driver/Trip/Device/Live IoT tabs, a Live IoT Packet
Stream viewer, and bottom Current Trip/Location & Movement/Device Status cards). See
`docs/livetracking.md` for the full backend/WS contract this page is built on.

What's different is visual language and layout: the current implementation uses floating
glass-morphism panels with rounded corners, drop shadows, and bold italic uppercase
micro-typography, laid out as overlays on top of a full-bleed map. The mockup uses a
flatter, denser, docked enterprise-dashboard layout: solid panels flush to the viewport
edges, a top toolbar over the map, and a bottom color-key legend strip.

Two things are being done together:
1. **Reskin** — restructure the desktop (and, by extension, mobile/tablet) layout to
   pixel-match the mockup's structure and visual style.
2. **New feature** — add a live route trail (breadcrumb polyline) behind the selected
   vehicle's marker while it's moving. This is the one piece of functionality in the
   mockup that has no equivalent in the current implementation (the existing `Polyline`
   rendering only fires in trip-playback/history-replay mode).

## Goals

- Desktop layout matches the mockup's structure and visual style: docked panels, top
  toolbar, bottom legend strip, bottom stat-card row, vehicle photo in the detail panel
  header.
- Mobile/tablet is restyled to match the new visual language, reusing the existing
  bottom-sheet interaction patterns (no mockup exists for mobile, so this is originated
  to be consistent — see "Mobile / Tablet Redesign" below).
- A live route trail renders behind the selected vehicle without any new API
  dependency.
- No regression to existing functionality: WS subscriptions, marker interpolation,
  clustering, geofence overlays, trip playback/history replay, cluster filtering, the
  packet stream viewer, and all six "More" actions continue to work exactly as they do
  today.

## Non-Goals

- No backend/API changes. Everything here is frontend layout, styling, and a
  client-side breadcrumb trail.
- No change to the WS subscription architecture (`useVehicleLocations`,
  `usePlaybackData`, `useEcho`) beyond what's needed to feed the new trail buffer.
- No pixel-matching of mobile — the mockup only covers desktop; mobile is a reasoned
  extrapolation, not a spec'd target.
- Not replacing or removing any of the six "More" menu actions, tab content, or the
  packet stream viewer — those already match the mockup and are out of scope for
  rework beyond the header restyle described below.

## Design

### 1. Desktop Layout Shell (≥1024px)

Replace `page.tsx`'s absolute/floating overlay composition with a CSS grid:

```
┌─────────────────────────────────────────────────────────┐
│ Top Toolbar (56px): search · Traffic▾ · Map Style▾ · Layers │
├──────────┬──────────────────────────────┬────────────────┤
│  Assets  │                              │  Detail Panel  │
│  (fixed  │           Map                │  (fixed 380px, │
│  320px)  │  (flex; zoom top-left,       │  shown only    │
│          │   legend bottom-center)       │  when selected)│
├──────────┴──────────────────────────────┴────────────────┤
│         Bottom stat cards (under map column only)         │
└─────────────────────────────────────────────────────────┘
```

- `TrackingSidebar`, the map, and `AssetPanel` become grid children instead of
  `absolute`-positioned floating cards with margins.
- Panels go from rounded-24px floating cards to flush, full-height docked panels with a
  single-side border, matching the mockup exactly.
- The right detail panel column collapses to 0 width when no vehicle is selected (map
  reflows to fill the space), matching today's show/hide behavior but docked instead of
  a slide-in overlay.

### 2. Top Toolbar (new component: `TrackingTopBar.tsx`)

- Search input ("Search location / address") — geocodes/filters using existing
  map/vehicle data (pans the map to a matching vehicle or address); no new backend
  dependency.
- **Traffic** dropdown — toggles the existing `TrafficOverlay` component (already
  built), now behind an explicit dropdown trigger instead of the current icon-cycle
  button.
- **Map Style** dropdown — explicit dropdown listing Street / Satellite / Hybrid /
  Traffic Density, reusing `MAP_LAYERS` / `TrackingMapStyle` from `utils.tsx`.
- **Layers** icon — toggles geofence overlay (existing `showGeofences` state).
- View-mode toggle (All/Focused), cluster filter, refresh, and fullscreen move from the
  current right-side floating `TrackingControlDeck` into this top bar as icon buttons.
- Zoom controls (+/−) move to a small floating box top-left of the map, separate from
  the toolbar (matches mockup).

`TrackingControlDeck.tsx` is retired; its responsibilities are absorbed into
`TrackingTopBar.tsx` and the new map-corner zoom control.

### 3. Left Asset Panel

`TrackingSidebar.tsx`: flush docked panel instead of floating card chrome. Replace the
current single-row `StatusFilters` pill list with the mockup's tab strip — **All 245 ·
Moving 178 · Idle 15 · Parked 42 · Offline 10** — reusing the same counts/logic from
`StatusFilters`, restyled as underline tabs. `VehicleListItem` rows get a denser, flatter
treatment (small square photo/icon, plate, colored status word, speed + relative time)
replacing the current bordered/shadowed card style.

### 4. Map Area

- Zoom control: small `+`/`−` stack, top-left of the map.
- Bottom-center legend pill: `● Moving  ● Parked  ● Idle  ● Offline  ● Alarm`, statically
  rendered from `VEHICLE_STATUS_ORDER` (colors already match the mockup's legend
  exactly — no new palette work needed).
- **Live route trail** (new): when a vehicle is selected, draw a solid `Polyline`
  trailing its live position. Built client-side as a capped breadcrumb buffer (last ~50
  points or ~15 minutes, whichever limit is hit first), fed from the same WS packets
  already driving `useVehicleLocations`/the interpolator — no new API calls. The trail
  buffer is per-vehicle, resets when the selection changes, and is discarded on
  deselect. Rendered in `TrackingMap.tsx` alongside the existing playback-mode
  `Polyline`.
- The current floating `SelectedVehicleBar` (bottom-center pill with quick actions) is
  removed — its actions (Live Track/Playback/Route History) now live permanently in the
  docked right panel's header, matching the mockup.

### 5. Right Detail Panel

`AssetPanel.tsx` header is restructured: large vehicle photo using the existing
`vehicle.attributes.image` field (already wired in `VehicleListItem`; needs the same
treatment here) with a generic truck-silhouette fallback when no photo is set, a
status pill top-right ("Moving"/"Parked"/etc.), registration plate below the photo, then
the existing Live Track / Playback / Route History / More button row (kept as-is), then
the existing tabs (Details/Driver/Trip/Device/Live IoT — kept as-is), then the existing
Current Address block and Live IoT Packet Stream viewer (kept as-is). This is
predominantly a header restyle, not a rebuild — the six "More" actions, tab contents,
and packet stream all stay functionally identical.

### 6. Bottom Stat Cards

`BottomCards.tsx` moves from a floating pill row to a docked 3-card strip under the map
column (Current Trip / Location & Movement / Device Status), restyled flatter/flush per
the mockup. Content/data sources are unchanged. `AIInsightsCard` (not present in the
mockup) is kept as a 4th card in the same row, since it's existing functionality being
preserved, not something the mockup calls for removing.

### 7. Mobile / Tablet Redesign (<1024px)

No mockup exists for this breakpoint; the following extrapolates the new visual
language onto the existing responsive scaffolding without introducing new interaction
patterns:

- The top toolbar collapses to a search bar plus a single "filters" icon that opens the
  Traffic/Map Style/Layers options in a sheet.
- The asset list keeps today's bottom-sheet pattern (`MobileAssetSheet`), restyled to
  match the new flatter row style from §3.
- The vehicle detail panel keeps today's bottom-sheet pattern (`AssetPanel` already has
  mobile bottom-sheet CSS), with the new hero-photo header from §5.
- Bottom stat cards become a horizontally-scrollable strip pinned above the bottom-sheet
  trigger, same data, restyled per §6.

### Live Route Trail — Implementation Notes

- New state lives alongside `useVehicleLocations`/the interpolator: a capped
  ring-buffer keyed by vehicle id, appended to on each WS position update for the
  currently-selected vehicle only (not the whole fleet, to keep this cheap).
  Recommended default answered under uncertainty: **selected vehicle only, session
  breadcrumb** (not backed by the trips/routes API) — this was the recommended option
  presented during design; no objection was raised before proceeding, but flagging here
  in case the user wants to switch to the trip-routes-API-backed variant instead during
  spec review.
- Buffer cap: ~50 points or ~15 minutes, whichever is hit first (oldest points drop
  off).
- Cleared when: selection changes, vehicle is deselected, or the page unmounts.
- Rendered as a solid blue `Polyline` (visually distinct from the existing
  dashed-gray playback-mode polyline) in `TrackingMap.tsx`.

## Files Touched (expected)

- `app/(portal)/tracking/page.tsx` — grid shell, remove `SelectedVehicleBar`, wire new
  top bar and trail buffer.
- `app/(portal)/tracking/components/TrackingTopBar.tsx` — **new**, replaces
  `TrackingControlDeck.tsx`.
- `app/(portal)/tracking/components/TrackingControlDeck.tsx` — retired.
- `app/(portal)/tracking/components/TrackingSidebar.tsx` — docked layout, tab-strip
  status filters.
- `app/(portal)/tracking/components/VehicleListItem.tsx` — denser row style.
- `app/(portal)/tracking/components/AssetPanel.tsx` — hero photo header restyle.
- `app/(portal)/tracking/components/BottomCards.tsx` — docked strip restyle.
- `app/(portal)/tracking/components/SelectedVehicleBar.tsx` — removed.
- `app/(portal)/tracking/components/MobileAssetSheet.tsx` — restyle only.
- `app/(portal)/tracking/TrackingMap.tsx` — legend pill, corner zoom control, live
  route trail polyline.
- `app/(portal)/tracking/hooks/useVehicleLocations.ts` — breadcrumb buffer for the
  selected vehicle.
- `app/(portal)/tracking/components/StatusFilters.tsx` — restyled as tabs (logic
  unchanged).

## Open Question Carried Into Planning

The live-route-trail data source question (session breadcrumb vs. trips/routes API)
was asked during design but not answered before the design was approved on the
recommended default. Flagging for confirmation during plan review rather than blocking
on it, since the session-breadcrumb approach is fully reversible and doesn't foreclose
switching to the API-backed version later.
