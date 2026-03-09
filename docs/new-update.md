# Fleet Management UI — Current State vs. Proposed Improvements
## Product Design Review & Implementation Roadmap

**Document version:** 1.0
**Date:** March 8, 2026
**Scope:** Dashboard, Analytics & Reports, Geofencing, Live Tracking
**Target audience:** Product team, frontend engineers, UX/UI designers

---

## Executive Summary

The current EonsFleet frontend excels at **real-time tracking** and **vehicle status visualization**, but has gaps in:
1. **Dashboard actionability** — KPIs are informational, not actionable
2. **Analytics discoverability** — Reports buried; difficult to find custom insights
3. **Geofence management** — Setup flow unclear; limited visualization of fence-vehicle relationships
4. **Live tracking UX** — Telemetry drawer is powerful but cramped; sensor data poorly organized

This PRD proposes a **phased upgrade roadmap** focused on:
- **Phase 1 (Sprint 1-2):** Dashboard → "Intelligent Operations Hub" with alert prioritization
- **Phase 2 (Sprint 3-4):** Analytics → Self-service insights with AI-suggested anomalies
- **Phase 3 (Sprint 5-6):** Geofencing → Visual builder + drag-drop assignment
- **Phase 4 (Sprint 7):** Live Tracking → Immersive telemetry dashboard

---

## 1. Dashboard — Current State vs. Improvements

### 1.1 Current Implementation

**Status:** Functional, high-level overview
**Use case:** Fleet manager lands on dashboard, sees snapshot of fleet health

**Current Components:**
```
┌─────────────────────────────────────────────────┐
│  Dashboard                                      │
├──────────┬──────────┬──────────┬──────────────┤
│ Total    │ Active   │ Recent   │ Efficiency  │
│ Vehicles │ Trips    │ Incidents│ %           │
│ 124      │ 18       │ 3        │ 87%         │
├─────────────────────────────────────────────────┤
│  ┌─────────────────┐      ┌─────────────────┐ │
│  │   DashboardMap  │      │ VehicleStatus   │ │
│  │   (Live Routes) │      │ Chart (Donut)   │ │
│  └─────────────────┘      └─────────────────┘ │
├─────────────────────────────────────────────────┤
│  Upcoming Maintenance               Activity Feed│
│  ┌─────────────────┐         ┌────────────────┐│
│  │ Vehicle  Repair │         │ 09:31 Geofence││
│  │ LND-123  Tyres  │         │ 09:15 Harsh.. ││
│  │ ABJ-567  Engine │         │ 08:45 Mainten.││
│  └─────────────────┘         └────────────────┘│
└─────────────────────────────────────────────────┘
```

**Strengths:**
- Clean, uncluttered grid layout
- Real-time map with vehicle positions
- Status distribution at a glance
- Chronological activity feed

**Weaknesses:**
- No drill-down from KPI cards (clicking total vehicles = no benefit)
- VehicleStatusChart (donut) doesn't distinguish severity (offline vehicles = same color as idle)
- Activity feed is passive log; no action buttons
- No "pending attention" indicators (e.g., "5 vehicles needing service")
- Missing alerts section (fuel warnings, geofence violations pending acknowledgment)
- Maintenance list is long; hard to prioritize visually (no color gradient)

---

### 1.2 Proposed Improvements — "Intelligent Operations Hub"

**Vision:** Dashboard should be a **command center**, not a viewer. Fleet manager can:
- Spot problems instantly (color-coded severity)
- Take action without drilling into separate modules
- See predictive insights ("3 vehicles will need maintenance this week")

#### Design 1.2.1: Enhanced KPI Cards with Drill-Down

**Current:**
```
┌──────────────┐
│ Total        │
│ Vehicles: 124│
│ ↑ +2 (7d)    │
└──────────────┘
```

**Proposed:**
```
┌──────────────────────────────┐
│ Total Vehicles: 124          │
│                   ↑ +2 (7d)  │
├──────────────────────────────┤
│ ● Active: 112  ● Idle: 8     │
│ ● Offline: 3   ● Maint.: 1   │
├──────────────────────────────┤
│  [View Fleet]  [Geo Heatmap] │
└──────────────────────────────┘

On click → modal showing:
- List of all 124 with filters
- Map showing distribution
- Offline vehicles flagged
```

