# Live Tracking — Asset Panel Full Telemetry & Packet Stream Integrity

**Date:** 2026-07-03
**Status:** Approved for planning

## Context

When an asset is selected from the Live Tracking asset list, `AssetPanel.tsx` opens a
detail panel with Details/Driver/Trip/Device/Live IoT tabs. The panel already resolves a
rich telemetry object (`resolveVehicleTelemetry()` in `lib/resolveVehicleTelemetry.ts`,
~45 fields sourced from WS packets + REST fallback), but `DetailsTab.tsx` and
`DeviceTab.tsx` only bind about half of those fields to JSX. Fields like engine RPM, oil
level, fuel rate/consumption breakdown, external voltage, battery current, eco score,
driving-state flags (idling/jamming/immobilizer/unplug/sleep-mode/door-status), odometer
variants (live/total mileage/trip), GPS HDOP, and protocol/confidence are computed and
then dropped — never reaching the operator.

Separately, investigating "real-time sync" and "all packets accessible" requirements
surfaced:
- Real-time WS sync for the fleet list and detail panel already works correctly for all
  vehicles (org-wide channels in `useVehicleLocations` cover location/status/fuel for
  every vehicle regardless of selection; per-vehicle device-status channel in
  `useVehicleTelemetry` covers online/offline). No gap here.
- A genuine bug in the "Live IoT" packet stream (`PacketStreamTab.tsx` +
  `packetStreamStore.ts`): for the *selected* vehicle, `.current.recent` location events
  are pushed into the packet stream buffer twice — once via `useVehicleLocations`'s
  `pushIfSelected` (fed by the org-wide channel) and once via `useVehicleTelemetry`'s own
  per-vehicle channel subscription (`location.vehicle.{id}`). Both listeners receive the
  same backend broadcast and both call `usePacketStreamStore.getState().push(...)`,
  producing duplicate rows and burning through the 200-row-per-vehicle buffer roughly 2x
  faster than necessary.

## Goals

- Every telemetry field the backend sends and `resolveVehicleTelemetry()` already
  computes is visible somewhere in the asset detail panel.
- The Live IoT packet stream shows one row per distinct WS event — no duplicate rows for
  the selected vehicle's location updates.
- When the packet buffer is at its cap, that's visible to the user rather than a silent
  truncation.

## Non-Goals

