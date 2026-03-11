# EonsFleet — Geofencing System

> End-to-end reference for the geofence module: data model, detection flow, API, and events.
> Last updated: 2026-03-11

---

## Overview

The geofencing module lets fleet managers define virtual boundaries on a map and receive real-time alerts whenever a tracked vehicle enters or exits those boundaries. It also records how long each vehicle dwells inside a zone and exposes breach analytics.

**Key characteristics:**
- Supports **circle** and **polygon** shapes
- 30 m hysteresis band on circles prevents entry/exit flapping at boundaries
- Active-hours scheduling — fences only trigger inside a configured time window
- Dwell session tracking (open on entry, close + compute duration on exit)
- Real-time broadcasts via Laravel Reverb (WebSocket)
- Gated behind `org.subscription:geofence` — Standard plan feature

---

## Data Model

### `geofences`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `organization_id` | bigint FK | Auto-filled by `BelongsToOrganization` |
| `geofence_id` | integer | 8-digit random display ID |
| `name` | string | Human label |
| `description` | string nullable | |
| `type` | string | `circle` or `polygon` |
| `speed` | integer | Speed limit in km/h |
| `radius` | float nullable | Metres — circle only |
| `coordinates` | jsonb | Circle: `{"latitude":F,"longitude":F}` · Polygon: `[{"lat":F,"lng":F},…]` |
| `location` | string | Free-text location label |
| `category` | string nullable | e.g. `high`, `medium`, `low` |
| `tags` | jsonb array | String tags for filtering |
| `active_hours` | jsonb nullable | `{"days":[1-7],"start":"HH:MM","end":"HH:MM"}` |
| `max_dwell_minutes` | integer nullable | Alert threshold for time inside |
| `status` | boolean | `true` = active |
| `deleted_at` | timestamp | SoftDeletes |

### `geofence_vehicles`

Pivot table linking a geofence to the vehicles monitored inside it.

| Column | Type |
|---|---|
| `geofence_id` | bigint FK |
| `vehicle_id` | bigint FK |
| `created_at` | timestamp |
| `updated_at` | timestamp |

### `geofence_alert_histories`

A record is created every time a vehicle crosses a geofence boundary (entry or exit).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `organization_id` | bigint FK | |
| `geofence_id` | bigint FK | |
| `vehicle_id` | bigint FK | |
| `status` | integer FK | Status slug: `entry_detected` or `exit_detected` |
| `cordinate` | jsonb | `{"latitude":F,"longitude":F}` at time of crossing |
| `deleted_at` | timestamp | SoftDeletes |

### `geofence_dwell_sessions`

Tracks the time a vehicle spends inside a geofence.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `vehicle_id` | bigint FK | |
| `geofence_id` | bigint FK | |
| `entered_at` | datetime | When the vehicle entered |
| `exited_at` | datetime nullable | `null` while vehicle is still inside |
| `duration_seconds` | integer nullable | Computed on exit |
| `entry_coordinate` | jsonb | `{"latitude":F,"longitude":F}` |
| `exit_coordinate` | jsonb nullable | Set on exit |

---

## Detection Flow

```
GPS Packet arrives (ProcessTrackingData action)
    │
    ▼
CheckGeofencingListener::handle()
    │  Loads vehicle's assigned geofences (via geofence_vehicles pivot)
    │  Dispatches CheckGeofencJob to 'geofencing' queue
    │
    ▼
CheckGeofencJob::handle()
    │
    ├─ bindTenantContext() — sets org scope for Eloquent
    ├─ Skip if geofence is inactive (status=false)
    ├─ Skip if outside active_hours schedule
    │
    ├─ evaluateFence()
    │   ├─ type=circle  → Haversine distance → checkGeofenceStatus() with 30m hysteresis
    │   │   ├─ distance ≤ radius            → ['within', true]
    │   │   ├─ distance > radius + 30m      → ['outside', false]
    │   │   └─ in hysteresis band           → [null, null]  (no event)
    │   └─ type=polygon → Ray-casting (isPointInPolygon())
    │       ├─ inside   → ['within', true]
    │       └─ outside  → ['outside', false]
    │
    ├─ On state change:
    │   ├─ GeofenceAlertEvent::dispatch() — broadcasts to Reverb
    │   ├─ GeofenceAlertHistory record created (cordinate + status)
    │   └─ trackDwellSession()
    │       ├─ 'within'  → open new GeofenceDwellSession (if none open)
    │       └─ 'outside' → close open session, compute duration_seconds
    │
    └─ releaseTenantContext()
```