**Implementation:**
- Card becomes clickable → opens "Fleet Overview" modal
- Quick toggles to view by status, cluster, driver
- One-click assignment (drag offline vehicles to "Check Device" queue)

---

#### Design 1.2.2: Alerts & Pending Actions Panel

**Current:** No dedicated alerts section. Activity feed mixes informational logs with urgent issues.

**Proposed:**
```
┌─────────────────────────────────────────┐
│ ⚠ ALERTS & PENDING ACTIONS     [Close]  │
├─────────────────────────────────────────┤
│                                         │
│  🔴 CRITICAL (3)                       │
│  • LND-123-XY Offline >2h              │
│    [Ping Device] [Assign Tech]          │
│  • ABJ-567-ZZ Low Fuel <10%            │
│    [Refuel Alert Sent] [Snooze 1h]      │
│  • KAN-009-YY Geofence Breach          │
│    [View on Map] [Acknowledge]          │
│                                         │
│  🟠 WARNING (5)                        │
│  • 5 vehicles due for maintenance      │
│    [View Schedule] [Bulk Assign]        │
│                                         │
│  ℹ INFORMATIONAL (12)                  │
│  [Toggle to hide]                       │
│                                         │
└─────────────────────────────────────────┘
```

**Technical:**
- Panel docks to top-right or side
- Backend API: `GET /api/v1/alerts?severity=critical,warning`
- Real-time updates via WebSocket on new alerts
- Each alert has CTA buttons (Acknowledge, Snooze, Assign, View)
- Batch actions: "Select 5 vehicles for maintenance → Assign technician"

---

#### Design 1.2.3: Maintenance Heatmap

**Current:** Upcoming Maintenance Table — static list, hard to see urgency.

**Proposed:**
```
┌─────────────────────────────────────────┐
│ UPCOMING MAINTENANCE (7d forecast)      │
├─────────────────────────────────────────┤
│                                         │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun     │
│   1    2    3    4    5    6    7      │
│       [●]  [●]  [●●]      [●●●]       │
│   2   1    0    2    0    3    0       │
│ (count/day)                             │
│                                         │
│ Clicking Mar 5 → shows:                 │
│ • LND-123-XY · Oil Change               │
│ • ABJ-567-ZZ · Tire Rotation            │
│ • KAN-009-YY · Battery                  │
│                                         │
└─────────────────────────────────────────┘
```

**Technical:**
- Color gradient: white (0) → light yellow (1-2) → orange (3+)
- Clicking a day opens modal with vehicles needing service
- From modal, one-click "Create maintenance orders"

---

#### Design 1.2.4: Real-Time Activity Feed (Redesigned)

**Current:** Chronological log, no action buttons.