- No change to the WS subscription architecture (channel names, event names, or which
  hooks subscribe to which channels). The duplicate-push bug is fixed at the store layer
  (dedup on push), not by removing either subscription — both channels are intentional
  (org-wide feeds the list/map for every vehicle; per-vehicle channels are the detail
  panel's live telemetry source and include an IMEI-based fallback), and consolidating
  them is a larger, riskier refactor than this task calls for.
- No backend/API changes. There is no REST endpoint for historical packets
  (`lib/api/tracking.ts` has none), so "all packets accessible while previewing" means
  everything received over WS since the page/panel was opened this session — not
  backend-persisted history. Confirmed acceptable with the user.
- No change to `resolveVehicleTelemetry.ts`'s resolution/fallback logic or to
  `buildVehicleSnapshot` — this is purely wiring already-computed fields into new JSX,
  plus the packet-stream dedup fix.
- No changes to `DriverTab.tsx` or `TripTab.tsx` — those render driver/trip API data, not
  vehicle/device telemetry, and are out of scope.

## Design

### 1. New "Diagnostics" Tab

Add a fifth-position tab to `AssetPanel.tsx`'s tab list (`Details / Driver / Trip /
Device / Diagnostics / Live IoT`) backed by a new `DiagnosticsTab.tsx` component, so the
existing tabs don't grow unbounded with rarely-needed fields.

- `store/trackingUiStore.ts`: extend `TrackingDetailTab` to
  `"details" | "driver" | "trip" | "device" | "diagnostics" | "packets"`.
- `AssetPanel.tsx`: add `<TabsTrigger value="diagnostics">` and
  `<TabsContent value="diagnostics">`, passing the same `resolved` object already
  computed for Details/Device.
- New file `app/(portal)/tracking/components/tabs/DiagnosticsTab.tsx`, using the existing
  `TelemetryRow` component for plain fields and a small inline chip renderer (styled
  after `AIInsightsCard`'s `SEVERITY_STYLE`) for boolean alert flags. No new data
  fetching — everything comes from the `resolved: ResolvedVehicleTelemetry` prop already
  built by `useResolvedVehicleTelemetry`.

Sections, top to bottom:

**Alerts** — chip row for active boolean flags only (`resolved.idling`,
`resolved.jamming`, `resolved.immobilizer`, `resolved.unplug`, `resolved.sleepMode`).
Amber chips for idling/sleep-mode, rose chips for jamming/immobilizer/unplug. If none are
active, show a single emerald "No active alerts" chip (mirrors `AIInsightsCard`'s
empty state). Below the chip row, plain `TelemetryRow`s for non-boolean state that
doesn't fit a chip: Driving State (`resolved.drivingState`), Movement
(`resolved.movement`), Door Status (`resolved.doorStatus`), Load Weight
(`resolved.loadWeight`, suffixed "kg").

**Engine** — RPM (`resolved.rpm`, suffixed "rpm"), RPM (OBD) (`resolved.rpmObd`), Oil
Level (`resolved.oilLevel`).

**Odometer & Mileage** — Live Odometer (`resolved.odometer`, suffixed "km"; this is
distinct from the existing Details-tab "Today's Distance" which reads
`attributes.odometer.today_km`), Total Mileage (`resolved.mileage`, "km"), Trip Odometer
(`resolved.tripOdo`, "km"), Odometer Source (`resolved.odoSource`, plain string).

**Fuel Detail** — Fuel Rate (`resolved.fuelRate`, "L/h"), Fuel Consumed
(`resolved.fuelConsumed`, "L"), Fuel Used (GPS) (`resolved.fuelUsedGps`, "L"), Fuel Level
(OBD) (`resolved.fuelLevelObd`, "%"), Fuel Source (`resolved.fuelSource`), Fuel Liters
(`resolved.fuelLiters`, "L"), Tank Capacity (`resolved.fuelTankCap`, "L"), Data Quality
(`resolved.fuelQuality`), Last Updated (`resolved.fuelLastUpdate`, formatted via existing
`fmtTime`/relative-time helper), Has Fuel Sensor (`resolved.deviceHasFuel`, "Yes"/"No").

**Electrical** — External Voltage (`resolved.extV`, via existing `formatVoltage`),
Battery Current (`resolved.batteryCurrent`, "A").

**GPS & Eco** — Eco Score (`resolved.ecoScore`, colored via existing `resolved.ecoColor`,
suffixed "/100"), Altitude (`resolved.altitude`, "m"), GPS Precision / HDOP
(`resolved.hdop`).

**Protocol** — Protocol Name (`resolved.protocol`), Confidence (`resolved.confidence`,
shown as the raw value — no unit assumed, since the backend contract for this field's
scale isn't documented).

All rows use `TelemetryRow`'s existing null-handling (renders "—" for
null/undefined/empty), so no per-field null checks are needed beyond the unit-suffix
formatting shown above (format only when the value is non-null, matching the existing
pattern in `DetailsTab`/`DeviceTab`).

### 2. Packet Stream Dedup

In `store/packetStreamStore.ts`'s `push`, before appending a new entry, compare it
against the current head (index 0, most recent) of that vehicle's buffer:

```
const [prev] = existing;
const isDuplicate =
  prev &&
  prev.type === entry.type &&
  JSON.stringify(prev.raw) === JSON.stringify(entry.raw) &&
  entry.receivedAt - prev.receivedAt < 3000;
if (isDuplicate) return; // same backend broadcast delivered on two channels
```

This is a content+type+time-window comparison, not a channel-source comparison — it's
resilient to which channel happened to deliver first, and doesn't require either hook to
know about the other's subscription. Genuinely distinct events (different payload) that
happen to arrive within 3 seconds are unaffected, since `JSON.stringify(raw)` will
differ.

### 3. Buffer Cap Visibility

In `PacketStreamTab.tsx`, when `buffer.length >= maxRows` (read `maxRows` from
`usePacketStreamStore`), show a small persistent note under the type-filter row (same
visual treatment as the existing "Paused — N events not shown" banner, but neutral/slate
colored, not amber): "Showing last {maxRows} events — older events are no longer
available." This makes the existing (unchanged) 200-row cap an explicit, visible
constraint instead of a silent truncation.

## Testing

- Manual: select a vehicle with active WS telemetry, verify each new Diagnostics field
  populates when the backend sends it and shows "—" when it doesn't (no crashes on
  missing fields).
- Manual: trigger a location update for the selected vehicle and confirm exactly one row
  appears in the Live IoT tab (not two) for that event.
- Manual: verify the "No active alerts" chip shows when idling/jamming/immobilizer/
  unplug/sleep-mode are all false, and the correct colored chip(s) show when one or more
  is true.
- Manual: leave a vehicle's packet stream running past 200 events and confirm the
  "Showing last 200 events" note appears and the buffer stays capped at 200 without
  errors.
