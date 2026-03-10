# Live Tracking — Frontend PRD & Implementation Guide
**EonsFleet Fleet Management System**

**Version:** 1.0
**Date:** March 9, 2026
**Author perspective:** Product Designer (Sections 1–4) · Senior Software Engineer (Sections 5–7)
**Scope:** Fleet map, real-time telemetry, WebSocket integration, geofence overlay, trip tracking, sensor health

---

## Table of Contents

1. [Backend Implementation Audit](#1-backend-implementation-audit)
2. [Current Frontend Behavior & Gaps](#2-current-frontend-behavior--gaps)
3. [Product Specification](#3-product-specification)
   - [3.1 Fleet Map View](#31-fleet-map-view)
   - [3.2 Vehicle Telemetry Panel](#32-vehicle-telemetry-panel)
   - [3.3 Geofence Overlay](#33-geofence-overlay)
   - [3.4 Trip Tracking](#34-trip-tracking)
   - [3.5 Trip Playback](#35-trip-playback)
   - [3.6 Device & Sensor Health](#36-device--sensor-health)
   - [3.7 Real-time Alerts on Map](#37-real-time-alerts-on-map)
4. [WebSocket Architecture](#4-websocket-architecture)
5. [REST API Reference](#5-rest-api-reference)
6. [Implementation Guide (Engineer)](#6-implementation-guide)
7. [Backend Gaps — Fixed in This Iteration](#7-backend-gaps--fixed-in-this-iteration)

---

## 1. Backend Implementation Audit

### 1.1 REST Endpoints

| Status | Method | Endpoint | Purpose |
|--------|--------|----------|---------|
| ✅ | GET | `/v1/vehicles/locations` | Fleet map initial load — all vehicles with telemetry block |
| ✅ | GET | `/v1/vehicles/{id}/location` | Single vehicle location (VehicleLocationResource) |
| ✅ | GET | `/v1/vehicles/{id}/location/current` | Single vehicle current location matching WS payload format |
| ✅ | GET | `/v1/vehicles/{id}/sensors/health` | Sensor health: fuel, device, engine, battery |
| ✅ | GET | `/v1/vehicles/{id}/trips/{trip_id}/playback` | Historical trip replay timeline |
| ✅ | GET | `/v1/trips/{id}/events` | Trip events (harsh braking, speeding, geofence hit) |
| ✅ | GET | `/v1/trips/{id}/routes` | Trip waypoints / route polyline |
| ✅ | GET | `/v1/trips/{id}/checkpoints` | Geofence checkpoints on a trip |
| ✅ | GET | `/v1/trips` | All org trips with `?status`, `?q`, `?per_page` |
| ✅ | GET | `/v1/trips/mine` | Driver's own trips |
| ✅ | GET | `/v1/geofences` | All geofences for org |
| ✅ | POST | `/v1/geofences` | Create geofence |
| ✅ | GET | `/v1/geofences/{id}` | Geofence detail |
| ✅ | PUT/PATCH | `/v1/geofences/{id}` | Update geofence |
| ✅ | DELETE | `/v1/geofences/{id}` | Delete geofence |
| ✅ | GET | `/v1/geofences/{id}/vehicles` | Vehicles assigned to geofence |
| ✅ | POST | `/v1/geofences/{id}/bulk-assign` | Bulk assign vehicles to geofence |
| ✅ | GET | `/v1/geofences/{id}/analytics` | Breach counts, dwell time, timeline |
| ✅ | GET | `/v1/analytics/gps/trip-summary` | GPS trip analytics |
| ✅ | GET | `/v1/analytics/gps/trips-over-time` | Trip volume timeline |
| ✅ | GET | `/v1/analytics/gps/device-status` | Device health across fleet |
| ✅ | GET | `/v1/analytics/gps/geofence-activity` | Geofence entry/exit analytics |
| ✅ | GET | `/v1/analytics/gps/top-by-distance` | Top vehicles by distance |
| ✅ | GET | `/v1/dashboard/vehicles/status` | Vehicle status distribution (`?include=trend`) |
| ⚠️ | POST | `/v1/webhook/gps-ingest` | GPS packet ingestion — internal; do not call from frontend |

### 1.2 WebSocket Channels

| Channel | Auth Check | Event Name | Broadcast Trigger |
|---------|-----------|------------|-------------------|
| `location.{imei}` | User's org must own device with that IMEI | `current.recent` | Every GPS packet processed |
| `location.vehicle.{vehicleId}` | Vehicle must belong to user's org | `current.recent` | Every GPS packet processed |
| `location.organization.{orgId}` | User's org_id must match | `current.recent` | Every GPS packet for any vehicle in org |
| `location.{imei}` | Same as above | `geofence.monitor` | Vehicle enters/exits geofence |
| `devicestatus.{orgId}.{imei}` | User's org_id must match | `device.status` | Device goes offline/online (threshold-based) |
| `fuel.vehicle.{vehicleId}` | Vehicle belongs to user's org | `fuel.level` | Fuel level update detected in telemetry |
| `fuel.alerts.{orgId}` | User's org_id must match | `fuel.event` | Fuel anomaly detected (theft, sudden drop, low) |
| `notification.{userId}` | User ID must match | `notification.sent` | In-app notification created |
| `vehicle.status.{orgId}` | User's org_id must match | `vehicle.status.changed` | Vehicle changes operational status (NEW — see §7) |

### 1.3 WebSocket — `current.recent` Payload

This is the single payload structure broadcast from `LocationUpdated` event through `BroadcastLocationListener`. The REST endpoint `GET /v1/vehicles/{id}/location/current` returns the same structure via `TelemetryFormatHelper`.

```json
{
  "device_imei": "862288040123456",
  "vehicle_id": "42",
  "organization_id": "org-uuid",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "timestamp_utc": "2026-03-09T14:30:00Z",
  "gps_datetime": "2026-03-09T14:30:00Z",
  "speed": 45,
  "ignition": "on",
  "movement": "on",
  "fuel_level_liters": 45.2,
  "fuel_level_percent": 68.4,
  "odometer": 12345.6,
  "altitude": 120,
  "heading": 270,
  "satellites": 8,
  "address": "Victoria Island, Lagos",
  "status": "in_transit",
  "metadata": {
    "movement": "on",
    "ignition": "on",
    "fuel_level": 45.2,
    "fuel_level_percent": 68.4,
    "trip_odometer": 45.6,
    "total_odometer": 12345.6,
    "engine_rpm": 2100,
    "engine_temperature": 90,
    "battery_voltage": 13.2,
    "external_voltage": 14.1,
    "immobilizer": false,
    "jamming": false,
    "idling": false,
    "unplug": false,
    "driving_state": "normal",
    "fuel_used_gps": 0.3,
    "fuel_rate_gps": 7.2,
    "eco_score": 78,
    "sleep_mode": false,
    "active_gsm_operator": "MTN",
    "door_status": "closed",
    "fuel_rate": 7.2,
    "load_weight": null,
    "oil_level": null
  }
}
```

**Status derivation logic (same in REST and WS):**
- `movement === 'on'` → `in_transit`
- `ignition === 'on' && movement === 'off'` → `stopped` (engine on, vehicle idle)
- all other combinations → `active`

### 1.4 WebSocket — `geofence.monitor` Payload (Enhanced — see §7)

```json
{
  "geofence_id": 12,
  "geofence_name": "Depot Zone A",
  "geofence_type": "polygon",
  "vehicle_id": "42",
  "device_imei": "862288040123456",
  "organization_id": "org-uuid",
  "message": "Vehicle has entered geofence zone",
  "in_geofenced_area": true
}
```

### 1.5 WebSocket — `device.status` Payload

```json
{
  "device_id": "862288040123456",
  "status": "offline",
  "old_status": "online",
  "threshold": 5
}
```

### 1.6 WebSocket — `vehicle.status.changed` Payload (NEW — see §7)

```json
{
  "vehicle_id": "42",
  "organization_id": "org-uuid",
  "old_status": "available",
  "new_status": "in_transit"
}
```

### 1.7 WebSocket — `fuel.level` Payload

```json
{
  "vehicle_id": "42",
  "fuel_level_liters": 45.2,
  "fuel_level_percent": 68.4
}
```

### 1.8 Audit Summary

| Area | Status | Notes |
|------|--------|-------|
| Fleet map initial load | ✅ Ready | Use `GET /v1/vehicles/locations` |
| Single vehicle location | ✅ Ready | Use `GET /v1/vehicles/{id}/location/current` |
| Org-wide location WS channel | ✅ Ready | `location.organization.{orgId}` event `current.recent` |
| Per-vehicle WS channel | ✅ Ready | `location.vehicle.{vehicleId}` event `current.recent` |
| Device status WS | ✅ Ready | `devicestatus.{orgId}.{imei}` event `device.status` |
| Fuel level WS | ✅ Ready | `fuel.vehicle.{vehicleId}` event `fuel.level` |
| Geofence overlay data | ✅ Ready | `GET /v1/geofences` |
| Geofence breach WS | ⚠️ Fixed | Payload was too sparse; enhanced in this iteration (§7) |
| Vehicle status changes WS | ❌ Fixed | `VehicleStatusChanged` was not broadcast; new event added (§7) |
| Sensor health | ✅ Ready | `GET /v1/vehicles/{id}/sensors/health` |
| Trip playback | ✅ Ready | `GET /v1/vehicles/{vehicle_id}/trips/{trip_id}/playback` |
| Trip events | ✅ Ready | `GET /v1/trips/{id}/events` |
| Geofence analytics | ✅ Ready | `GET /v1/geofences/{id}/analytics` |

---

## 2. Current Frontend Behavior & Gaps

### 2.1 What Currently Works

The frontend calls `GET /v1/vehicles` (the base vehicle list) and reads `current_location` from each vehicle object to place markers on the map. This gives a static snapshot of vehicle positions at page load.

### 2.2 Identified Gaps

| Gap | Severity | Root Cause |
|-----|----------|-----------|
| Map positions do not update after load | Critical | No WebSocket subscription anywhere in the live tracking view |
| Wrong API for map load | High | Frontend calls `GET /v1/vehicles` instead of `GET /v1/vehicles/locations` which returns the full telemetry block |
| Telemetry panel shows no real-time data | High | No WS subscription; panel relies only on initial REST data |
| Vehicle status badge does not update | High | `VehicleStatusChanged` was not broadcast (now fixed) |
| Geofence breach popup never appears | High | `geofence.monitor` WS event not subscribed; also payload lacked `geofence_id` (now fixed) |
| Device offline alert not shown on map | Medium | `device.status` WS event not subscribed |
| Fuel level gauge is static | Medium | `fuel.level` WS event not subscribed |
| Idling detection not displayed | Medium | `idling` field in metadata exists but not rendered |
| Speed gauge shows only initial value | Medium | No WS update applied to speed display |
| Heading/bearing arrow not used | Low | `heading` field exists in payload but marker rotation not implemented |

---

## 3. Product Specification

> **Design principle:** Do not redesign existing screens. Improve data freshness and add real-time indicators in-place.

### 3.1 Fleet Map View

**Goal:** Show every vehicle's live position, status, and key metrics. Update without page reload.

#### Map Markers

Each vehicle marker on the map must:
- Rotate to reflect the vehicle's `heading` value from the telemetry packet
- Change color to reflect operational status:
  - Green → `in_transit` (movement on)
  - Amber → `stopped` (ignition on, movement off — idling)
  - Grey → `active` / offline (ignition off or no recent packet)
  - Red → device `offline` (no packet in > 5 minutes)
- Show a pulsing ring animation when a new WS packet is received (300ms fade)
- Show a fuel warning icon when `fuel_level_percent < 20`

#### Map Information Tooltip (hover)

On marker hover, display a small tooltip containing:
```
[Vehicle Number]  [Registration]
Speed: 45 km/h    Ignition: On
Status: In Transit
Last seen: 2 min ago
```

All values populated from the last `current.recent` WS packet, falling back to the REST load value.

#### Fleet Sidebar List

The vehicle list panel alongside the map must:
- Show a colored status dot matching marker color
- Show `speed` value from latest telemetry
- Show `fuel_level_percent` as a small horizontal bar
- Highlight and bold the row when a new WS packet arrives (brief flash)
- Show "OFFLINE" badge in red when `device.status` event sets status to `offline`
- Update vehicle status label in real-time from `vehicle.status.changed` WS event

#### Status Counts Bar

At the top of the map view, show four counters derived from the current vehicle states (not a separate API call — computed from in-memory marker states):
- All | Moving | Stopped | Offline | Online |

These update as WS packets change individual vehicle states.

---

### 3.2 Vehicle Telemetry Panel

When a vehicle marker or sidebar row is clicked, a side panel opens. It must be populated with data from `GET /v1/vehicles/{id}/location/current` on open, then kept live via `location.vehicle.{vehicleId}` WS subscription.

#### Panel Sections

**Header**
- Vehicle display number, registration, make/model
- Online/Offline badge (derived from `device.last_packet_received_at` within 5 min)
- Close button

**Live Position**
- `latitude` / `longitude` (formatted to 6 decimal places)
- `address` (reverse geocode label from telemetry — pre-resolved by backend)
- `gps_datetime` formatted as local time "Last updated: 14:32:05"
- GPS quality indicator: satellites count, signal dots

**Motion Data** (updates per WS packet)
| Field | Source | Display |
|-------|--------|---------|
| Speed | `speed` | "45 km/h" with gauge/arc |
| Heading | `heading` | Compass bearing label + arrow icon |
| Movement | `metadata.movement` | "Moving" / "Stationary" pill |
| Ignition | `ignition` | "On" (green) / "Off" (grey) pill |
| Idling | `metadata.idling` | Amber "Idling" badge when `true` |

**Fuel & Engine** (updates per WS packet)
| Field | Source | Display |
|-------|--------|---------|
| Fuel Level | `fuel_level_percent` | Percentage bar with color (red <20%, amber <40%) |
| Fuel (liters) | `fuel_level_liters` | "45.2 L" |
| Fuel Rate | `metadata.fuel_rate_gps` | "7.2 L/100km" |
| Engine RPM | `metadata.engine_rpm` | "2,100 rpm" |
| Engine Temp | `metadata.engine_temperature` | "90°C" with warning >105°C |
| Odometer | `odometer` | "12,345.6 km" |

**Electrical**
| Field | Source | Display |
|-------|--------|---------|
| Battery Voltage | `metadata.battery_voltage` | "13.2V" with warning <11.8V |
| External Voltage | `metadata.external_voltage` | "14.1V" |
| Jamming Detected | `metadata.jamming` | Red "JAMMING" badge when `true` |
| Immobilizer | `metadata.immobilizer` | Badge when active |

**Eco Score** (if present in metadata)
- `metadata.eco_score` → displayed as circular score badge (0–100)
- Color: green ≥70, amber 40–69, red <40

**Sensor Health** (loaded once on open from REST, not updated via WS)
- Calls `GET /v1/vehicles/{id}/sensors/health`
- Shows overall `health_score` as a percentage ring
- Lists each sensor: fuel, device, engine, battery with status pill

---

### 3.3 Geofence Overlay

**Goal:** Show geofence zones on the map as colored polygon/circle overlays, highlight breaches in real-time.

#### Loading Geofences

On map load, call `GET /v1/geofences` and render each geofence as:
- **Polygon:** stroke `#4f7cff` 2px, fill `rgba(79, 124, 255, 0.08)`
- **Circle:** same color scheme, radius from geofence data

When a user hovers a geofence polygon:
- Tooltip: name, type, vehicle count assigned, breach count (7 days from analytics)

#### Geofence Breach Alert (Real-time)

Subscribe to `location.organization.{orgId}` and listen for event `geofence.monitor`.

When received:
1. Flash the geofence polygon border (2s amber pulse animation)
2. Show a toast notification at top-right: "[Vehicle Number] has entered/exited [Geofence Name]"
3. Add an entry to the in-page alert feed (if a dedicated alert panel exists)

The `geofence.monitor` payload now includes `geofence_id` so the map can target the correct polygon.

#### Geofence Panel (click on polygon)

When a geofence polygon is clicked, open a panel with:
- Geofence name, type, vehicle count
- "Vehicles in zone" list (from `GET /v1/geofences/{id}/vehicles`)
- Analytics summary (from `GET /v1/geofences/{id}/analytics`): total breaches, avg dwell time
- "Edit" / "Assign Vehicles" / "View Analytics" action buttons

**Assign Vehicles (Bulk):**
- Multi-select vehicle list
- On confirm → `POST /v1/geofences/{id}/bulk-assign` with `vehicle_ids: [...]`

---

### 3.4 Trip Tracking

**Goal:** Show active trips on the map as route lines with driver and stop info.

#### Active Trip Overlay

For vehicles with status `in_transit`, fetch their active trip via `GET /v1/trips?status=ongoing&vehicle_id={id}` and draw:
- Blue polyline from trip `start_location` to `end_location`
- Grey dashed line for planned route waypoints (from `GET /v1/trips/{id}/routes`)
- Vehicle marker moves along the blue line as WS packets arrive

#### Trip Info Callout

When clicking a vehicle in transit, the telemetry panel shows an additional "Active Trip" section:
- Trip reference number
- Driver name (from `driver` relationship)
- Departure time, expected arrival (ETA)
- Progress bar: distance covered / total distance
- Next checkpoint name and ETA

#### Trip Events Feed

In the telemetry panel trip section, list recent trip events from `GET /v1/trips/{id}/events`:
- `harsh_braking` → red badge
- `overspeeding` → amber badge
- `route_deviation` → blue badge
- `checkpoint_reached` → green badge

Each event: icon + label + timestamp + location.

---

### 3.5 Trip Playback

**Goal:** Allow fleet managers to replay any historical trip on the map.

**Entry point:** From trip list or vehicle trip history, click "Replay".

**API:** `GET /v1/vehicles/{vehicle_id}/trips/{trip_id}/playback`

**Response provides:**
- `trip`: metadata (start/end time, distance, fuel used, harsh event count)
- `timeline_events`: chronological GPS + event records
- `summary`: aggregated stats

**UI Behavior:**
1. Load playback data and show vehicle at starting position
2. Play/Pause button advances marker along recorded GPS points at 10× real speed
3. Timeline scrubber allows jumping to any point
4. Events panel on the right shows events as the playback cursor passes them
5. Speed display updates to the GPS speed at each playback point
6. Show trip route polyline (completed portion in solid blue, remaining in dashed)

**Playback Controls:**
- Play / Pause
- Speed selector: 1×, 5×, 10×, 30×
- Scrubber (seek to time)
- "Back to Live" button to exit playback and return to real-time map

---

### 3.6 Device & Sensor Health

**Goal:** Surface device connectivity issues without requiring a separate screen visit.

#### On-Map Indicators

- Vehicles with `device.status` = `offline` show a red ⚡ icon overlaid on marker
- Clicking the icon opens a mini-panel showing device last-seen time and suggested action

#### Sensor Health Panel Tab

Inside the vehicle telemetry panel, a "Health" tab shows the `GET /v1/vehicles/{id}/sensors/health` response:
- Overall score: large circular gauge
- Sensor list: name, status pill (Normal / Warning / Critical), description, suggested action
- Anomaly count badge if > 0

#### Real-time Device Status Updates

Subscribe to `devicestatus.{orgId}.{imei}` for each vehicle that has a device.

On `device.status` event:
- Change marker overlay icon
- Update vehicle row badge in sidebar
- If status is `offline`: show a system toast "Device [IMEI] went offline — [Vehicle Number]"

---

### 3.7 Real-time Alerts on Map

**Notification Feed Panel** (drawer or side panel):

| Event | Channel | Trigger |
|-------|---------|---------|
| Vehicle entered geofence | `location.organization.{orgId}` | `geofence.monitor` with `in_geofenced_area: true` |
| Vehicle exited geofence | same | `geofence.monitor` with `in_geofenced_area: false` |
| Device went offline | `devicestatus.{orgId}.{imei}` | `device.status` → `offline` |
| Fuel critical | `fuel.alerts.{orgId}` | `fuel.event` |
| Vehicle status changed | `vehicle.status.{orgId}` | `vehicle.status.changed` |

Each alert entry: icon + vehicle name + description + timestamp + "Go to vehicle" link.

Unread count badge on the alert bell icon. Clicking clears the count.

---

## 4. WebSocket Architecture

### 4.1 Technology

The backend uses **Laravel Reverb** (WebSocket server) with **Laravel Echo** client library. Authentication uses Bearer token passed to the `/broadcasting/auth` endpoint.

### 4.2 Channel Subscription Strategy

The frontend must subscribe to channels in a layered approach:

**Layer 1 — Always subscribed (on live tracking page mount):**
```
location.organization.{orgId}          → event: current.recent
vehicle.status.{orgId}                 → event: vehicle.status.changed
fuel.alerts.{orgId}                    → event: fuel.event
```
This single org-level subscription receives location updates for ALL vehicles. It replaces polling and individual per-vehicle subscriptions for the fleet map.

**Layer 2 — Subscribed when a specific vehicle is selected/panel opened:**
```
location.vehicle.{vehicleId}           → event: current.recent   (higher frequency)
fuel.vehicle.{vehicleId}               → event: fuel.level
devicestatus.{orgId}.{vehicleImei}     → event: device.status
```
Unsubscribe from these channels when the vehicle panel is closed.

**Layer 3 — Subscribed for notifications (app-wide):**
```
notification.{userId}                  → event: notification.sent
```

### 4.3 Laravel Echo Setup

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: '/broadcasting/auth',
  auth: {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      'X-Request-Type': 'client',   // Required — IdentifyRequestSource middleware
    },
  },
});
```

### 4.4 Fleet Map Subscription (Layer 1)

```javascript
// Mount — subscribe to org-wide location updates
const orgChannel = echo.private(`location.organization.${orgId}`);

orgChannel.listen('.current.recent', (packet) => {
  const vehicleId = packet.vehicle_id;

  // 1. Move marker on map
  updateMarkerPosition(vehicleId, packet.latitude, packet.longitude);

  // 2. Rotate marker to heading
  rotateMarker(vehicleId, packet.heading);

  // 3. Update status color
  updateMarkerStatus(vehicleId, packet.status);

  // 4. Update sidebar row
  updateSidebarRow(vehicleId, {
    speed: packet.speed,
    fuelPercent: packet.fuel_level_percent,
    status: packet.status,
    lastSeen: packet.gps_datetime,
  });

  // 5. Update counters bar
  recomputeStatusCounts();
});

// Also listen for geofence alerts on the org channel
orgChannel.listen('.geofence.monitor', (alert) => {
  showGeofenceBreachToast(alert);
  flashGeofencePolygon(alert.geofence_id);
  appendToAlertFeed(alert);
});

// Vehicle status changes
echo.private(`vehicle.status.${orgId}`)
  .listen('.vehicle.status.changed', (event) => {
    updateVehicleStatusBadge(event.vehicle_id, event.new_status);
  });
```

### 4.5 Vehicle Panel Subscription (Layer 2)

```javascript
// Called when vehicle panel opens
function subscribeToVehicle(vehicleId, deviceImei) {
  const vehicleChannel = echo.private(`location.vehicle.${vehicleId}`);

  vehicleChannel.listen('.current.recent', (packet) => {
    // Update all panel fields
    updatePanelSpeed(packet.speed);
    updatePanelFuel(packet.fuel_level_percent, packet.fuel_level_liters);
    updatePanelHeading(packet.heading);
    updatePanelIgnition(packet.ignition);
    updatePanelIdling(packet.metadata?.idling);
    updatePanelRpm(packet.metadata?.engine_rpm);
    updatePanelEngineTemp(packet.metadata?.engine_temperature);
    updatePanelBattery(packet.metadata?.battery_voltage);
    updatePanelEcoScore(packet.metadata?.eco_score);
    updatePanelAddress(packet.address);
    updatePanelSatellites(packet.satellites);
    updatePanelLastSeen(packet.gps_datetime);
    flashPanelReceivedIndicator(); // brief pulse to show data is live
  });

  // Fuel events
  echo.private(`fuel.vehicle.${vehicleId}`)
    .listen('.fuel.level', (event) => {
      updatePanelFuel(event.fuel_level_percent, event.fuel_level_liters);
    });

  // Device status
  echo.private(`devicestatus.${orgId}.${deviceImei}`)
    .listen('.device.status', (event) => {
      updateDeviceStatusIndicator(vehicleId, event.status);
      if (event.status === 'offline') {
        showDeviceOfflineToast(vehicleId, deviceImei);
      }
    });
}

// Called when panel closes
function unsubscribeFromVehicle(vehicleId, deviceImei) {
  echo.leave(`location.vehicle.${vehicleId}`);
  echo.leave(`fuel.vehicle.${vehicleId}`);
  echo.leave(`devicestatus.${orgId}.${deviceImei}`);
}
```

### 4.6 Status Field Mapping

Map the `status` field from WS payload to UI:

| `status` value | Marker Color | Label |
|---------------|--------------|-------|
| `in_transit` | Green | Moving |
| `stopped` | Amber | Idling |
| `active` | Grey | Parked |
| `offline` (from device.status event) | Red | Offline |

Map `metadata.driving_state` to driving badge:
- `normal` → no badge
- `harsh` → "Harsh Driving" amber badge
- `overspeeding` → "Speeding" red badge

---

## 5. REST API Reference

### 5.1 Fleet Map Initial Load

**Endpoint:** `GET /v1/vehicles/locations`

**Query params:** `?per_page=100&page=1`

**Response shape (per vehicle):**
```json
{
  "id": "42",
  "attributes": {
    "make": "Toyota",
    "model": "Corolla",
    "registration_number": "LAG-421-AA",
    "display_number": "VH-042",
    "device_id": "862288040123456",
    "status": "in_transit",
    "device_status": "online",
    "last_packet_received_at": "2026-03-09T14:30:00Z",
    "telemetry": {
      "latitude": 6.5244,
      "longitude": 3.3792,
      "speed": 45,
      "heading": 270,
      "ignition": "on",
      "movement": "on",
      "fuel_level_percent": 68.4,
      "status": "in_transit",
      "gps_datetime": "2026-03-09T14:30:00Z",
      "metadata": { ... }
    }
  }
}
```

> Use `attributes.telemetry` for map placement. Fall back to `null` check — if `telemetry` is null, the vehicle has no GPS data yet; show in sidebar as "No Signal."

### 5.2 Single Vehicle Current Location

**Endpoint:** `GET /v1/vehicles/{id}/location/current`

Returns the same `TelemetryFormatHelper` format as WS broadcast — use for initial panel load before WS packets arrive.

### 5.3 Sensor Health

**Endpoint:** `GET /v1/vehicles/{id}/sensors/health`

**Response:**
```json
{
  "vehicle_id": 42,
  "vehicle_registration": "LAG-421-AA",
  "sensors": [
    {
      "name": "Fuel Sensor",
      "category": "fuel",
      "status": "normal",
      "current_value": 45.2,
      "unit": "liters",
      "health_score": 100,
      "anomaly_type": null,
      "description": "Fuel sensor operating normally",
      "suggested_action": "No action required"
    },
    {
      "name": "GPS Device",
      "category": "device",
      "status": "normal",
      "current_value": "online",
      "health_score": 100
    }
  ],
  "health_score": 97,
  "anomaly_count": 0,
  "status_summary": { "normal": 3, "warning": 0, "critical": 0 }
}
```

### 5.4 Trip Playback

**Endpoint:** `GET /v1/vehicles/{vehicle_id}/trips/{trip_id}/playback`

**Response:**
```json
{
  "data": {
    "trip": {
      "id": 1,
      "trip_number": "TRP-202603-00001",
      "actual_start_time": "2026-03-09T08:00:00Z",
      "actual_end_time": "2026-03-09T10:45:00Z",
      "distance_km": 145.3,
      "fuel_used": 12.4,
      "harsh_events_count": 2
    },
    "timeline_events": [
      {
        "event_type": "location",
        "event_time": "2026-03-09T08:02:00Z",
        "location": { "latitude": 6.5244, "longitude": 3.3792 },
        "speed": 0
      },
      {
        "event_type": "harsh_braking",
        "event_time": "2026-03-09T09:15:00Z",
        "location": { "latitude": 6.5312, "longitude": 3.3901 },
        "description": "Harsh braking detected"
      }
    ],
    "summary": {
      "total_events": 48,
      "harsh_events": 2,
      "max_speed": 112,
      "avg_speed": 67
    }
  }
}
```

### 5.5 Geofence Analytics

**Endpoint:** `GET /v1/geofences/{id}/analytics?days=30`

**Response:**
```json
{
  "data": {
    "total_breaches": 47,
    "vehicle_ranking": [
      { "vehicle_id": 42, "registration": "LAG-421-AA", "breach_count": 12 }
    ],
    "timeline": [
      { "date": "2026-03-01", "breaches": 3 }
    ],
    "avg_dwell_seconds": 1840,
    "peak_hour": 14
  }
}
```

### 5.6 Geofence Bulk Assign

**Endpoint:** `POST /v1/geofences/{id}/bulk-assign`

**Body:**
```json
{ "vehicle_ids": [42, 17, 88] }
```

**Response:** Updated geofence with vehicle count.

---

## 6. Implementation Guide

> Written as a senior software engineer. This section covers the integration mechanics for the frontend developer.

### 6.1 Page Lifecycle

```
1. User navigates to /live-tracking
2. Call GET /v1/vehicles/locations → render all markers + sidebar list
3. Call GET /v1/geofences → render geofence polygons on map
4. Initialise Echo → subscribe to Layer 1 channels (org location + vehicle.status + fuel.alerts)
5. Begin receiving WS packets → update markers, sidebar, status counts

On vehicle click:
6. Call GET /v1/vehicles/{id}/location/current → pre-fill telemetry panel
7. Subscribe to Layer 2 channels for that vehicle (location.vehicle, fuel.vehicle, devicestatus)
8. Optionally call GET /v1/vehicles/{id}/sensors/health → populate health tab
9. If vehicle has active trip → call GET /v1/trips/{id}/events and GET /v1/trips/{id}/routes

On vehicle panel close:
10. Unsubscribe from Layer 2 channels
```

### 6.2 State Management

Maintain a central store (Vuex/Pinia/Redux/Zustand — match existing app state solution) with:

```javascript
vehicleStore = {
  vehicles: {
    [vehicleId]: {
      // From REST
      id, displayNumber, registration, make, model, deviceId,
      // From telemetry (REST or WS — same shape)
      latitude, longitude, speed, heading, status, ignition,
      fuelLevelPercent, fuelLevelLiters, odometer,
      gpsDatetime, address,
      metadata: { ... },
      // Device
      deviceStatus, lastPacketAt, isOnline,
    }
  },
  selectedVehicleId: null,
  statusCounts: { in_transit: 0, stopped: 0, active: 0, offline: 0 },
  alerts: [],
}
```

On each `current.recent` WS event: `Object.assign(store.vehicles[vehicleId], patch)` — do not replace the whole object, patch only the received fields to avoid flicker.

### 6.3 Handling No-GPS Vehicles

Vehicles returned by `GET /v1/vehicles/locations` with `attributes.telemetry === null` have no GPS data. These vehicles:
- Do NOT place a marker on the map
- DO appear in the sidebar list with "No Signal" badge
- Show `last_packet_received_at` from `attributes.last_packet_received_at` or "Never"

### 6.4 Marker Heading / Rotation

The `heading` field is 0–359 degrees (0 = North, 90 = East). Apply as CSS rotation on the marker SVG:

```javascript
marker.style.transform = `rotate(${heading}deg)`;
```

When `heading` is `null` (no GPS fix or parked): no rotation, use default arrow pointing up.

### 6.5 Connection Recovery

Echo handles reconnection automatically, but on reconnect, refetch `GET /v1/vehicles/locations` to patch any position changes missed during the disconnect window:

```javascript
echo.connector.pusher.connection.bind('connected', () => {
  if (wasDisconnected) {
    refreshFleetPositions();
    wasDisconnected = false;
  }
});
echo.connector.pusher.connection.bind('disconnected', () => {
  wasDisconnected = true;
});
```

### 6.6 Performance Considerations

- Org-level location channel fires once per GPS packet per vehicle. For large fleets (>200 vehicles), batch DOM updates using `requestAnimationFrame` rather than updating per packet.
- Only subscribe to individual `location.vehicle.{id}` when a panel is open. Avoid subscribing to all vehicles simultaneously.
- Geofence polygons: only load for the visible map viewport if the org has > 50 geofences (use bounding-box filter if added later).
- Sensor health: call once on panel open; do not auto-refresh — sensor status changes slowly.

### 6.7 Geofence Breach Visual Flow

```
WS packet arrives on location.organization.{orgId} → event: geofence.monitor
  │
  ├── Find polygon on map by alert.geofence_id
  │   └── Apply pulse animation (border: amber, 2s ease-out)
  │
  ├── Show toast notification
  │   "[Vehicle display_number] entered [geofence_name]"   OR
  │   "[Vehicle display_number] exited [geofence_name]"
  │
  └── Append to alert feed panel
      { type: 'geofence', vehicleId, geofenceName, inZone, timestamp }
```

---

## 7. Backend Gaps — Fixed in This Iteration

### 7.1 Gap: `GeofenceAlertEvent` payload too sparse

**Problem:** The event only broadcast `{message, in_geofenced_area}`. The frontend could not identify which geofence triggered the alert or which vehicle crossed it.

**Fix:** Enhanced `broadcastWith()` to include `geofence_id`, `geofence_name`, `vehicle_id`, `device_imei`, `organization_id`.

Additionally, `GeofenceAlertEvent` now also broadcasts on `location.organization.{orgId}` so the fleet map receives geofence alerts for all vehicles without subscribing to individual IMEI channels.

**Files changed:** `app/Events/GeofenceAlertEvent.php`

### 7.2 Gap: `VehicleStatusChanged` not broadcast

**Problem:** When a vehicle's operational status changed (e.g., trip started → `in_transit`), no WebSocket event was fired. The fleet map sidebar status badges were permanently stale.

**Fix:** Created new `VehicleStatusBroadcast` event implementing `ShouldBroadcastNow`. Dispatched alongside the existing `VehicleStatusChanged` event in `UpdateVehicleStatus` listener and `UpdateVehicleStatusListener` telemetry listener.

**Files changed / created:**
- `app/Events/VehicleStatusBroadcast.php` (new)
- `app/Listeners/UpdateVehicleStatus.php` (dispatch added)
- `app/Listeners/Telemetry/UpdateVehicleStatusListener.php` (dispatch added)
- `routes/channels.php` (new channel auth: `vehicle.status.{orgId}`)