**Proposed:**
```
┌─────────────────────────────────────────┐
│ ACTIVITY & EVENTS        [Filter ▾]     │
├─────────────────────────────────────────┤
│                                         │
│ 🚗 LND-123-XY · Harsh Braking   09:31 │
│    Location: Victoria Island          │
│    [View on Map] [Alert Driver]        │
│                                         │
│ 🚨 ABJ-567-ZZ · Geofence Exit   09:15 │
│    Exited "Lagos Mainland"            │
│    [Acknowledge] [View Geofence]       │
│                                         │
│ ✅ Maintenance Complete · KAN-009    │
│    Oil Change · Technician: Ahmed     │
│    [View Job Card] [Rate Service]      │
│                                         │
│ 🔌 ABJ-567-ZZ · Device Online   08:55 │
│    Was offline for 45 mins            │
│    [View Device Status]                │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Icon + vehicle registration + event type + timestamp
- Location context (where did harsh braking occur?)
- Action buttons specific to event type
- Filter dropdown: Events, Alerts, Maintenance, Device Status

---

### 1.3 Implementation Roadmap — Dashboard

| Phase | Component | Effort | Sprint | Priority |
|-------|-----------|--------|--------|----------|
| 1.1 | KPI drill-down | 2pts | 1 | High |
| 1.2 | Alerts & Pending Actions panel | 3pts | 1 | High |
| 1.3 | Maintenance Heatmap | 2pts | 2 | Medium |
| 1.4 | Activity feed redesign | 2pts | 2 | Medium |
| 1.5 | Real-time alert WebSocket | 1pt | 1 | High |

**New API endpoints needed:**
- `GET /api/v1/dashboard/alerts?severity=critical,warning&limit=10`
- `GET /api/v1/dashboard/maintenance-forecast?days=7`

---

## 2. Analytics & Reports — Current State vs. Improvements

### 2.1 Current Implementation

**Status:** Basic charting; reporting is feature-complete but low discoverability
**Use case:** Manager needs to analyze fuel spend or vehicle utilization

**Current Pages:**
- `analytics/page.tsx` — Utilization & cost charts (AreaChart, BarChart)
- `analytics/reports/page.tsx` — Scheduled report config

**Weaknesses:**
- Charts are static (no brushing/filtering on time series)
- No drill-down: Click on "Fuel Cost" bar → nothing happens
- Reports tab is hidden in secondary navigation
- No "one-click" insights ("top 5 fuel-wasting vehicles")
- Scheduled reports workflow is multi-step; unclear UX
- No export from charts (copy chart as image, PNG download)

---

### 2.2 Proposed Improvements — "Self-Service Insights Platform"

**Vision:** Democratize analytics. Fleet manager should be able to:
- Create custom reports without talking to engineering
- Compare vehicles side-by-side
- Export reports with one click
- Get AI-suggested insights ("Vehicles with unusual fuel consumption")

#### Design 2.2.1: Enhanced Analytics Dashboard

**Current:**
```
┌─────────────────────────────────────────┐
│ Utilization (7d)    Fuel vs. Maintenance│
│ [AreaChart]         [StackedBarChart]   │
│                                         │
│ Avg Util: 78%       Fuel: ₦450k        │
│ Fuel Cost/km: ₦120  Maint: ₦80k        │
└─────────────────────────────────────────┘
```

**Proposed:**
```
┌──────────────────────────────────────────────┐
│ FLEET ANALYTICS       [Date Range] [Cluster] │
├──────────────────────────────────────────────┤
│                                              │
│  UTILIZATION                                 │
│  [AreaChart with brush controls]             │
│  ├─ Avg: 78% | Peak: 92% | Low: 34%        │
│  └─ [Drill Down: Vehicle List]              │
│                                              │
│  COST BREAKDOWN                              │
│  ┌─────────┬─────────┬────────┐             │
│  │ Fuel    │ Maint.  │ Driver │             │
│  │ ₦450k   │ ₦80k    │ ₦120k  │             │
│  │ (60%)   │ (11%)   │ (16%)  │             │
│  └─────────┴─────────┴────────┘             │
│  [Filter by category] [Export CSV]          │
│                                              │
│  TOP INSIGHTS                                │
│  🔥 Hot Spots:                              │
│  • LND-123-XY · Fuel: ₦150/km (↑20% vs avg)│
│    [Compare Fleet] [View Trips]             │
│  • ABJ-567-ZZ · Idle: 40% (↑15% vs avg)    │
│    [Assign Work] [View Schedule]            │
│                                              │
│  🎯 AI Suggestions:                         │
│  • Driver training opportunity detected     │
│    3 vehicles with harsh braking >10x/day   │
│    [View Drivers] [Create Training Plan]    │
│                                              │
└──────────────────────────────────────────────┘
```

**Key features:**
1. **Interactive charts** — Brush on AreaChart to filter date range; updates all related metrics
2. **Drill-down links** — "View Vehicle List" expands to show individual vehicle metrics
3. **Cost breakdown widget** — Pie/donut showing proportion of opex
4. **AI insights** — Backend identifies statistical outliers; frontend displays them with recommended actions

---

#### Design 2.2.2: Custom Reports Builder (Wizard)

**Current:** Multi-step form; unclear what reports are possible.

**Proposed:** Visual report builder.

```
┌──────────────────────────────────────────────┐
│ CREATE CUSTOM REPORT                 [Help] │
├──────────────────────────────────────────────┤
│                                              │
│ STEP 1: Choose Report Type                  │
│  ○ Fuel Analysis                            │
│  ○ Maintenance Forecast                     │
│  ○ Driver Performance                       │
│  ○ Vehicle Utilization                      │
│  ○ Incident Summary                         │
│  ○ [Custom/Blank]                           │
│                                              │
│ STEP 2: Select Dimensions                   │
│ [Fleet] [Cluster] [Vehicle] [Driver]        │
│ [Date Range: Mar 1 - Mar 8]                 │
│                                              │
│ STEP 3: Metrics & Filters                   │
│ ☑ Total Fuel Cost                           │
│ ☑ Fuel/km Ratio                             │
│ ☑ Idle Hours                                │
│ ☑ Distance                                  │
│ Filter: Status = Active                     │
│                                              │
│ STEP 4: Visualization & Delivery            │
│ Chart type: [BarChart ▾]                    │
│ Format: [PDF] [CSV] [Email]                 │
│ Schedule: [Once] [Weekly] [Monthly]         │
│                                              │
│                    [< Back] [Create Report] │
│                                              │
└──────────────────────────────────────────────┘
```

**Post-generation:** Save report as template, share with team members.

---

#### Design 2.2.3: Reports Hub (Improved Navigation)

**Current:** Buried in secondary nav; no templates or recommendations.

**Proposed:**
```
┌──────────────────────────────────────────────┐
│ REPORTS HUB                  [New Report ▶]  │
├──────────────────────────────────────────────┤
│                                              │
│ RECOMMENDED FOR YOU                         │
│ • Weekly Fuel Report (auto-generated)       │
│   Due this week | [View] [Download]         │
│ • Driver Performance Digest                 │
│   View today's risk score | [Open]          │
│                                              │
│ MY REPORTS                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ Fleet Utilization - Weekly              │ │
│ │ Created Mar 1 | Last run: Mar 8         │ │
│ │ [View] [Download] [Schedule] [Delete]   │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ Fuel Anomalies - Ad-hoc                 │ │
│ │ Created Feb 28 | Last run: Feb 28       │ │
│ │ [View] [Download] [Schedule] [Delete]   │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ SHARED WITH ME                              │
│ • Compliance Report (from Admin)            │
│   [Open]                                    │
│                                              │
└──────────────────────────────────────────────┘
```

**Features:**
- Auto-generated recommended reports (ML suggests what matters to this fleet)
- "Last run" timestamp; one-click re-run
- Batch actions: "Download all as ZIP"
- Share with specific roles (finance gets cost reports, ops gets maintenance)

---

### 2.3 Implementation Roadmap — Analytics & Reports

| Phase | Component | Effort | Sprint | Priority |
|-------|-----------|--------|--------|----------|
| 2.1 | Interactive chart controls (brush, zoom) | 3pts | 3 | High |
| 2.2 | Drill-down to vehicle list | 2pts | 3 | High |
| 2.3 | AI insights detection (backend) | 5pts | 4 | Medium |
| 2.4 | Custom report builder wizard | 5pts | 4 | Medium |
| 2.5 | Reports Hub redesign | 2pts | 3 | High |
| 2.6 | PDF export (charts as images) | 2pts | 4 | Low |

**New API endpoints:**
- `POST /api/v1/analytics/insights?fleet_id=1` — AI-detected anomalies
- `POST /api/v1/reports/custom` — Create custom report template
- `GET /api/v1/reports/recommended` — ML-suggested reports for this org

---

## 3. Geofencing — Current State vs. Improvements

### 3.1 Current Implementation

**Status:** Functional but lacks visual feedback; setup is technical
**Use case:** Create a "warehouse zone"; assign vehicles; receive breach alerts

**Current Features:**
- Create geofence (polygon or circle)
- Assign vehicles to geofence
- UpgradeGate (Growth+ plan only)
- Live rendering on tracking map

**Weaknesses:**
- No visual builder (draw on map)
- Vehicle assignment is via table/list (not visual)
- No bulk assignment ("Assign all Lagos-region vehicles")
- No breach replay/history
- Geofence appears only when toggled on tracking map (hidden by default)
- No geofence performance metrics ("How often does Vehicle X breach?")
- Setup workflow is unclear to non-technical users

---

### 3.2 Proposed Improvements — "Visual Geofence Manager"

#### Design 3.2.1: Geofence Builder (Map-Based)

**Current:** Form inputs (lat, lng, radius for circle)

**Proposed:** Interactive map builder

```
┌──────────────────────────────────────────────┐
│ CREATE GEOFENCE                      [Cancel] │
├──────────────────────────────────────────────┤
│                                              │
│  [Map with draw controls]                   │
│  • Draw Circle ○  Draw Polygon ◈  Clear    │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │                                      │   │
│  │  [Map canvas - user draws]           │   │
│  │  User draws circle or polygon        │   │
│  │                                      │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Geofence Name: [Warehouse Area]            │
│  Area: 2.5 km²  Perimeter: 5.8 km           │
│                                              │
│  ALERT SETTINGS                             │
│  ☑ Notify on Entry    ☑ Notify on Exit     │
│  Alert recipient: [Operations Lead ▾]      │
│                                              │
│  ASSIGN VEHICLES                            │
│  [+ Add Vehicles]  [Bulk Assign by Cluster]│
│  ✓ LND-123-XY   ✓ ABJ-567-ZZ               │
│  ✓ KAN-009-YY   [Add more]                 │
│                                              │
│                      [Save & Activate]     │
│                                              │
└──────────────────────────────────────────────┘
```

**Technical:**
- Use Mapbox Draw or Leaflet.draw plugin
- Calculate area/perimeter server-side (verify geofence is valid polygon)
- Real-time validation ("This geofence overlaps with 'Airport Zone'")

---

#### Design 3.2.2: Geofence Dashboard (List + Map View)

**Current:** GeofenceList (table) + map toggle

**Proposed:** Dual-view dashboard

```
┌──────────────────────────────────────────────┐
│ GEOFENCES                         [Map View] │
├──────────────────────────────────────────────┤
│                                              │
│ [List View]                                 │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Warehouse Area                          │ │
│ │ Area: 2.5 km² | Vehicles: 12           │ │
│ │ Status: ● Active | Breaches (24h): 0   │ │
│ │ [Edit] [Assign] [View Breaches] [Delete]│ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Lagos Mainland Cluster                  │ │
│ │ Area: 18 km² | Vehicles: 45             │ │
│ │ Status: ● Active | Breaches (24h): 3   │ │
│ │ [Edit] [Assign] [View Breaches] [Delete]│ │
│ │ 🔴 Recent breach: KAN-009 at 14:32     │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [+ Create Geofence]                        │
│                                              │
└──────────────────────────────────────────────┘

