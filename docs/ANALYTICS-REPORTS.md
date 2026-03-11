# Analytics & Reports — EonsFleet Backend Reference

> **Audience:** Frontend engineers, QA, and product. All endpoints require `X-Request-Type: client` header and a valid Passport bearer token unless noted. All analytics routes are gated by `org.subscription:analytics` — a 402 is returned for non-subscribed organizations.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Common Conventions](#2-common-conventions)
3. [Module: Fleet Utilization](#3-module-fleet-utilization)
4. [Module: Driver Performance](#4-module-driver-performance)
5. [Module: Fuel Intelligence](#5-module-fuel-intelligence)
6. [Module: Maintenance](#6-module-maintenance)
7. [Module: Incidents](#7-module-incidents)
8. [Module: GPS & Routes](#8-module-gps--routes)
9. [Module: Fleet Insights (Proactive)](#9-module-fleet-insights-proactive)
10. [Reports — Export](#10-reports--export)
11. [Reports — Scheduled](#11-reports--scheduled)
12. [Reports — Custom](#12-reports--custom)
13. [User Journey: Scheduled Reports](#13-user-journey-scheduled-reports)
14. [User Journey: Custom Reports](#14-user-journey-custom-reports)
15. [Dashboard Endpoints](#15-dashboard-endpoints)
16. [Background Jobs & Scheduling](#16-background-jobs--scheduling)
17. [Daily Aggregation (Pre-computed Metrics)](#17-daily-aggregation-pre-computed-metrics)
18. [Role Access Matrix](#18-role-access-matrix)

---

## 1. Architecture Overview

```
HTTP Request
     │
     ├─ Auth + Tenant (IdentifyTenant / auth:client)
     ├─ Subscription gate (org.subscription:analytics)
     │
     ▼
Analytics Controller  (app/Http/Controllers/Api/v1/Analytics/)
     │
     ▼
Analytics Service     (app/Services/Analytics/)
     │  Uses AnalyticsBaseTrait for date-range parsing & GROUP BY inference
     │
     ├─ Live queries → PostgreSQL (trips, vehicles, fuel, incidents, etc.)
     └─ Pre-computed → AnalyticsDailyFleet/Vehicle/DriverMetric tables
                       (populated nightly by AggregateAnalyticsJob)

Report Layer
     │
     ├─ ReportExportService      → PDF (DomPDF) / CSV streaming
     ├─ ScheduledReportController + DeliverScheduledReportsJob → email delivery
     └─ CustomReportController   → stored templates, multi-format, scheduled
```

**Route files:**
- `routes/api/v1/analytics.php` — 42 analytics endpoints
- `routes/api/v1/reports.php`   — export + scheduled report endpoints
- `routes/api/v1/dashboard.php` — dashboard summary endpoints

---

## 2. Common Conventions

### Filter Parameter

Most endpoints accept a `filter` query param that controls the date window and grouping granularity:

| Value | Window | GROUP BY |
|-------|--------|----------|
| `7d`  | Last 7 days  | Day |
| `30d` (default) | Last 30 days | Day |
| `90d` | Last 90 days | Week |
| `1y`  | Last 12 months | Month |

Custom ranges: pass `start_date` and `end_date` (YYYY-MM-DD). Grouping is inferred automatically (≤31 days → day, ≤180 days → week, else → month).

### Chart-Ready Responses

All trend endpoints return ready-to-plot arrays:

```json
{
  "labels": ["2026-01-01", "2026-01-02", "..."],
  "data":   [42, 38, 55, "..."],
  "chart_type": "line"
}
```

`chart_type` values: `line`, `bar`, `horizontal_bar`, `donut`, `gauge`.

### Monetary Values

Monetary amounts from database are in **kobo** (integer). Services divide by 100 for naira display. The API returns naira values unless the field name ends in `_kobo`.

### Pagination

List endpoints accept `per_page` (default 20, max 100) and `page`.

---

## 3. Module: Fleet Utilization

**Base path:** `/v1/analytics/fleet/`
**Service:** `FleetUtilizationService`

### 3.1 Utilization Summary

```
GET /v1/analytics/fleet/utilization-summary
```

**Query params:** `filter` (7d|30d|90d|1y, default: 30d)

**Response:**
```json
{
  "total_vehicles": 48,
  "active_vehicles": 35,
  "utilization_rate_pct": 72.9,
  "total_trips": 312,
  "completed_trips": 287,
  "completion_rate_pct": 91.99,
  "total_distance_km": 14820.5,
  "period": "2026-02-09 to 2026-03-11"
}
```

> **Formula:** utilization_rate_pct = (trips_in_period / (total_vehicles × days_in_period)) × 100

---

### 3.2 Vehicle Utilization List

```
GET /v1/analytics/fleet/vehicle-list
```

**Query params:** `filter`, `limit` (default: 20)

**Response:**
```json
{
  "data": [
    {
      "vehicle_id": 12,
      "registration": "LAG-001-AA",
      "make": "Toyota",
      "model": "Hilux",
      "trips_count": 28,
      "total_distance_km": 1420.5,
      "utilization_pct": 93.3
    }
  ],
  "period": "..."
}
```

---

### 3.3 Availability Snapshot (Real-time)

```
GET /v1/analytics/fleet/availability-snapshot
```

**No params.** Returns current vehicle counts by status (for donut/pie chart).

```json
{
  "total": 48,
  "by_status": {
    "active": 22,
    "in_transit": 13,
    "inactive": 8,
    "maintenance": 5
  },
  "chart_type": "donut"
}
```

---

### 3.4 Availability Trend

```
GET /v1/analytics/fleet/availability-trend
```

**Query params:** `filter`

**Response:** `{ labels, data, chart_type: "line" }` — daily/weekly fleet availability rate (0–100%).

---

### 3.5 Top Vehicles by Trips

```
GET /v1/analytics/fleet/top-vehicles
```

**Query params:** `filter`, `limit` (default: 10)

**Response:** `{ labels[], data[], vehicles[], chart_type: "horizontal_bar" }`

---

### 3.6 Asset Performance Summary

```
GET /v1/analytics/fleet/asset-performance
```

**Query params:** `limit` (default: 10)

**Response:**
```json
{
  "top_performers": [
    { "vehicle_id": 5, "registration": "LAG-003-AA", "score": 94.2, "trips": 31, "distance_km": 1600 }
  ],
  "bottom_performers": [ "..." ]
}
```

> Score is a composite of trip count (40%), distance (30%), and completion rate (30%).

---

## 4. Module: Driver Performance

**Base path:** `/v1/analytics/drivers/`
**Service:** `DriverPerformanceService`

### 4.1 Trip Summary per Driver

```
GET /v1/analytics/drivers/trip-summary
```

**Query params:** `filter`, `limit` (default: 20)

```json
{
  "data": [
    {
      "driver_id": 7,
      "driver_name": "Ade Bello",
      "trips_count": 24,
      "total_distance_km": 1280.0,
      "avg_duration_hours": 1.8
    }
  ],
  "period": "..."
}
```

---

### 4.2 Top Drivers by Trip Count

```
GET /v1/analytics/drivers/top-by-trips
```

**Query params:** `filter`, `limit` (default: 10)

**Response:** `{ labels[], data[], drivers[], chart_type: "horizontal_bar" }`

---

### 4.3 Workload Distribution

```
GET /v1/analytics/drivers/workload-distribution
```

**Query params:** `filter`

Returns histogram of how many drivers fall into each trip-count bucket:

```json
{
  "buckets": {
    "1–5":   { "count": 12 },
    "6–10":  { "count": 8  },
    "11–20": { "count": 4  },
    "21+":   { "count": 2  }
  },
  "chart_type": "bar"
}
```

---

### 4.4 Document Compliance Report

```
GET /v1/analytics/drivers/compliance
```

No params. Returns driver document status across the fleet.

```json
{
  "current": 38,
  "expiring_soon": 6,
  "expired": 4,
  "per_driver_expiring": [
    {
      "driver_id": 12,
      "driver_name": "Funmi Ojo",
      "documents": [
        { "type": "driver_license", "expires_at": "2026-03-20" }
      ]
    }
  ]
}
```

---

### 4.5 Incident History per Driver

```
GET /v1/analytics/drivers/incident-history
```

**Query params:** `limit` (default: 20). Fixed 90-day window.

```json
{
  "data": [
    { "driver_id": 9, "driver_name": "Kola Adesanya", "incident_count": 5 }
  ]
}
```

---

## 5. Module: Fuel Intelligence

**Base path:** `/v1/analytics/fuel/`
**Service:** `FuelManagementService`

### 5.1 Consumption Report

```
GET /v1/analytics/fuel/consumption-report
```

**Query params:** `filter`

```json
{
  "total_fuel_liters": 4820.5,
  "period": "...",
  "trend": [
    { "period": "2026-02-09", "total_fuel_liters": 162.4 }
  ],
  "chart_type": "line"
}
```

---

### 5.2 Cost Report

```
GET /v1/analytics/fuel/cost-report
```

No params. Fixed 12-month window.

**Response:** `{ labels[], data[], chart_type: "bar" }` — monthly fuel spend in naira.

---

### 5.3 Efficiency Report (L/100km)

```
GET /v1/analytics/fuel/efficiency-report
```

No params. Fixed 12-month window.

**Response:** `{ labels[], data[], chart_type: "line" }` — monthly fleet average L/100km.

---

### 5.4 Anomaly Report

```
GET /v1/analytics/fuel/anomaly-report
```

No params.

```json
{
  "by_type": [
    { "type": "theft", "count": 3 },
    { "type": "overfill", "count": 7 }
  ],
  "theft_trend": { "labels": [], "data": [], "chart_type": "bar" }
}
```

---

### 5.5 Fuel Card Transactions

```
GET /v1/analytics/fuel/card-transactions
```

Returns reconciliation summary and match-rate trend.

```json
{
  "total_transactions": 214,
  "matched": 198,
  "unmatched": 16,
  "match_rate_pct": 92.5,
  "trend": { "labels": [], "data": [], "chart_type": "line" }
}
```

---

### 5.6 Top / Bottom Vehicles by Fuel Efficiency

```
GET /v1/analytics/fuel/top-bottom-vehicles
```

**Query params:** `months` (default: 3)

```json
{
  "top_5": [
    { "vehicle_id": 4, "registration": "LAG-020-AA", "efficiency_l_per_100km": 6.1 }
  ],
  "bottom_5": [ "..." ]
}
```

---

### 5.7 Driver Fuel Efficiency

```
GET /v1/analytics/fuel/driver-efficiency
```

**Query params:** `start_date`, `end_date`, `period` (7d|30d|90d|1y)

```json
{
  "average_efficiency": 7.4,
  "top_10_pct": [ { "driver_id": 3, "driver_name": "...", "efficiency": 5.2 } ],
  "bottom_10_pct": [ "..." ],
  "savings_potential_naira": 128000
}
```

---

### 5.8 Executive KPIs

```
GET /v1/analytics/fuel/executive-kpis
```

**Query params:** `period`, `filter`

```json
{
  "total_fuel_cost_naira": 2480000,
  "theft_incidents": 3,
  "match_rate_pct": 92.5,
  "fleet_efficiency_l_per_100km": 7.2
}
```

---

## 6. Module: Maintenance

**Base path:** `/v1/analytics/maintenance/`
**Service:** `MaintenanceComplianceService`

### 6.1 Schedule Compliance

```
GET /v1/analytics/maintenance/schedule-compliance
```

No params.

```json
{
  "summary": {
    "total": 60,
    "overdue": 8,
    "upcoming_14d": 12,
    "current": 40,
    "compliance_rate": 86.7
  },
  "schedules": [
    {
      "id": 14,
      "vehicle_registration": "LAG-011-AA",
      "service_type": "Oil Change",
      "due_date": "2026-03-05",
      "status": "overdue"
    }
  ]
}
```

> **Status thresholds:** `overdue` = due_date < today; `upcoming` = due_date within 14 days; `current` = all others.

---

### 6.2 Maintenance Cost Report

```
GET /v1/analytics/maintenance/cost-report
```

**Query params:** `filter`

```json
{
  "total_cost_kobo": 48000000,
  "period": "...",
  "trend": [ { "period": "2026-02-09", "cost_kobo": 1600000 } ],
  "by_vehicle": [
    { "vehicle_id": 7, "registration": "...", "total_cost_kobo": 8200000 }
  ]
}
```

---

### 6.3 Workflow Report

```
GET /v1/analytics/maintenance/workflow-report
```

No params. Returns job distribution by status and turnaround time.

```json
{
  "by_status": {
    "draft": 2, "submitted": 5, "pending_inspection": 3,
    "pending_approval": 1, "approved": 4, "assigned": 6,
    "in_progress": 8, "pending_verification": 2, "closed": 41
  },
  "avg_turnaround_days": 4.2
}
```

---

### 6.4 Document Compliance

```
GET /v1/analytics/maintenance/document-compliance
```

No params.

```json
{
  "expiring": [
    { "category": "insurance", "count": 4, "next_expiry": "2026-03-25" },
    { "category": "road_worthiness", "count": 2, "next_expiry": "2026-04-01" }
  ]
}
```

---

### 6.5 Workshop Summary

```
GET /v1/analytics/maintenance/workshop-summary
```

No params.

```json
{
  "total_jobs": 74,
  "total_cost_kobo": 182000000,
  "avg_rating": 4.1
}
```

---

## 7. Module: Incidents

**Base path:** `/v1/analytics/incidents/`
**Service:** `IncidentReportService`

### 7.1 Summary

```
GET /v1/analytics/incidents/summary
```

```json
{
  "total": 84,
  "open": 12,
  "resolved": 28,
  "closed": 38,
  "dismissed": 4,
  "escalated": 2
}
```

---

### 7.2 Type Distribution

```
GET /v1/analytics/incidents/type-distribution
```

```json
{
  "labels": ["accident", "theft", "breakdown", "road_offence"],
  "data":   [22, 8, 34, 20],
  "detail": [
    { "type": "breakdown", "count": 34 }
  ],
  "chart_type": "donut"
}
```

---

### 7.3 Priority Distribution

```
GET /v1/analytics/incidents/priority-distribution
```

```json
{
  "labels": ["critical", "high", "medium", "low"],
  "data":   [5, 14, 38, 27],
  "chart_type": "donut"
}
```

---

### 7.4 Incidents Over Time

```
GET /v1/analytics/incidents/over-time
```

**Query params:** `filter`

**Response:** `{ labels[], data[], chart_type: "line" }`

---

### 7.5 Resolution Time

```
GET /v1/analytics/incidents/resolution-time
```

No params.

```json
{
  "overall_avg_days": 3.4,
  "by_type": [
    { "type": "breakdown", "avg_days": 1.2, "count": 34 },
    { "type": "accident",  "avg_days": 6.8, "count": 22 }
  ]
}
```

---

### 7.6 Incidents by Vehicle

```
GET /v1/analytics/incidents/by-vehicle
```

**Query params:** `limit` (default: 10)

```json
{
  "vehicles": [
    {
      "vehicle_id": 9,
      "registration": "LAG-007-AA",
      "make": "Toyota",
      "model": "Corolla",
      "incident_count": 7
    }
  ]
}
```

---

## 8. Module: GPS & Routes

**Base path:** `/v1/analytics/gps/`
**Service:** `GpsTripService`

### 8.1 Trip Summary

```
GET /v1/analytics/gps/trip-summary
```

**Query params:** `filter`

```json
{
  "total_trips": 386,
  "completed_trips": 354,
  "completion_rate_pct": 91.7,
  "total_distance_km": 18420.0,
  "avg_distance_km": 52.2,
  "period": "..."
}
```

---

### 8.2 Trips Over Time

```
GET /v1/analytics/gps/trips-over-time
```

**Query params:** `filter`

**Response:** `{ labels[], data[], chart_type: "line" }`

---

### 8.3 Distance & Mileage Report

```
GET /v1/analytics/gps/distance-mileage
```

**Query params:** `filter`

```json
{
  "trend": [
    { "period": "2026-02-09", "total_km": 640.2, "trips": 12 }
  ],
  "by_vehicle": [
    { "vehicle_id": 3, "registration": "LAG-004-AA", "total_km": 2810.5 }
  ],
  "chart_type": "line"
}
```

---

### 8.4 Top Vehicles by Distance

```
GET /v1/analytics/gps/top-by-distance
```

**Query params:** `filter`, `limit` (default: 10)

**Response:** `{ labels[], data[], vehicles[], chart_type: "horizontal_bar" }`

---

### 8.5 Geofence Activity

```
GET /v1/analytics/gps/geofence-activity
```

**Query params:** `filter`

```json
{
  "alerts_over_time": { "labels": [], "data": [], "chart_type": "bar" },
  "top_breach_zones": [
    { "geofence_id": 2, "name": "Depot A", "alert_count": 28 }
  ]
}
```

---

### 8.6 Device Status

```
GET /v1/analytics/gps/device-status
```

No params. Real-time snapshot.

```json
{
  "online":    22,
  "offline":   14,
  "connected": 36
}
```

---

## 9. Module: Fleet Insights (Proactive)

**Base path:** `/v1/analytics/insights/`
**Services:** `FleetInsightsService`, `InsightsDetectionService`

### 9.1 Fleet Health Score

```
GET /v1/analytics/insights/fleet-health-score
```

Composite 0–100 score. Weights:

| Component | Weight | Source |
|-----------|--------|--------|
| Vehicle active rate | 30% | Status ∈ {active, in_transit} / total |
| Maintenance compliance | 30% | (schedules - overdue) / schedules |
| Incident-free rate | 20% | 1 − (vehicles_with_recent_incident / total) |
| Fuel efficiency score | 20% | actual vs baseline L/100km |

```json
{
  "score": 74.2,
  "rating": "good",
  "components": {
    "vehicle_active_rate":        { "score": 88.0, "weight": 0.30 },
    "maintenance_compliance":     { "score": 86.7, "weight": 0.30 },
    "incident_free_rate":         { "score": 72.9, "weight": 0.20 },
    "fuel_efficiency_score":      { "score": 61.5, "weight": 0.20 }
  },
  "total_vehicles": 48,
  "computed_at": "2026-03-11T14:00:00Z"
}
```

**Ratings:** excellent ≥ 80 · good ≥ 60 · fair ≥ 40 · poor < 40

---

### 9.2 Cost per KM Trend

```
GET /v1/analytics/insights/cost-per-km
```

12-month rolling fuel cost ÷ distance.

**Response:** `{ labels[], data[], chart_type: "line", unit: "₦/km" }`

---

### 9.3 Driver Risk Ranking

```
GET /v1/analytics/insights/driver-risk-ranking
```

**Query params:** `limit` (default: 20). Fixed 90-day window.

```json
{
  "drivers": [
    {
      "user_id": 9,
      "driver_name": "Kola Adesanya",
      "incident_count": 5,
      "risk_score": 100
    }
  ],
  "labels": [], "data": [], "chart_type": "horizontal_bar"
}
```

> risk_score = 100 × (driver_incident_count / max_incident_count_in_fleet)

---

### 9.4 Predictive Maintenance

```
GET /v1/analytics/insights/predictive-maintenance
```

Vehicles with maintenance schedules due within 30 days.

```json
{
  "vehicles": [
    {
      "id": 12,
      "registration": "LAG-001-AA",
      "service_type": "Tyre Rotation",
      "due_date": "2026-03-22",
      "days_until_due": 11
    }
  ]
}
```

---

### 9.5 Fuel Misuse Probability

```
GET /v1/analytics/insights/fuel-misuse-probability
```

Compares GPS-calculated distance vs fuel-card-recorded distance per vehicle.

```json
{
  "vehicles": [
    {
      "id": 7,
      "registration": "LAG-009-AA",
      "gps_distance_km": 820.0,
      "card_distance_km": 1240.0,
      "divergence_pct": 51.2,
      "misuse_probability": "high"
    }
  ]
}
```

**Probability bands:** low < 20% divergence · medium 20–40% · high > 40%

---

### 9.6 Detect Anomalies (AI)

```
POST /v1/analytics/insights/detect-anomalies
```

**Body:**
```json
{ "days": 30 }
```

Runs multi-signal anomaly detection across 4 domains:

| Domain | Signal | Threshold |
|--------|--------|-----------|
| Fuel | L/100km > 8.125 | Critical if > 9.75 |
| Driver behavior | harsh events count | configurable |
| Vehicle health | active maintenance alerts | any |
| Efficiency | trip completion rate | < baseline |

**Response:**
```json
{
  "anomalies": [
    {
      "id": "fuel-12",
      "type": "high_fuel_consumption",
      "severity": "critical",
      "title": "Abnormal fuel consumption on LAG-009-AA",
      "description": "Vehicle consuming 10.2 L/100km vs 6.5 baseline.",
      "vehicle_id": 7,
      "vehicle_registration": "LAG-009-AA",
      "impact": "Est. ₦42,000 excess cost over period.",
      "suggested_action": "Schedule fuel system inspection.",
      "confidence_score": 91,
      "data": { "actual_l_per_100km": 10.2, "baseline": 6.5 }
    }
  ]
}
```

Anomalies are sorted by severity (critical → high → medium → low) then confidence_score descending.

---

## 10. Reports — Export

**Endpoint:**
```
GET /v1/analytics/reports/export
```

**Validated by:** `ExportReportRequest`

**Query params:**

| Param | Required | Values | Default |
|-------|----------|--------|---------|
| `report_type` | yes | see table below | — |
| `format` | no | `pdf`, `csv` | `csv` |
| `filter` | no | `7d`, `30d`, `90d`, `1y` | `30d` |
| `limit` | no | 1–500 | 20 |

**Supported `report_type` values:**

| Module | report_type |
|--------|-------------|
| Fleet | `fleet.utilization-summary` |
| Fleet | `fleet.vehicle-list` |
| Fleet | `fleet.availability-snapshot` |
| Fleet | `fleet.top-vehicles` |
| Fleet | `fleet.asset-performance` |
| Driver | `drivers.trip-summary` |
| Driver | `drivers.top-by-trips` |
| Driver | `drivers.compliance` |
| Driver | `drivers.incident-history` |
| Fuel | `fuel.consumption-report` |
| Fuel | `fuel.cost-report` |
| Fuel | `fuel.efficiency-report` |
| Fuel | `fuel.anomaly-report` |
| Maintenance | `maintenance.schedule-compliance` |
| Maintenance | `maintenance.cost-report` |
| Maintenance | `maintenance.workflow-report` |
| Maintenance | `maintenance.workshop-summary` |
| Incidents | `incidents.summary` |
| Incidents | `incidents.type-distribution` |
| Incidents | `incidents.by-vehicle` |

**Response:**
- `format=csv` → `Content-Type: text/csv` streamed file
- `format=pdf` → `Content-Type: application/pdf` streamed file

**Export pipeline:**

```
GET /analytics/reports/export?report_type=fleet.vehicle-list&format=pdf&filter=30d
        │
        ▼
ReportExportController::export()
        │
        ▼
ReportExportService::exportPdf() / exportCsv()
        │
        ▼
gatherData() → calls FleetUtilizationService::vehicleUtilizationList()
        │
        ▼
Normalizes to { title, headers[], rows[] }
        │
        ▼
PDF: renders view('reports.analytics') via DomPDF → streams binary
CSV: fputcsv() header row + data rows → streams text
        │
        ▼
Content-Disposition: attachment; filename="fleet.vehicle-list_30d_2026-03-11.pdf"
```

---

## 11. Reports — Scheduled

Scheduled reports run automatically on a defined cadence and are emailed as PDF or CSV attachments to a configured recipient list.

**Base path:** `/v1/analytics/reports/scheduled`

### 11.1 List Scheduled Reports

```
GET /v1/analytics/reports/scheduled
```

**Query params:** `page`, `per_page` (default: 20)

**Response:** paginated list of `ScheduledReport` records.

---

### 11.2 Create Scheduled Report

```
POST /v1/analytics/reports/scheduled
```

**Body:**

```json
{
  "name":         "Weekly Fleet Utilization",
  "report_type":  "fleet.utilization-summary",
  "filter":       "7d",
  "format":       "pdf",
  "recipients":   ["ops@company.com", "fleet@company.com"],
  "frequency":    "weekly",
  "day_of_week":  1
}
```

**Validation rules:**

| Field | Rule | Notes |
|-------|------|-------|
| `name` | required, string, max:150 | |
| `report_type` | required, in:VALID_TYPES | See export table |
| `filter` | nullable, in:7d,30d,90d,1y | |
| `format` | nullable, in:pdf,csv | |
| `recipients` | required, array, min:1 | |
| `recipients.*` | required, email | |
| `frequency` | required, in:daily,weekly,monthly | |
| `day_of_week` | required_if:frequency,weekly | 1=Monday … 7=Sunday |
| `day_of_month` | required_if:frequency,monthly | 1–28 |
| `is_active` | nullable, boolean | default: true |

**Response:** `HTTP 201` with created record.

---

### 11.3 Get Scheduled Report

```
GET /v1/analytics/reports/scheduled/{id}
```

---

### 11.4 Update Scheduled Report

```
PATCH /v1/analytics/reports/scheduled/{id}
```

All creation fields are updatable.

---

### 11.5 Delete Scheduled Report

```
DELETE /v1/analytics/reports/scheduled/{id}
```

**Response:** `HTTP 204 No Content`. Soft-deletes the record.

---

### 11.6 How Delivery Works

```
DeliverScheduledReportsJob (queued/scheduled)
     │
     ├─ Loads all ScheduledReport where is_active = true
     │
     ├─ For each: checks isDue()
     │     • daily   → last_delivered_at < today
     │     • weekly  → last_delivered_at < this week AND today == day_of_week
     │     • monthly → last_delivered_at < this month AND today == day_of_month
     │
     ├─ If due:
     │     ReportExportService::generatePdfContent() / generateCsvContent()
     │     Mail::to(recipients)->send(new AnalyticsReportMail($attachment))
     │     update last_delivered_at = now()
     │
     └─ Errors per report are logged but do not stop other deliveries
```

---

## 12. Reports — Custom

Custom reports are org-defined templates with selectable dimensions, metrics, filters, format, and optional recurrence. They are more flexible than scheduled reports.

**Base path:** `/v1/reports/custom`

### 12.1 List Custom Reports

```
GET /v1/reports/custom
```

**Query params:** `page`, `per_page`, `report_type` (filter by type), `is_active` (boolean filter)

---

### 12.2 Create Custom Report

```
POST /v1/reports/custom
```

**Body:**

```json
{
  "name":         "Quarterly Fuel Intelligence",
  "report_type":  "fuel_analysis",
  "dimensions":   ["vehicle", "driver", "date_range"],
  "metrics":      ["fuel_consumed_l", "cost_naira", "efficiency_l_per_100km"],
  "filters": {
    "date_from": "2026-01-01",
    "date_to":   "2026-03-31",
    "status":    "active"
  },
  "format":       "pdf",
  "schedule":     "monthly",
  "day_of_month": 1,
  "recipients":   ["cfo@company.com"],
  "is_active":    true
}
```

**Validation:**

| Field | Rule | Notes |
|-------|------|-------|
| `name` | required, string, max:255 | |
| `report_type` | required | `fuel_analysis`, `maintenance_forecast`, `driver_performance`, `vehicle_utilization`, `incident_summary`, `custom` |
| `dimensions` | nullable, array | items: `fleet`, `cluster`, `vehicle`, `driver`, `date_range` |
| `metrics` | nullable, array | free-form metric keys |
| `filters` | nullable, array | `date_from`, `date_to`, `status` |
| `format` | required | `pdf`, `csv`, `json` |
| `schedule` | nullable | `once`, `daily`, `weekly`, `monthly` |
| `frequency` | nullable | `daily`, `weekly`, `monthly` |
| `day_of_week` | nullable | 1–7 |
| `day_of_month` | nullable | 1–31 |
| `recipients` | nullable, array | email addresses |
| `is_active` | nullable, boolean | |

**Response:** `HTTP 201`

---

### 12.3 Get Custom Report

```
GET /v1/reports/custom/{id}
```

---

### 12.4 Update Custom Report

```
PATCH /v1/reports/custom/{id}
```

---

### 12.5 Delete Custom Report

```
DELETE /v1/reports/custom/{id}
```

**Response:** `HTTP 204`

---

### 12.6 Recommended Templates

```
GET /v1/reports/recommended
```

Returns pre-built report template definitions (no auth required to browse; org templates are pre-populated on org creation).

```json
{
  "templates": [
    {
      "name":        "Monthly Fleet Overview",
      "report_type": "vehicle_utilization",
      "dimensions":  ["vehicle", "date_range"],
      "metrics":     ["trips_count", "total_distance_km", "utilization_pct"],
      "format":      "pdf",
      "schedule":    "monthly",
      "day_of_month": 1
    }
  ]
}
```

---

### 12.7 Scheduled vs Custom — When to Use Which

| Concern | Scheduled Report | Custom Report |
|---------|------------------|---------------|
| Data source | Fixed analytics endpoint (20 types) | Configurable dimensions + metrics |
| Format | PDF or CSV | PDF, CSV, or JSON |
| Recurrence | daily / weekly / monthly | once / daily / weekly / monthly |
| Recipients | Required | Optional |
| Stored template | Yes (ScheduledReport model) | Yes (CustomReport model) |
| On-demand export | Via `/reports/export` | Via future execution endpoint |
| Best for | Routine ops reports emailed automatically | Ad-hoc custom analysis or one-time deep dives |

---

## 13. User Journey: Scheduled Reports

A scheduled report is a set-and-forget configuration. The fleet manager defines **what** to export, **who** receives it, and **when** it fires. The backend handles generation and delivery automatically.

---

### Journey A — Fleet Manager Sets Up a Weekly Utilization Report

```
Step 1 — Navigate to Reports → Scheduled Reports
         GET /v1/analytics/reports/scheduled
         → Page loads with existing scheduled reports list (may be empty)

Step 2 — Click "New Scheduled Report"
         UI shows the creation form

Step 3 — Fill in the form

         Report name:   "Weekly Fleet Utilization"
         Report type:   fleet.utilization-summary        ← dropdown of 20 types
         Date window:   7d (last 7 days)
         Format:        PDF
         Recipients:    ops@company.com, fleet@company.com
         Frequency:     Weekly
         Day of week:   Monday  (day_of_week: 1)
         Active:        Yes

Step 4 — Submit
         POST /v1/analytics/reports/scheduled
         Body:
         {
           "name":        "Weekly Fleet Utilization",
           "report_type": "fleet.utilization-summary",
           "filter":      "7d",
           "format":      "pdf",
           "recipients":  ["ops@company.com", "fleet@company.com"],
           "frequency":   "weekly",
           "day_of_week": 1,
           "is_active":   true
         }

         → HTTP 201  { "data": { "id": 4, "name": "Weekly Fleet Utilization", ... } }
         UI redirects back to the scheduled reports list; new entry appears.

Step 5 — Monday morning arrives
         DeliverScheduledReportsJob runs (queued/cron)
         Checks: last_delivered_at < this week AND today == Monday
         → isDue() = true
         Calls ReportExportService::generatePdfContent('fleet.utilization-summary', ['filter'=>'7d'], orgId)
         Sends email to ops@company.com, fleet@company.com with PDF attachment
         Updates last_delivered_at = now()

Step 6 — Recipients open email, download "fleet.utilization-summary_7d_2026-03-16.pdf"
```

---

### Journey B — Ops Manager Edits the Recipient List

```
Step 1 — Navigate to Reports → Scheduled Reports
         Clicks the "Weekly Fleet Utilization" row

Step 2 — GET /v1/analytics/reports/scheduled/4
         UI pre-fills form with existing values

Step 3 — Add a new recipient, change format to CSV
         PATCH /v1/analytics/reports/scheduled/4
         Body:
         {
           "recipients": ["ops@company.com", "fleet@company.com", "ceo@company.com"],
           "format": "csv"
         }
         → HTTP 200  updated record

Step 4 — Next scheduled delivery uses new recipients and CSV format
```

---

### Journey C — Temporarily Disabling a Report

```
Step 1 — Toggle "Active" switch to OFF on the scheduled report row

         PATCH /v1/analytics/reports/scheduled/4
         Body: { "is_active": false }
         → HTTP 200

         DeliverScheduledReportsJob skips this record (is_active = false).
         last_delivered_at is NOT updated, so when re-enabled it does NOT
         send a catch-up — it waits for the next due window.

Step 2 — Re-enable when ready
         PATCH /v1/analytics/reports/scheduled/4
         Body: { "is_active": true }
```

---

### Journey D — Deleting a Scheduled Report

```
         DELETE /v1/analytics/reports/scheduled/4
         → HTTP 204

         Record is soft-deleted. No future deliveries.
         Audit trail preserved in deleted_at column.
```

---

### Frequency Reference

| `frequency` | Required field | Delivery fires when |
|-------------|----------------|---------------------|
| `daily`     | — | Every day, once `last_delivered_at` < today |
| `weekly`    | `day_of_week` (1–7) | On the specified ISO weekday (1=Mon, 7=Sun) |
| `monthly`   | `day_of_month` (1–28) | On the specified day of the month |

> `day_of_month` is capped at 28 to avoid missing February. For "last day of month" semantics, use day 28.

---

### isDue() Logic (ScheduledReport model)

```
daily   → last_delivered_at IS NULL  OR  last_delivered_at < today (date only)
weekly  → (last_delivered_at IS NULL OR last_delivered_at < start of this week)
          AND today's ISO weekday == day_of_week
monthly → (last_delivered_at IS NULL OR last_delivered_at < start of this month)
          AND today's day-of-month == day_of_month
```

---

### Delivery Error Handling

If PDF/email generation fails for one report, that error is logged and the job continues to the next scheduled report. `last_delivered_at` is **not** updated on failure, so the report will retry on the next job run.

---

### UI State Machine

```
[Empty list]
     │  click "New Scheduled Report"
     ▼
[Create form]
     │  submit → POST 201
     ▼
[Report listed — Active]
     ├─ Edit → PATCH (any field)
     ├─ Toggle off → PATCH is_active=false → [Paused]
     │                                          │  Toggle on → PATCH is_active=true
     └─ Delete → DELETE 204 → [Gone]
```

---

## 14. User Journey: Custom Reports

A custom report is a **saved template** with configurable dimensions, metrics, date filters, and output format. It can be run once or on a recurrence. Unlike scheduled reports (which map 1:1 to a fixed analytics endpoint), custom reports let the user compose their own dataset.

---

### Journey A — Finance Manager Creates a One-Time Quarterly Fuel Analysis

```
Step 1 — Navigate to Reports → Custom Reports
         GET /v1/reports/custom
         → Existing custom reports list

Step 2 — Click "New Custom Report"

Step 3 — Browse recommended templates for inspiration
         GET /v1/reports/recommended
         → Returns pre-built template definitions

Step 4 — Fill in the form

         Name:        "Q1 2026 Fuel Analysis"
         Report type: fuel_analysis
         Dimensions:  vehicle, driver, date_range
         Metrics:     fuel_consumed_l, cost_naira, efficiency_l_per_100km
         Filters:
           date_from: 2026-01-01
           date_to:   2026-03-31
         Format:      pdf
         Schedule:    once
         Recipients:  cfo@company.com
         Active:      true

Step 5 — Submit
         POST /v1/reports/custom
         Body:
         {
           "name":        "Q1 2026 Fuel Analysis",
           "report_type": "fuel_analysis",
           "dimensions":  ["vehicle", "driver", "date_range"],
           "metrics":     ["fuel_consumed_l", "cost_naira", "efficiency_l_per_100km"],
           "filters": {
             "date_from": "2026-01-01",
             "date_to":   "2026-03-31"
           },
           "format":      "pdf",
           "schedule":    "once",
           "recipients":  ["cfo@company.com"],
           "is_active":   true
         }

         → HTTP 201  { "data": { "id": 11, ... } }

Step 6 — Report runs once (or is triggered on-demand)
         Sent as PDF attachment to cfo@company.com.
         Because schedule=once, is_active auto-sets to false after first delivery.
```

---

### Journey B — Ops Creates a Monthly Recurring Driver Performance Report

```
Step 1 — POST /v1/reports/custom
         Body:
         {
           "name":         "Monthly Driver KPIs",
           "report_type":  "driver_performance",
           "dimensions":   ["driver", "date_range"],
           "metrics":      ["trips_count", "total_distance_km", "avg_duration_hours",
                            "incident_count", "compliance_score"],
           "filters":      { "status": "active" },
           "format":       "csv",
           "schedule":     "monthly",
           "day_of_month": 1,
           "recipients":   ["hr@company.com", "ops@company.com"],
           "is_active":    true
         }
         → HTTP 201

Step 2 — 1st of each month: DeliverScheduledReportsJob runs
         Picks up this custom report, generates CSV for the previous month,
         emails to hr@company.com and ops@company.com.

Step 3 — HR requests a mid-month ad-hoc run
         No on-demand trigger endpoint exists yet.
         Workaround: use the Export endpoint for a direct download:
         GET /v1/analytics/reports/export?report_type=drivers.trip-summary&format=csv&filter=30d
```

---

### Journey C — Editing a Custom Report's Metrics

```
Step 1 — GET /v1/reports/custom/11
         UI pre-fills all fields

Step 2 — Add "harsh_events" metric, change format to json
         PATCH /v1/reports/custom/11
         Body:
         {
           "metrics": ["trips_count", "total_distance_km", "avg_duration_hours",
                       "incident_count", "compliance_score", "harsh_events"],
           "format":  "json"
         }
         → HTTP 200
```

---

### Journey D — Deleting a Custom Report

```
         DELETE /v1/reports/custom/11
         → HTTP 204  (soft-deleted, no future runs)
```

---

### Report Types & Available Dimensions

| `report_type` | Description | Recommended Dimensions |
|---------------|-------------|------------------------|
| `fuel_analysis` | Fuel consumption, cost, efficiency | `vehicle`, `driver`, `date_range` |
| `maintenance_forecast` | Upcoming + overdue maintenance | `vehicle`, `fleet`, `date_range` |
| `driver_performance` | Trips, distance, incidents, compliance | `driver`, `date_range` |
| `vehicle_utilization` | Trips, distance, utilization % | `vehicle`, `fleet`, `date_range` |
| `incident_summary` | Incident count, type, resolution | `vehicle`, `driver`, `date_range` |
| `custom` | Free-form — any metrics | any |

**Available dimensions:** `fleet`, `cluster`, `vehicle`, `driver`, `date_range`

---

### Schedule Options

| `schedule` | Additional field | Behaviour |
|------------|-----------------|-----------|
| `once` | — | Runs on next delivery job cycle, then deactivates |
| `daily` | — | Runs every day |
| `weekly` | `day_of_week` (1–7) | Runs on specified weekday |
| `monthly` | `day_of_month` (1–31) | Runs on specified day of month |

---

### Custom vs Scheduled — Decision Guide

```
Do you need a fixed, well-known analytics view (fleet utilization, driver compliance, etc.)?
     │
     ├─ YES → Use Scheduled Report (POST /analytics/reports/scheduled)
     │         • Maps directly to an existing analytics endpoint
     │         • Simpler form: just pick report_type, filter, recipients, cadence
     │
     └─ NO  → Use Custom Report (POST /reports/custom)
               • Choose report_type category + compose dimensions & metrics
               • Supports date_from/date_to filters (not just 7d/30d/90d/1y)
               • Supports JSON output format
               • Better for finance, HR, executive ad-hoc analysis
```

---

### Full Custom Report State Machine

```
POST /reports/custom (is_active: true, schedule: monthly)
     │
     ▼
[Active — awaiting next run]
     │
     ├─ 1st of month → DeliverScheduledReportsJob picks it up
     │                  generates content → emails recipients
     │                  updates last_delivered_at
     │                  remains Active for next month
     │
     ├─ PATCH is_active=false → [Paused — skipped by delivery job]
     │   PATCH is_active=true → [Active again]
     │
     ├─ schedule=once → after first delivery → is_active=false → [Deactivated]
     │
     └─ DELETE → [Soft-deleted — never runs again]
```

---

## 15. Dashboard Endpoints

**Base path:** `/v1/dashboard/`
Requires `auth:client` + `identify.tenant`. No subscription gate.

| Endpoint | Description | Key fields |
|----------|-------------|------------|
| `GET /dashboard/alerts` | Aggregated critical/warning alerts from fuel, maintenance, incidents | `severity`, `limit` param |
| `GET /dashboard/maintenance-forecast` | Upcoming schedules (grouped by date) | `days` param (default: 7) |
| `GET /dashboard/vehicles/total` | Count of org vehicles | — |
| `GET /dashboard/trips/active` | Count of in-progress trips | — |
| `GET /dashboard/incidents/recent` | Recent incidents list | — |
| `GET /dashboard/efficiency/average` | Fleet avg fuel efficiency (L/100km) | — |
| `GET /dashboard/vehicles/weekly` | This week vs last week vehicle comparison | `value`, `change_pct`, `trend` |
| `GET /dashboard/trips/weekly` | This week vs last week trip comparison | — |
| `GET /dashboard/incidents/weekly` | This week vs last week incident comparison | — |
| `GET /dashboard/efficiency/weekly` | This week vs last week efficiency comparison | — |
| `GET /dashboard/vehicles/status` | Vehicle count by status slug | — |

**Weekly comparison shape:**
```json
{
  "this_week":  42,
  "last_week":  38,
  "change_pct": 10.5,
  "trend":      "up"
}
```

---

## 16. Background Jobs & Scheduling

| Job | Queue | Schedule | Purpose |
|-----|-------|----------|---------|
| `AggregateAnalyticsJob` | `analytics` | Nightly | Populates daily fleet/vehicle/driver metric tables for fast dashboard queries |
| `DeliverScheduledReportsJob` | `reports` | Daily (early AM) | Checks all active ScheduledReport records and emails those that are due |
| `GenerateReport` | `reports` | On-demand | Chunked async report generation (batched via `Bus::batch`) |
| `ProcessReportChunk` | `reports` | Dispatched by GenerateReport | Processes and appends one chunk of report data |

**Report generation flow (on-demand):**
```
InitiateGenerateReportJob
     │
     ▼
GenerateReport (tries: 3, timeout: 900s)
     │  marks status=in_progress
     │  calculates total_records
     │  chunks into configurable chunk_size (default: 5000)
     │
     ├─ Bus::batch(ProcessReportChunk × N)
     │     → each chunk appends to result file
     │     → fires ReportProgressUpdated event (WebSocket)
     │
     ├─ batch.then → status=completed, result_url, notify user
     └─ batch.catch → status=failed, stores error
```

---

## 17. Daily Aggregation (Pre-computed Metrics)

Three aggregate tables power fast dashboard and trend queries without scanning raw trip/fuel/incident tables on every request:

### `analytics_daily_fleet_metrics`
One row per organization per day.

| Column | Type | Description |
|--------|------|-------------|
| `date` | date | Aggregation date (yesterday's data) |
| `total_vehicles` | int | All org vehicles |
| `active_vehicles` | int | Status ∈ {active, in_transit} |
| `total_trips` | int | Trips created on that date |
| `total_distance_km` | decimal | Sum of `actual_distance_cover` |
| `total_fuel_consumed` | decimal | Litres |
| `total_fuel_cost` | decimal | Naira |
| `incident_count` | int | Incidents created on that date |
| `maintenance_compliance_rate` | decimal | (non-overdue / total) × 100 |
| `fleet_health_score` | decimal | Composite 0–100 |

### `analytics_daily_vehicle_metrics`
One row per vehicle per day.

| Column | Description |
|--------|-------------|
| `vehicle_id` | FK vehicles.id |
| `trips` | Trips on this date |
| `distance_km` | Distance on this date |
| `fuel_consumed` | Litres on this date |
| `fuel_cost` | Naira on this date |
| `incident_count` | Incidents on this date |
| `completion_rate` | % completed trips |
| `idle_time_hours` | Idle time on this date |

### `analytics_daily_driver_metrics`
One row per driver per day.

| Column | Description |
|--------|-------------|
| `driver_id` | FK users.id |
| `trips` | Trips on this date |
| `distance_km` | Distance driven |
| `avg_speed` | km/h average |
| `harsh_events` | Hard braking / acceleration count |
| `fuel_efficiency` | L/100km |
| `incidents` | Incidents on this date |
| `compliance_score` | Document compliance % |

---

## 18. Role Access Matrix

| Endpoint Group | fleet_manager | finance | dispatcher | compliance | driver | vendor |
|---------------|:---:|:---:|:---:|:---:|:---:|:---:|
| Fleet Utilization | ✅ | ✅ | ✅ | ✅ | — | — |
| Driver Performance | ✅ | — | ✅ | ✅ | — | — |
| Fuel Intelligence | ✅ | ✅ | — | ✅ | — | — |
| Maintenance | ✅ | ✅ | — | ✅ | — | ✅ |
| Incidents | ✅ | — | ✅ | ✅ | — | — |
| GPS & Routes | ✅ | — | ✅ | ✅ | — | — |
| Fleet Insights | ✅ | ✅ | — | ✅ | — | — |
| Anomaly Detection | ✅ | — | — | ✅ | — | — |
| Export Reports | ✅ | ✅ | ✅ | ✅ | — | — |
| Scheduled Reports | ✅ | ✅ | — | ✅ | — | — |
| Custom Reports | ✅ | ✅ | — | ✅ | — | — |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Role enforcement is currently at the subscription + middleware level. Controller-level per-role guards can be added on top using `$user->hasRole(...)` checks.