---

## Active Hours Schedule

Fences can be configured to only trigger during a specific time window. When `active_hours` is null/empty the fence is always active.

```json
{
  "active_hours": {
    "days": [1, 2, 3, 4, 5],
    "start": "08:00",
    "end": "18:00"
  }
}
```

Day numbers follow ISO-8601: `1=Monday … 7=Sunday`.

---

## Broadcasting Events

`GeofenceAlertEvent` is broadcast on two Reverb channels:

| Channel | Who receives |
|---|---|
| `private-device.{imei}` | Device-specific listener (single vehicle) |
| `private-org.{orgId}.fleet` | Fleet-wide listener (all org vehicles) |

**Payload:**
```json
{
  "message": "Vehicle ABC-123 is within geofence 'Warehouse Zone'",
  "inside": true,
  "geofenceId": 42,
  "geofenceName": "Warehouse Zone",
  "geofenceType": "circle",
  "vehicleId": 7,
  "orgId": 1
}
```

---

## API Endpoints

All endpoints are prefixed `/v1/geofences` and require:
- `Authorization: Bearer {token}`
- `X-Request-Type: client`
- Active `geofence` subscription feature

---

### `POST /v1/geofences` — Create Geofence

**Request body — circle:**
```json
{
  "name": "Warehouse Zone",
  "description": "Main warehouse perimeter",
  "type": "circle",
  "speed": 30,
  "radius": 500,
  "coordinates": {
    "latitude": 6.5244,
    "longitude": 3.3792
  },
  "location": "Ikeja Industrial Estate, Lagos",
  "category": "high",
  "tags": ["warehouse", "restricted"],
  "active_hours": {
    "days": [1, 2, 3, 4, 5],
    "start": "06:00",
    "end": "22:00"
  },
  "max_dwell_minutes": 60,
  "status": true,
  "vehicles": [1, 2, 3]
}
```

**Request body — polygon:**
```json
{
  "name": "Lagos Island Zone",
  "type": "polygon",
  "speed": 50,
  "coordinates": [
    { "lat": 6.455, "lng": 3.384 },
    { "lat": 6.461, "lng": 3.395 },
    { "lat": 6.453, "lng": 3.401 },
    { "lat": 6.447, "lng": 3.389 }
  ],
  "location": "Lagos Island, Lagos",
  "vehicles": [4, 5]
}
```

**Field reference:**

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | 3–100 chars |
| `description` | No | max 500 chars |
| `type` | Yes | `circle` or `polygon` |
| `speed` | Yes | km/h, 0–300 |
| `radius` | Circle only | metres, 50–50,000 |
| `coordinates` | Yes | Object for circle; array of `{lat,lng}` for polygon (min 3, max 100) |
| `location` | Yes | Free-text address |
| `category` | No | Free-text label |
| `tags` | No | Array of strings |
| `active_hours` | No | `{days:[1-7], start:"HH:MM", end:"HH:MM"}` |
| `max_dwell_minutes` | No | Integer ≥ 1 |
| `status` | No | Default `true` |
| `vehicles` | No | Array of vehicle IDs |