[Map View]
Shows all geofences overlaid on map.
Clicking a geofence highlights:
- Boundary (polygon/circle)
- Assigned vehicles (markers with checkmarks)
- Recent breaches (icons with timestamps)
- Breach heat layer (density = breach frequency)
```

---

#### Design 3.2.3: Bulk Vehicle Assignment

**Current:** Assign one vehicle at a time to a geofence

**Proposed:** Bulk operations

```
[Button: Bulk Assign by Cluster]
┌──────────────────────────────────────────────┐
│ BULK ASSIGN VEHICLES TO GEOFENCE            │
├──────────────────────────────────────────────┤
│                                              │
│ Select assignment source:                   │
│ ○ By Cluster:                               │
│   ☑ Lagos Cluster (12 vehicles)            │
│   ☑ Ibadan Cluster (8 vehicles)            │
│   ☐ Abuja Cluster (0 matches - offline)    │
│                                              │
│ ○ By Route:                                 │
│   [Select Route ▾]                         │
│                                              │
│ ○ By Driver:                                │
│   [Select Driver ▾]                        │
│                                              │
│ ASSIGNMENT RULE (optional):                 │
│ Automatically assign new vehicles to this   │
│ geofence if they're in the selected cluster │
│ ☐ Enable auto-assignment                    │
│                                              │
│                    [Assign 20 Vehicles]     │
│                                              │
└──────────────────────────────────────────────┘
```

---

#### Design 3.2.4: Geofence Analytics

**Current:** No metrics shown

**Proposed:** Breach analytics per geofence

```
[View Breaches Button]
┌──────────────────────────────────────────────┐
│ WAREHOUSE AREA - BREACH ANALYTICS            │
├──────────────────────────────────────────────┤
│                                              │
│ Total Breaches (30d): 12                    │
│ Most Active Vehicle: LND-123-XY (4 breaches)│
│ Peak Breach Time: 18:00-20:00 (50% of breaches)│
│                                              │
│ BREACH TIMELINE (past 7 days)               │
│ [LineChart showing breach count by day]     │
│                                              │
│ VEHICLE BREACH RANKING                      │
│ 1. LND-123-XY · 4 breaches · Avg: 12min    │
│    [View Trips] [Adjust Alert]              │
│ 2. ABJ-567-ZZ · 3 breaches · Avg: 5min     │
│ 3. KAN-009-YY · 2 breaches · Avg: 8min     │
│                                              │
│ [Download Report] [Email Alert]             │
│                                              │
└──────────────────────────────────────────────┘
```

---

### 3.3 Implementation Roadmap — Geofencing

| Phase | Component | Effort | Sprint | Priority |
|-------|-----------|--------|--------|----------|
| 3.1 | Map-based geofence builder (draw) | 5pts | 5 | High |
| 3.2 | Dual-view dashboard (list + map) | 3pts | 5 | High |
| 3.3 | Bulk vehicle assignment | 2pts | 5 | Medium |
| 3.4 | Breach analytics dashboard | 3pts | 6 | Medium |
| 3.5 | Auto-assignment rules engine | 3pts | 6 | Low |

**New API endpoints:**
- `POST /api/v1/geofences/bulk-assign` — Assign multiple vehicles
- `GET /api/v1/geofences/{id}/analytics` — Breach stats

---

## 4. Live Tracking — Current State vs. Improvements

### 4.1 Current Implementation

**Status:** Highly advanced; real-time WebSocket integration working well
**Use case:** Monitor fleet in real-time; zoom into individual vehicle for deep telemetry

**Current Strengths:**
- WebSocket live updates (vehicle.moved events)
- Custom SVG markers (rotate with heading, pulse with status)
- Control sidebar (filter by status, search)
- Deep-dive telemetry drawer (480px side panel)

**Current Weaknesses:**
- Telemetry drawer is cramped; 8 sensors crammed into narrow column
- Sensor data not organized by category (engine, electrical, environmental)
- No sensor health status (is RPM reading "normal"?)
- Map clustering hides granular detail at zoom-out
- No trip history or playback
- No geolocation context (address, zone, speed limit comparison)

---

### 4.2 Proposed Improvements — "Immersive Telemetry Dashboard"

#### Design 4.2.1: Redesigned Telemetry Drawer

**Current:**
```
┌────────────┐
│ LND-123-XY │
│ 65 km/h SE │
│            │
│ Ignition: ON
│ RPM: 2100
│ Temp: 92°C
│ Battery: 13.2V
│ Door: Closed
│ Vibration: 0.2g
│ │
```

**Proposed:**
```
┌──────────────────────────────────────────────┐
│ LND-123-XY · Toyota Hilux          [Close]  │
├──────────────────────────────────────────────┤
│                                              │
│  PRIMARY STATUS                             │
│  🟢 Moving · 65 km/h [SE ↗]                │
│     Location: Victoria Island               │
│     Last update: 2 seconds ago               │
│                                              │
│  ENGINE & DRIVETRAIN                       │
│  RPM: 2100 / 6500 [████░░]  ✓ Normal      │
│  Throttle: 42% [██████░░░░]                │
│  Fuel Consumption: 8.2 L/100km (High)      │
│                                              │
│  ELECTRICAL                                 │
│  Battery: 13.2V [█████░░░░] ✓ Normal      │
│  Alternator: Charging ✓                     │
│                                              │
│  ENVIRONMENT                                │
│  Engine Temp: 92°C [████░░░░░] ✓ Normal   │
│  Cabin Temp: 28°C                          │
│  Humidity: 65%                              │
│                                              │
│  SAFETY & DOORS                             │
│  All Doors: Closed ✓                        │
│  Seatbelts: Detected ✓                     │
│  Airbags: OK ✓                              │
│  Vibration: 0.2g (Normal)                   │
│                                              │
│  FUEL & RANGE                               │
│  Tank Level: 68% [█████░░░] · 42.5 L      │
│  Est. Range: 320 km                         │
│                                              │
│  [Previous Update] [Full History]           │
│                                              │
└──────────────────────────────────────────────┘
```

**Features:**
- Organized by category (Engine, Electrical, Environment, Safety, Fuel)
- Health indicator (✓ = normal, ⚠ = warning, 🔴 = critical)
- Visual gauges (filled bar for RPM, fuel, temp)
- Contextual limits (RPM gauge goes to 6500; temp warning at 95°C)
- Last update timestamp (builds user trust in real-time data)
- Links to history and trends

---

#### Design 4.2.2: Sensor Health & Anomalies

**New section in telemetry drawer:**
```
┌──────────────────────────────────────────────┐
│ ⚠ ANOMALIES DETECTED (3)                    │
├──────────────────────────────────────────────┤
│                                              │
│ 🔴 High Fuel Consumption                    │
│    Current: 8.2 L/100km                    │
│    Baseline: 6.5 L/100km                    │
│    Driver: Harsh acceleration detected      │
│    [View Driver Stats] [Dismiss]             │
│                                              │
│ 🟡 Elevated Engine Temp                     │
│    92°C (normal: <85°C)                    │
│    Monitoring... (no action needed yet)      │
│    [View Trend] [Alert on next 95°C]       │
│                                              │
│ 🔵 Sensor Missing: Tire Pressure             │
│    TPMS not responding                      │
│    [Check Hardware] [Ignore]                │
│                                              │
└──────────────────────────────────────────────┘
```

---

#### Design 4.2.3: Trip Timeline & Playback

**Current:** No trip history visible from tracking view

**Proposed:** Timeline + video-like playback

```
[New Button: Trip Playback]
┌──────────────────────────────────────────────┐
│ TRIP PLAYBACK - LND-123-XY                  │
├──────────────────────────────────────────────┤
│                                              │
│  Trip: LND-123-XY · 08:00-14:23 (6h 23m)   │
│  Distance: 187 km | Avg Speed: 30 km/h     │
│  Fuel Used: 15.3 L | Harsh Events: 4       │
│                                              │
│  [◀ Rewind] [⏯ Play/Pause] [⏭ Forward]    │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ ▁▂▃▄▅▆▇▇▇▄▃▂▁▁▂▃▅▇█▇▅▃▁░ ◼ 14:23   │ │
│  │ 08:00                                14:23│ │
│  │ [Scroll through trip timeline]           │ │
│  └────────────────────────────────────────┘ │ │
│                                              │
│  TIMELINE EVENTS:                           │
│  • 08:00 Trip Start · Victoria Island      │
│  • 08:45 Geofence Exit [Warehouse]         │
│  • 09:12 Harsh Acceleration (0.45g)        │
│  • 10:30 Refuel · Total 15L @ ₦10,800     │
│  • 12:15 Harsh Braking (0.38g)             │
│  • 14:23 Trip End · Ikoyi                  │
│                                              │
│  [Export Trip Report] [Share with Manager]  │
│                                              │
└──────────────────────────────────────────────┘
```

**Technical:**
- Backend stores GPS points at 1-minute intervals (can be denser)
- Playback scrubber shows trip progress; smooth animation
- Events (refuel, geofence, harsh events) pinned to timeline

---

#### Design 4.2.4: Location Context (Address, Speed Limit, Zone)

**New card in telemetry drawer:**
```
┌──────────────────────────────────────────────┐
│ LOCATION & CONTEXT                          │
├──────────────────────────────────────────────┤
│                                              │
│ Current: Victoria Island, Lagos             │
│ Coordinates: 6.4328°N, 3.3950°E             │
│ Altitude: 12m                               │
│                                              │
│ Speed Limit (Road): 60 km/h                 │
│ Current Speed: 65 km/h  🔴 Exceeding       │
│                                              │
│ Zone: Warehouse District                    │
│ Geofence: "Warehouse Area" [In bounds] ✓   │
│                                              │
│ Traffic Conditions: Light (2 incidents)     │
│                                              │
│ Last 5 Locations:                           │
│ 1. Victoria Island (current)                │
│ 2. Lekki (30 min ago)                       │
│ 3. Ikoyi (2h ago)                           │
│ 4. VI (3h ago)                              │
│ 5. Magodo (5h ago)                          │
│                                              │
│ [Show on Map] [View Alternatives]           │
│                                              │
└──────────────────────────────────────────────┘
```

---

### 4.3 Implementation Roadmap — Live Tracking

| Phase | Component | Effort | Sprint | Priority |
|-------|-----------|--------|--------|----------|
| 4.1 | Redesigned telemetry drawer | 3pts | 6 | High |
| 4.2 | Sensor health & anomalies | 2pts | 7 | Medium |
| 4.3 | Trip playback feature | 5pts | 7 | Medium |
| 4.4 | Location context card | 2pts | 7 | Low |
| 4.5 | Sensor gauge visualizations | 2pts | 6 | Medium |

**New API endpoints:**
- `GET /api/v1/vehicles/{id}/trip/{trip_id}/playback` — Timeline + events
- `GET /api/v1/vehicles/{id}/sensors/health` — Sensor anomalies

---

## 5. Cross-Feature Improvements (Shared Infrastructure)

### 5.1 Export & Sharing

All modules should support:
- **Export to PDF** — dashboard snapshot, chart, report
- **Share with role** — Finance gets cost reports; Ops gets maintenance alerts
- **Email integration** — Scheduled snapshots, anomaly alerts

### 5.2 Real-Time Notifications

Upgrade WebSocket event system:
- Subscribe to vehicle events: `vehicle.harsh_braking`, `vehicle.geofence_breach`, `vehicle.offline`
- Dashboard alerts push (no page refresh)
- Browser notifications for critical events

### 5.3 Mobile Responsiveness

Current implementation assumes desktop. Improvements:
- Telemetry drawer → bottom sheet on mobile
- Charts → single-column stack on <768px
- Map → full viewport on mobile (sidebar collapses)

### 5.4 Accessibility (A11y)

- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader support for charts (accessible table fallback)
- Color contrast ratios ≥ 4.5:1

---

## 6. Design System Updates

To support these improvements, create/update:

| Component | Current | Upgrade |
|-----------|---------|---------|
| Card | Basic shadow | Hover states, interactive borders |
| Button | Primary/Secondary | Add Tertiary, Icon variants |
| Badge | Status color | Add health status (✓ / ⚠ / 🔴) |
| Modal | Basic overlay | Slide-in drawer support |
| Chart | Recharts default | Custom axes, brush controls |
| Gauge | Text + number | Visual gauge with min/max |

---

## 7. Phased Rollout Timeline

```
Sprint 1-2 (Week 1-2)
├─ Dashboard KPI drill-down + Alerts panel
├─ Real-time alert WebSocket
└─ Analytics interactive controls

