# Product Requirement Document (PRD): Core Fleet Modules

This document outlines the technical requirements, endpoint integration, and UI guidelines for implementing the four core operational modules of the Eonsfleet system.

---

## 1. Dashboard (The Command Center)
**Goal**: Provide a high-level summary of fleet health, operational efficiency, and urgent alerts.

### A. Key Components & Endpoints

#### 1. Executive Summary Stats (StatCards)
- **Endpoint**: `GET /api/v1/analytics/fleet/utilization-summary`
- **Purpose**: Fetch "Total Vehicles", "Total Trips", and "Total Distance".
- **Sample Response**:
```json
{
  "message": "Fleet utilization summary",
  "data": {
    "total_vehicles": 3167,
    "active_vehicles": 1240,
    "total_trips": 450,
    "total_distance_km": 12500.5
  }
}
```

#### 2. Fleet Availability Snapshot (Donut Chart)
- **Endpoint**: `GET /api/v1/analytics/fleet/availability-snapshot`
- **Purpose**: Detailed breakdown of vehicle statuses (Active, Idle, Maintenance).
- **Sample Response**:
```json
{
  "message": "Fleet availability snapshot",
  "data": {
    "active": 12, "idle": 4, "maintenance": 2, "out_of_service": 1
  }
}
```

#### 3. Incident Activity Feed
- **Endpoint**: `GET /api/v1/analytics/incidents/summary`
- **Purpose**: Real-time counter of alerts. Combine with `/api/v1/notifications` for the feed.
- **Sample Response**:
```json
{
  "message": "Incident summary report",
  "data": {
    "total": 80, "open": 56, "resolved": 16, "closed": 0, "dismissed": 8, "escalated": 0
  }
}
```

### [Suggested Improvement]
- **Predictive Card**: Add a card for "Upcoming Maintenance" using `GET /api/v1/analytics/insights/predictive-maintenance` to show at-risk vehicles directly on the dashboard.

---

## 2. Real-Time Tracking (Live Tracking)
**Goal**: Monitor asset positions, movement status, and telemetry in real-time.

### A. Key Components & Endpoints

#### 1. Live Fleet Summary (Sidebar Search/Filter)
- **Endpoint**: `GET /api/v1/tracker/metrics`
- **Purpose**: Get the latest state of all tracked assets to populate the searchable sidebar.
- **Sample Response**:
```json
{
  "message": "success",
  "data": [
    {
      "device_id": "12345678",
      "registration_number": "LAG-776-XA",
      "status": "online",
      "last_packet": "2024-03-08T15:00:00Z",
      "location": {"lat": 6.5244, "lng": 3.3792},
      "speed": 65
    }
  ]
}
```

#### 2. Device Deep-Dive (Telemetry Drawer)
- **Endpoint**: `GET /api/v1/tracker/{device_id}`
- **Purpose**: Detailed sensor data for the side-drawer.
- **Attributes to Display**: `Ignition`, `Battery Voltage`, `Engine RPM`, `Fuel Level` (if `has_fuel` is true).

#### 3. Trip Playback
- **Endpoint**: `POST /api/v1/tracker/playback`
- **Payload**:
```json
{
  "device": "12345678",
  "startDate": "2024-03-01 00:00:00",
  "endDate": "2024-03-01 23:59:59"
}
```

---

## 3. Geofencing
**Goal**: Manage virtual boundaries and alert rules.

### A. Key Components & Endpoints

#### 1. Geofence List & Management
- **Endpoint**: `GET /api/v1/geofences`
- **Payload (Create)**:
```json
{
  "name": "Main Warehouse",
  "type": "polygonal",
  "coordinates": [[6.5, 3.3], [6.6, 3.4], [6.4, 3.5]],
  "vehicles": [1, 5, 12],
  "category": "high_priority"
}
```

#### 2. Breach History
- **Endpoint**: `GET /api/v1/geofences/{id}/alerts`
- **Purpose**: Show who entered/exited the fence and when.

---

## 4. Analytics and Reports
**Goal**: Strategic intelligence and data exports.

### A. Key Components & Endpoints

#### 1. Fleet Health Score
- **Endpoint**: `GET /api/v1/analytics/insights/fleet-health-score`
- **Purpose**: Main KPI for the analytics tab.
- **Sample Response**:
```json
{
  "message": "Fleet health score",
  "data": {
    "score": 82,
    "metrics": { "utilization": 75, "fuel_efficiency": 88, "maintenance_compliance": 90 }
  }
}
```

#### 2. Scheduled Reports
- **Endpoint**: `GET /api/v1/analytics/reports/scheduled`
- **Features**: Create (POST), List (GET), Delete (DELETE).
- **Format**: Supports `csv`, `pdf`, `xlsx`.

### [Suggested Improvement]
- **Anomaly Detection**: Use `GET /api/v1/analytics/fuel/anomaly-report` to add a specific "Risk Analysis" section in the analytics dashboard to highlight fuel theft or unauthorized trips automatically.

---

## Global Technical Implementation Tips

### 1. Unified Filter Sync
The `filter` query param (e.g., `?filter=7d`, `?filter=30d`) is supported across 90% of analytics endpoints. Implement a **Global Filter Provider** in React so that changing the date on the dashboard updates all child charts automatically.

### 2. Live State via WebSocket
For **Real-Time Tracking**, do not rely on polling alone. Use **Pusher/Echo** to subscribe to:
- `tracking` channel.
- Events: `VehicleMoved`, `IgnitionChanged`.

### 3. Graceful Empty States
The fleet list can be large (3000+). Ensure the `DeviceList` sidebar uses **Virtualization** (e.g., `react-window`) to maintain 60FPS during scrolling.