**Response `201`:**
```json
{
  "message": "Geofence created successfully",
  "data": {
    "geofence": {
      "id": "42",
      "attributes": {
        "geofence_id": "12345678",
        "name": "Warehouse Zone",
        "description": "Main warehouse perimeter",
        "type": "circle",
        "speed": 30,
        "radius": 500,
        "location": "Ikeja Industrial Estate, Lagos",
        "coordinates": { "latitude": 6.5244, "longitude": 3.3792 },
        "category": "high",
        "tags": ["warehouse", "restricted"],
        "active_hours": { "days": [1,2,3,4,5], "start": "06:00", "end": "22:00" },
        "max_dwell_minutes": 60,
        "status": true,
        "created_at": "2026-03-11T10:00:00+01:00"
      },
      "relationships": {
        "vehicles": [
          {
            "id": 1,
            "display_number": "VH-001",
            "registration_number": "ABC-123XY",
            "device_id": 5,
            "status": "active",
            "current_location": {
              "latitude": 6.521,
              "longitude": 3.379,
              "gps_datetime": "2026-03-11T09:55:00+01:00",
              "speed": 0,
              "address": "Ikeja, Lagos"
            }
          }
        ]
      }
    }
  },
  "status": 201
}
```

---

### `GET /v1/geofences` — List Geofences

**Query params:**

| Param | Default | Notes |
|---|---|---|
| `page` | 1 | |
| `per_page` | 10 | |
| `search` | — | Searches name/location |
| `status` | — | Filter by status |
| `sortBy` | `created_at` | |
| `orderBy` | `desc` | |

**Response `200`:**
```json
{
  "data": {
    "geofences": [ { /* GeofenceResource */ } ],
    "pagination": { "current_page": 1, "per_page": 10, "total": 25, "last_page": 3 }
  }
}
```

---

### `GET /v1/geofences/{id}` — Get Geofence

Returns full geofence detail including assigned vehicles with their current locations.

---

### `PUT/PATCH /v1/geofences/{id}` — Update Geofence

All fields are optional (partial update). Same field set as create.

When `vehicles` is provided it **replaces** the entire vehicle list (sync). If `vehicles` is omitted, vehicles are **detached**.

---

### `DELETE /v1/geofences/{id}` — Delete Geofence

Soft-deletes the geofence.

**Response `200`:**
```json
{ "message": "Geofence deleted successfully" }
```

---

### `GET /v1/geofences/{id}/vehicles` — List Geofence Vehicles

Returns the vehicles currently assigned to this geofence.

---

### `POST /v1/geofences/{id}/bulk-assign` — Bulk Assign Vehicles

Adds vehicles to the geofence **without** removing existing assignments (`syncWithoutDetaching`).

**Request body:**
```json
{ "vehicle_ids": [1, 2, 3] }
```

---

### `GET /v1/geofences/{id}/alerts` — Alert History

Returns a paginated log of all entry/exit events for this geofence.

**Query params:** `per_page` (default 15), `page`

**Response item:**
```json
{
  "id": "101",
  "attributes": {
    "status": "entry_detected",
    "coordinate": { "latitude": 6.524, "longitude": 3.379 },
    "created_at": "2026-03-11T08:30:00+01:00"
  },
  "relationships": {
    "vehicle": { "id": 1, "registration_number": "ABC-123XY" },
    "geofence": { "id": 42, "name": "Warehouse Zone" }
  }
}
```

---

### `GET /v1/geofences/{id}/analytics` — Geofence Analytics

**Query params:** `days` (default 30)

**Response:**
```json
{
  "data": {
    "analytics": {
      "geofence_id": 42,
      "geofence_name": "Warehouse Zone",
      "period_days": 30,
      "total_breaches": 148,
      "vehicle_ranking": [
        { "vehicle_id": 1, "vehicle_registration": "ABC-123XY", "breach_count": 42 }
      ],
      "breach_timeline": [
        { "date": "2026-03-10", "breaches": 12 },
        { "date": "2026-03-11", "breaches": 8 }
      ],
      "avg_dwell_minutes": 14.5
    }
  }
}
```

---

## Role Access

| Action | Roles |
|---|---|
| Create / Update / Delete | `fleet_manager`, `administrator` |
| View / List / Analytics | `fleet_manager`, `administrator`, `dispatcher`, `compliance` |

---

## Subscription Gate

All geofence routes require the `geofence` feature on the organisation's subscription (`org.subscription:geofence` middleware). Requests from organisations without this feature return `403`.