Sprint 3-4 (Week 3-4)
├─ Analytics drill-down + Reports Hub
├─ Custom report builder
└─ AI insights detection (backend)

Sprint 5-6 (Week 5-6)
├─ Geofence visual builder + map
├─ Bulk vehicle assignment
└─ Redesigned telemetry drawer

Sprint 7 (Week 7)
├─ Trip playback + sensor health
├─ Location context card
└─ Polish & QA
```

---

## 8. Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Dashboard Alerts | Time to first action | < 30 sec |
| Analytics Charts | Drill-down engagement | > 40% of users |
| Geofence Breaches | Alert acknowledgment time | < 5 min |
| Live Tracking | Telemetry drawer usage | > 60% of tracking sessions |
| Exports | PDF downloads / month | > 200 |

---

## 9. Conclusion

The proposed improvements transform EonsFleet from a **monitoring platform** into an **intelligent operations command center**. Fleet managers gain:

1. **Actionability** — Alerts + CTAs instead of passive dashboards
2. **Discoverability** — Self-serve analytics instead of buried reports
3. **Usability** — Visual builders instead of technical forms
4. **Intelligence** — AI insights instead of manual analysis

**Next Steps:**
1. Gather stakeholder feedback (ops team, finance, dispatch)
2. Create high-fidelity mockups for Phase 1
3. Estimate backend API requirements
4. Prioritize component library updates
5. Begin Sprint 1 implementation

---

**Document prepared by:** Product Design Team
**Approval date:** [Pending stakeholder review]
**Last updated:** March 8, 2026
