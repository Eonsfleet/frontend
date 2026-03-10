# Frontend PRD — Implementation Guide
**EonsFleet Fleet Management System**

**Version:** 1.1
**Date:** March 9, 2026
**Scope:** Maintenance Module · Incident Management · Analytics & Reports
**Approach:** Improve existing UI + implement full API integration where missing

---

## Backend Implementation Audit

> **How to read this section:** Each endpoint is tagged with its implementation status.
> - ✅ **Implemented** — endpoint exists, controller method confirmed, ready to integrate
> - ⚠️ **Partial** — endpoint exists but has known gaps or quirks noted below
> - ❌ **Missing** — no backend implementation; frontend cannot use this until built
>
> Use this audit to determine where UI work can begin immediately vs. where a backend ticket is needed first.

---

### Module 1 — Maintenance

#### 1A. Scheduling (`/v1/maintenances/`)

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/maintenances` | List all schedules; supports `?q`, `?status`, `?per_page`, `?orderBy`, `?sortBy` |
| ✅ | POST | `/v1/maintenances/schedule` | Create schedule |
| ✅ | GET | `/v1/maintenances/schedule/{id}` | Get single schedule |
| ✅ | PUT | `/v1/maintenances/schedule/{id}` | Update schedule |
| ✅ | DELETE | `/v1/maintenances/schedule/{id}` | Delete schedule — returns 204 |
| ✅ | PUT | `/v1/maintenances/schedule/{id}/assign-vendor` | Assign vendor + priority |
| ✅ | GET | `/v1/maintenances/schedule/vehicle/{vehicle_id}` | Schedules for a specific vehicle |
| ✅ | GET | `/v1/maintenances/schedule/{id}/checklists` | Checklists for one schedule |
| ✅ | GET | `/v1/maintenances/schedule/checklists/all` | All org-level schedule checklists |
| ✅ | GET | `/v1/maintenances/checklists` | All checklist templates; supports `?q` search |
| ✅ | POST | `/v1/maintenances/checklists` | Create checklist item |
| ✅ | GET | `/v1/maintenances/upcoming` | Upcoming maintenance jobs |
| ✅ | GET | `/v1/maintenances/stats` | Monthly stats; supports `?filter` (e.g. `"12 months"`) |
| ✅ | GET | `/v1/maintenances/logs/metric` | Log-level KPI metrics |
| ⚠️ | GET | `/v1/maintenances/graph` | Routes to `GraphController@maintenanceGraph` — verify this controller exists before integrating |

**Frontend gaps identified:**
- No endpoint to GET a single log by its own `id` — only by `schedule_id`. A direct `GET /v1/maintenances/logs/{log}` for detail view would improve UX.
- Schedule list `GET /v1/maintenances` returns schedules, not logs. The maintenance "overview" list in the UI likely needs to call both endpoints and combine results.

---

#### 1B. Maintenance Logs (`/v1/maintenances/logs/`)

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/maintenances/logs` | All org logs; paginated |
| ✅ | GET | `/v1/maintenances/logs/{schedule_id}` | Logs for a schedule |
| ✅ | GET | `/v1/maintenances/logs/assigned-to-me` | Technician's own jobs |
| ✅ | PUT | `/v1/maintenances/logs/update-status/{log_id}` | Raw status update (admin use) |
| ✅ | POST | `/v1/maintenances/logs/{log}/assign` | Assign log → vendor/technician |
| ✅ | POST | `/v1/maintenances/logs/{log}/start` | Start job (`assigned → in_progress`) |
| ✅ | POST | `/v1/maintenances/logs/{log}/complete` | Complete job (`in_progress → completed`) |
| ✅ | POST | `/v1/maintenances/logs/{log}/verify` | Verify job (`completed → verified`) |
| ✅ | POST | `/v1/maintenances/logs/{log}/cancel` | Cancel job — requires `reason` |
| ✅ | PATCH | `/v1/maintenances/logs/{log}/progress` | Update `progress_percent` (0–100) |
| ✅ | GET | `/v1/maintenances/logs/{log}/parts` | List parts/labour lines |
| ✅ | POST | `/v1/maintenances/logs/{log}/parts` | Add a part/labour line |
| ✅ | DELETE | `/v1/maintenances/logs/{log}/parts/{part}` | Remove a part line — returns 204 |
| ✅ | POST | `/v1/maintenances/logs/{log}/attachments` | Upload invoice/photo/signature |

**Note:** `unit_price_kobo` is stored in kobo (× 100). Always divide by 100 before displaying currency.

---

#### 1C. Maintenance Alerts (`/v1/maintenance/alerts/`)

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/maintenance/alerts` | List alerts; supports `?per_page` |
| ✅ | GET | `/v1/maintenance/alerts/{alert}` | Alert detail |
| ✅ | PATCH | `/v1/maintenance/alerts/{alert}/acknowledge` | Acknowledge alert |
| ✅ | PATCH | `/v1/maintenance/alerts/{alert}/snooze` | Snooze alert — requires `snooze_until` |
| ✅ | POST | `/v1/maintenance/alerts/{alert}/work-order` | Convert alert into a Maintenance Job |
| ✅ | GET | `/v1/maintenance/alerts/{alert}/history` | Workflow history |
| ✅ | GET | `/v1/maintenance/alerts/{alert}/conversation` | Conversation thread |
| ✅ | POST | `/v1/maintenance/alerts/{alert}/messages` | Post a message |

---

#### 1D. Repair / Maintenance Jobs (`/v1/maintenance/jobs/`)

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/maintenance/jobs` | List jobs |
| ✅ | POST | `/v1/maintenance/jobs` | Create job (auto-submits: `draft → submitted`) |
| ✅ | GET | `/v1/maintenance/jobs/{job}` | Job detail |
| ✅ | PATCH | `/v1/maintenance/jobs/{job}/transition` | Generic transition — requires `status` |
| ✅ | POST | `/v1/maintenance/jobs/{job}/approve` | Approve job |
| ✅ | POST | `/v1/maintenance/jobs/{job}/assign` | Assign job to vendor/mechanic |
| ✅ | GET | `/v1/maintenance/jobs/{job}/cost-summary` | Cost summary with parts breakdown |
| ✅ | POST | `/v1/maintenance/jobs/{job}/verify` | Fleet manager verification |
| ✅ | POST | `/v1/maintenance/jobs/{job}/review` | Workshop performance review |
| ✅ | GET | `/v1/maintenance/jobs/{job}/history` | Workflow history |
| ✅ | GET | `/v1/maintenance/jobs/{job}/conversation` | Conversation thread |
| ✅ | POST | `/v1/maintenance/jobs/{job}/messages` | Post message |

**Job workflow:** `draft → submitted → approved → in_progress → pending_verification → verified → closed`
Side states: `rejected`, `cancelled`

---

#### 1E. Maintenance Analytics (`/v1/analytics/maintenance/`)

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/analytics/maintenance/schedule-compliance` | On-time vs overdue |
| ✅ | GET | `/v1/analytics/maintenance/cost-report` | Cost trends |
| ✅ | GET | `/v1/analytics/maintenance/workflow-report` | Jobs by status |
| ✅ | GET | `/v1/analytics/maintenance/document-compliance` | Document/attachment compliance |
| ✅ | GET | `/v1/analytics/maintenance/workshop-summary` | Vendor performance |
| ✅ | GET | `/v1/dashboard/maintenance-forecast` | Upcoming 7-day forecast widget |

---

### Module 2 — Incident Management

#### 2A. Incident CRUD (`/v1/incidents/`)

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/incidents` | List; supports `?q`, `?status`, `?type`, `?per_page`, `?orderBy` |
| ✅ | POST | `/v1/incidents` | Report incident — auto-creates maintenance job for accident/breakdown |
| ✅ | GET | `/v1/incidents/{incident}` | Detail with vehicle, reporter, address, assignee |
| ✅ | PUT | `/v1/incidents/{incident}` | Full update (editable only in `reported` status) |
| ✅ | DELETE | `/v1/incidents/{incident}` | Soft-delete — returns 204 |
| ❌ | PATCH | `/v1/incidents/{incident}` | Partial update not implemented — frontend must use PUT with all fields |

---

#### 2B. Incident Workflow Transitions

| Status | Method | Endpoint | Transition | Required Body |
|--------|--------|----------|------------|---------------|
| ✅ | POST | `/v1/incidents/{incident}/investigate` | `reported → under_investigation` | `assigned_to` (user ID) |
| ✅ | POST | `/v1/incidents/{incident}/action-required` | `under_investigation → action_required` | none |
| ✅ | POST | `/v1/incidents/{incident}/action-taken` | `action_required → action_taken` | `action_taken` (string) |
| ✅ | POST | `/v1/incidents/{incident}/pending-resolution` | `action_taken → pending_resolution` | `resolved_notes` |
| ✅ | POST | `/v1/incidents/{incident}/resolve` | `pending_resolution → resolved` | `resolved_notes` |
| ✅ | POST | `/v1/incidents/{incident}/close` | `resolved → closed` | `notes` (optional) |
| ✅ | POST | `/v1/incidents/{incident}/cancel` | any open → `cancelled` | `reason` (required) |
| ✅ | POST | `/v1/incidents/{incident}/dismiss` | any open → `dismissed` | `reason` (required); fleet_manager role only |
| ✅ | POST | `/v1/incidents/{incident}/escalate` | any open → `escalated` | `reason`, `severity` |
| ✅ | POST | `/v1/incidents/{incident}/link-job` | Links a MaintenanceJob | `job_id` (integer) |

**Important:** The old `/v1/incidents/{incident}/action` endpoint is a legacy alias for `action-taken` — do not use it in new UI code. Use `/action-taken` instead.

---

#### 2C. Incident Conversation & History

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/incidents/{incident}/history` | Full workflow audit trail |
| ✅ | GET | `/v1/incidents/{incident}/conversation` | Conversation thread + messages |
| ✅ | POST | `/v1/incidents/{incident}/messages` | Post message; supports `is_internal` flag |
| ❌ | GET | `/v1/incidents/{incident}/messages` | List messages independently — not implemented; use `conversation` endpoint which embeds messages |

---

#### 2D. Incident Dashboard & Analytics

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/dashboard/incidents/recent` | Recent incidents widget |
| ✅ | GET | `/v1/dashboard/incidents/weekly` | Week-over-week comparison |
| ✅ | GET | `/v1/analytics/incidents/summary` | Aggregate summary |
| ✅ | GET | `/v1/analytics/incidents/type-distribution` | By incident type |
| ✅ | GET | `/v1/analytics/incidents/priority-distribution` | By priority level |
| ✅ | GET | `/v1/analytics/incidents/over-time` | Timeline chart data |
| ✅ | GET | `/v1/analytics/incidents/resolution-time` | Avg resolution time |
| ✅ | GET | `/v1/analytics/incidents/by-vehicle` | Per-vehicle breakdown |
| ✅ | GET | `/v1/analytics/drivers/incident-history` | Driver-level incident history |

---

### Module 3 — Analytics & Reports

#### 3A. Dashboard KPIs

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/dashboard/alerts` | Active alerts (fuel + maintenance + incidents); `?severity`, `?limit` |
| ✅ | GET | `/v1/dashboard/vehicles/total` | Total vehicles; `?include=trend` |
| ✅ | GET | `/v1/dashboard/vehicles/status` | Status distribution; `?include=trend` |
| ✅ | GET | `/v1/dashboard/vehicles/weekly` | Week-over-week comparison |
| ✅ | GET | `/v1/dashboard/trips/active` | Active trips count; `?include=trend` |
| ✅ | GET | `/v1/dashboard/trips/weekly` | Week-over-week comparison |
| ✅ | GET | `/v1/dashboard/incidents/recent` | Recent incidents |
| ✅ | GET | `/v1/dashboard/incidents/weekly` | Week-over-week comparison |
| ✅ | GET | `/v1/dashboard/efficiency/average` | Avg L/100km; `?include=trend` |
| ✅ | GET | `/v1/dashboard/efficiency/weekly` | Week-over-week comparison |
| ✅ | GET | `/v1/dashboard/maintenance-forecast` | Upcoming 7-day schedule; `?days` |

---

#### 3B. Fleet Utilization Analytics

| Status | Method | Endpoint |
|--------|--------|----------|
| ✅ | GET | `/v1/analytics/fleet/utilization-summary` |
| ✅ | GET | `/v1/analytics/fleet/vehicle-list` |
| ✅ | GET | `/v1/analytics/fleet/availability-snapshot` |
| ✅ | GET | `/v1/analytics/fleet/availability-trend` |
| ✅ | GET | `/v1/analytics/fleet/top-vehicles` |
| ✅ | GET | `/v1/analytics/fleet/asset-performance` |

---

#### 3C. Driver Performance Analytics

| Status | Method | Endpoint |
|--------|--------|----------|
| ✅ | GET | `/v1/analytics/drivers/trip-summary` |
| ✅ | GET | `/v1/analytics/drivers/top-by-trips` |
| ✅ | GET | `/v1/analytics/drivers/workload-distribution` |
| ✅ | GET | `/v1/analytics/drivers/compliance` |
| ✅ | GET | `/v1/analytics/drivers/incident-history` |

---

#### 3D. Fuel Management Analytics

| Status | Method | Endpoint |
|--------|--------|----------|
| ✅ | GET | `/v1/analytics/fuel/consumption-report` |
| ✅ | GET | `/v1/analytics/fuel/cost-report` |
| ✅ | GET | `/v1/analytics/fuel/efficiency-report` |
| ✅ | GET | `/v1/analytics/fuel/anomaly-report` |
| ✅ | GET | `/v1/analytics/fuel/card-transactions` |
| ✅ | GET | `/v1/analytics/fuel/top-bottom-vehicles` |
| ✅ | GET | `/v1/analytics/fuel/driver-efficiency` |
| ✅ | GET | `/v1/analytics/fuel/executive-kpis` |

---

#### 3E. Maintenance Compliance Analytics

| Status | Method | Endpoint |
|--------|--------|----------|
| ✅ | GET | `/v1/analytics/maintenance/schedule-compliance` |
| ✅ | GET | `/v1/analytics/maintenance/cost-report` |
| ✅ | GET | `/v1/analytics/maintenance/workflow-report` |
| ✅ | GET | `/v1/analytics/maintenance/document-compliance` |
| ✅ | GET | `/v1/analytics/maintenance/workshop-summary` |

---

#### 3F. Incident Analytics

| Status | Method | Endpoint |
|--------|--------|----------|
| ✅ | GET | `/v1/analytics/incidents/summary` |
| ✅ | GET | `/v1/analytics/incidents/type-distribution` |
| ✅ | GET | `/v1/analytics/incidents/priority-distribution` |
| ✅ | GET | `/v1/analytics/incidents/over-time` |
| ✅ | GET | `/v1/analytics/incidents/resolution-time` |
| ✅ | GET | `/v1/analytics/incidents/by-vehicle` |

---

#### 3G. Fleet Insights (AI/ML)

| Status | Method | Endpoint |
|--------|--------|----------|
| ✅ | GET | `/v1/analytics/insights/fleet-health-score` |
| ✅ | GET | `/v1/analytics/insights/cost-per-km` |
| ✅ | GET | `/v1/analytics/insights/driver-risk-ranking` |
| ✅ | GET | `/v1/analytics/insights/predictive-maintenance` |
| ✅ | GET | `/v1/analytics/insights/fuel-misuse-probability` |
| ✅ | POST | `/v1/analytics/insights/detect-anomalies` |

---

#### 3H. Reports

| Status | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| ✅ | GET | `/v1/analytics/reports/scheduled` | List scheduled reports |
| ✅ | POST | `/v1/analytics/reports/scheduled` | Create scheduled report |
| ✅ | GET | `/v1/analytics/reports/scheduled/{id}` | Show report |
| ✅ | PUT/PATCH | `/v1/analytics/reports/scheduled/{id}` | Update report |
| ✅ | DELETE | `/v1/analytics/reports/scheduled/{id}` | Delete report — returns 204 |
| ✅ | GET | `/v1/reports/custom` | List custom report templates |
| ✅ | POST | `/v1/reports/custom` | Create custom report |
| ✅ | GET | `/v1/reports/custom/{id}` | Show custom report |
| ✅ | PUT/PATCH | `/v1/reports/custom/{id}` | Update custom report |
| ✅ | DELETE | `/v1/reports/custom/{id}` | Delete — returns 204 |
| ✅ | GET | `/v1/reports/recommended` | Recommended templates with `is_created` flag |
| ✅ | GET | `/v1/analytics/reports/export` | Export PDF/CSV; `?report_type`, `?format`, `?from`, `?to` |

---

### Audit Summary

| Module | Total Endpoints | ✅ Implemented | ⚠️ Partial | ❌ Missing |
|--------|----------------|---------------|------------|-----------|
| Maintenance — Scheduling | 15 | 14 | 1 | 0 |
| Maintenance — Logs | 14 | 14 | 0 | 0 |
| Maintenance — Alerts | 8 | 8 | 0 | 0 |
| Maintenance — Jobs | 12 | 12 | 0 | 0 |
| Maintenance — Analytics | 6 | 6 | 0 | 0 |
| Incident — CRUD | 5 | 4 | 0 | 1 (PATCH) |
| Incident — Transitions | 10 | 10 | 0 | 0 |
| Incident — Conversation | 3 | 2 | 0 | 1 (GET messages) |
| Incident — Analytics | 9 | 9 | 0 | 0 |
| Analytics — Dashboard KPIs | 11 | 11 | 0 | 0 |
| Analytics — Fleet | 6 | 6 | 0 | 0 |
| Analytics — Drivers | 5 | 5 | 0 | 0 |
| Analytics — Fuel | 8 | 8 | 0 | 0 |
| Analytics — Maintenance | 5 | 5 | 0 | 0 |
| Analytics — Incidents | 6 | 6 | 0 | 0 |
| Analytics — Insights | 6 | 6 | 0 | 0 |
| Reports | 12 | 12 | 0 | 0 |
| **TOTAL** | **141** | **138** | **1** | **2** |

### Known Backend Gaps (Frontend Cannot Use Without Backend Changes)

| # | Gap | Impact | Recommendation |
|---|-----|--------|----------------|
| 1 | `PATCH /v1/incidents/{incident}` not implemented | Partial updates require sending all fields via PUT | Use PUT in UI; add PATCH as a backend improvement ticket |
| 2 | `GET /v1/incidents/{incident}/messages` not implemented | Cannot list messages independently; must load full conversation object | Use `GET /conversation` which embeds messages in response |
| 3 | `GET /v1/maintenances/logs/{log}` (by log ID) missing | No direct log detail route; must navigate via schedule | Use `GET /v1/maintenances/logs/{schedule_id}` to find log, then use ID for transitions |
| 4 | `GET /v1/maintenances/graph` (GraphController) unverified | Graph widget may 500 in production | Test endpoint before wiring chart; raise backend ticket if broken |

### Frontend Integration Priority Order

Based on the audit, the recommended integration order is:

1. **Maintenance Scheduling** — all endpoints ready; start here
2. **Maintenance Alerts** — all endpoints ready; critical for alert notification UI
3. **Maintenance Jobs** — all endpoints ready; complex workflow, implement state machine in UI
4. **Maintenance Logs** — all endpoints ready; technician workflow view
5. **Incident CRUD + Transitions** — 94% ready; use PUT for updates, skip PATCH
6. **Incident Conversation** — use `GET /conversation` (embeds messages); skip `GET /messages`
7. **Dashboard KPIs** — all 11 endpoints ready; wire charts and summary cards
8. **All Analytics Sections** — 100% ready; 40+ endpoints, wire progressively per tab
9. **Reports (Scheduled + Custom)** — all ready; implement last as it's lower traffic

---

## Table of Contents

1. [Maintenance Module](#1-maintenance-module)
   - [1.1 Maintenance Scheduling](#11-maintenance-scheduling)
   - [1.2 Maintenance Alerts (Auto-Triggered)](#12-maintenance-alerts-auto-triggered)
   - [1.3 Repair Request (Maintenance Jobs)](#13-repair-request-maintenance-jobs)
   - [1.4 Maintenance Logs](#14-maintenance-logs)
2. [Incident Management](#2-incident-management)
   - [2.1 Incident List & Reporting](#21-incident-list--reporting)
   - [2.2 Incident Workflow](#22-incident-workflow)
   - [2.3 Conversation & History](#23-conversation--history)
3. [Analytics & Reports](#3-analytics--reports)
   - [3.1 Fleet Utilization](#31-fleet-utilization)
   - [3.2 Driver Performance](#32-driver-performance)
   - [3.3 Fuel Management](#33-fuel-management)
   - [3.4 Maintenance Compliance](#34-maintenance-compliance)
   - [3.5 Incident Analytics](#35-incident-analytics)
   - [3.6 Fleet Insights](#36-fleet-insights)
   - [3.7 Scheduled Reports](#37-scheduled-reports)
   - [3.8 Custom Reports](#38-custom-reports)
   - [3.9 Report Export](#39-report-export)

---

# 1. Maintenance Module

## Overview

The Maintenance module covers three distinct but connected areas:
1. **Scheduling** — Pre-planned service cycles for vehicles
2. **Alerts** — System-triggered alerts when service is approaching or overdue
3. **Repair Requests (Jobs)** — Assigned repair work tracked through workflow states

---

## 1.1 Maintenance Scheduling

### Page: Schedule List (`/maintenance/schedules`)

**Purpose:** View and manage all maintenance schedules across the fleet.

**UI Improvements:**
- Add filter pills: All / Active / Pending / Overdue / Completed
- Add inline status badges (green=active, amber=pending, red=overdue)
- Add "Due in X days" countdown column
- Add vehicle thumbnail + registration number in table row
- Show upcoming schedules in a mini calendar widget on the right panel

#### GET — List Maintenance Schedules

```
GET /v1/maintenances
```

**Query Parameters:**
| Param | Type | Description | Example |
|-------|------|-------------|---------|
| `page` | int | Page number | `1` |
| `per_page` | int | Items per page | `15` |
| `status` | string | Filter by status | `active` |
| `q` | string | Search term | `oil change` |
| `orderBy` | string | `asc` or `desc` | `desc` |
| `sortBy` | string | Sort field | `created_at` |

**Response:**
```json
{
  "message": "success",
  "data": {
    "schedules": [
      {
        "id": 1,
        "attributes": {
          "service_type": "oil_change",
          "schedule_type": "time",
          "interval_value": 3,
          "interval_unit": "months",
          "due_date": "2026-03-15T00:00:00Z",
          "expected_odometer": 45000,
          "status": "pending",
          "priority": "high",
          "is_recurring": true,
          "description": "Full oil change and filter replacement"
        },
        "relationships": {
          "vehicle": {
            "id": 5,
            "make": "Toyota",
            "model": "Hilux",
            "registration_number": "LAG-123-AB"
          },
          "vendor": { "id": 2, "name": "QuickFix Workshop" }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 15,
      "total": 42,
      "last_page": 3
    }
  }
}
```

#### GET — Get Single Schedule

```
GET /v1/maintenances/schedule/{schedule_id}
```

**Response:** Same structure as list item above (single record).

#### GET — Schedules by Vehicle

```
GET /v1/maintenances/schedule/vehicle/{vehicle_id}
```

Use this when viewing a vehicle's detail page to show its service history.

---

### Page: Create / Edit Schedule (`/maintenance/schedules/create`)

**UI Improvements:**
- Multi-step form: Vehicle → Service Type → Schedule → Vendor → Notifications
- Show vehicle current mileage when vehicle is selected
- Show checklist selector with checkbox list
- Preview calculated due dates when schedule type is set
- Toggle for recurring vs one-time

#### POST — Create Schedule

```
POST /v1/maintenances/schedule
Content-Type: application/json
```

**Payload:**
```json
{
  "vehicle_id": 5,
  "service_type": "oil_change",
  "schedule_type": "time",
  "interval_value": 3,
  "interval_unit": "months",
  "schedule_date": "2026-04-01",
  "is_recurring": true,
  "end_date": "2027-04-01",
  "occurrences": 4,
  "priority": "high",
  "description": "Full oil change and filter replacement",
  "service_duration": 120,
  "technician_id": 8,
  "vendor_id": 2,
  "turn_on_notification": true,
  "checklists": [1, 3, 5],
  "note": "Use 5W-30 synthetic oil"
}
```

**Valid `service_type` values:** `oil_change`, `tyre_rotation`, `brake_service`, `battery_check`, `engine_check`, `full_inspection`, `transmission_service`

**Valid `schedule_type` values:** `time`, `mileage`

**Valid `interval_unit` values (for time-based):** `days`, `weeks`, `months`

**Response:**
```json
{
  "message": "Maintenance Scheduled Successfully",
  "data": {
    "schedule": { /* ScheduledMaintenanceResource */ }
  }
}
```

#### PUT — Update Schedule

```
PUT /v1/maintenances/schedule/{schedule_id}
```

**Payload:** Same fields as create, all optional.

#### DELETE — Delete Schedule

```
DELETE /v1/maintenances/schedule/{schedule_id}
```

**Response:** `204 No Content`

#### PUT — Assign Vendor to Schedule

```
PUT /v1/maintenances/schedule/{schedule_id}/assign-vendor
```

**Payload:**
```json
{
  "vendor_id": 3,
  "priority": "high"
}
```

---

### Component: Checklist Selector

Used in the Create/Edit Schedule form to select service checklists.

#### GET — All Org Checklists

```
GET /v1/maintenances/schedule/checklists/all
```

**Response:**
```json
{
  "data": {
    "checklists": [
      { "id": 1, "name": "Pre-service Inspection" },
      { "id": 2, "name": "Engine Oil Check" },
      { "id": 3, "name": "Tyre Pressure Check" }
    ]
  }
}
```

#### GET — Checklists for a Schedule

```
GET /v1/maintenances/schedule/{schedule_id}/checklists
```

---

### Component: Dashboard Maintenance Forecast Widget

Use this on the main dashboard to show upcoming maintenance in the next 7 days.

#### GET — Maintenance Forecast

```
GET /v1/dashboard/maintenance-forecast?days=7
```

**Response:**
```json
{
  "data": {
    "forecast": [
      {
        "date": "2026-03-11",
        "count": 2,
        "schedules": [
          {
            "id": 1,
            "vehicle_id": 5,
            "vehicle_registration": "LAG-123-AB",
            "service_type": "Oil Change",
            "due_date": "2026-03-11T00:00:00Z",
            "status": "pending"
          }
        ]
      }
    ]
  }
}
```

---

## 1.2 Maintenance Alerts (Auto-Triggered)

### Page: Alert List (`/maintenance/alerts`)

**Context:** Alerts are **auto-generated** by the system when:
- A maintenance schedule is approaching (within 200km or 14 days)
- A schedule becomes overdue

**UI Improvements:**
- Top banner: count of critical vs warning alerts
- Color coding: orange=approaching, red=overdue, gray=snoozed
- Show vehicle + schedule linked to each alert
- Action buttons: Acknowledge / Snooze / Create Work Order
- "Work Order Created" badge if a job was raised from this alert

#### GET — List Alerts

```
GET /v1/maintenance/alerts
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `triggered`, `acknowledged`, `overdue`, `snoozed`, `work_order_created`, `closed` |
| `per_page` | int | Default 15 |

**Response:**
```json
{
  "data": {
    "alerts": [
      {
        "id": 10,
        "attributes": {
          "alert_type": "approaching",
          "threshold_type": "time",
          "status": "triggered",
          "snooze_count": 0,
          "snooze_expires_at": null,
          "triggered_at": "2026-03-09T08:00:00Z",
          "acknowledged_at": null,
          "created_at": "2026-03-09T08:00:00Z"
        },
        "relationships": {
          "vehicle": {
            "id": 5,
            "make": "Toyota",
            "model": "Hilux",
            "registration_number": "LAG-123-AB"
          },
          "schedule": {
            "id": 3,
            "service_type": "oil_change",
            "schedule_type": "time",
            "due_date": "2026-03-15T00:00:00Z"
          },
          "maintenance_job": null
        }
      }
    ],
    "pagination": { "current_page": 1, "total": 8, "last_page": 1 }
  }
}
```

#### GET — Alert Details

```
GET /v1/maintenance/alerts/{alert_id}
```

#### PATCH — Acknowledge Alert

```
PATCH /v1/maintenance/alerts/{alert_id}/acknowledge
```

**No body required.**

**Response:**
```json
{ "message": "Alert acknowledged.", "data": { "status": "acknowledged" } }
```

#### PATCH — Snooze Alert

```
PATCH /v1/maintenance/alerts/{alert_id}/snooze
```

**Payload:**
```json
{
  "snooze_days": 7,
  "reason": "Vehicle is on a long-distance trip"
}
```

**Response:**
```json
{ "message": "Alert snoozed.", "data": { "status": "snoozed" } }
```

#### POST — Create Work Order from Alert

```
POST /v1/maintenance/alerts/{alert_id}/work-order
```

**Payload:**
```json
{
  "title": "Oil Change — LAG-123-AB",
  "description": "Routine oil change based on maintenance alert",
  "fault_category": "routine_service",
  "cost_estimate_kobo": 2500000,
  "vendor_id": 3,
  "driver_id": 12
}
```

**Response:** Returns the new `MaintenanceJob` resource.

---

## 1.3 Repair Request (Maintenance Jobs)

### Page: Jobs List (`/maintenance/jobs`)

**Purpose:** Track all repair requests from creation through workflow states.

**Workflow States:**
```
draft → submitted → approved → in_progress → pending_verification → verified → closed
                ↘ rejected
```

**UI Improvements:**
- Kanban-style board view (grouped by status) + table list view toggle
- Status progress bar on job detail page
- Show cost estimate vs actual cost when completed
- Link to related incident if the job was created from an incident

#### GET — List Maintenance Jobs

```
GET /v1/maintenance/jobs
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by workflow status |
| `per_page` | int | Default 15 |
| `q` | string | Search by reference or title |

**Response:**
```json
{
  "data": {
    "jobs": [
      {
        "id": 1,
        "attributes": {
          "reference": "MJ-2026-00001",
          "title": "Brake pad replacement",
          "description": "Front brake pads worn below safe limit",
          "fault_category": "brake_system",
          "status": "approved",
          "cost_estimate": 45000.00,
          "actual_cost": null,
          "currency": "NGN",
          "started_at": null,
          "completed_at": null,
          "created_at": "2026-03-09T10:00:00Z"
        },
        "relationships": {
          "vehicle": { "id": 5, "make": "Toyota", "model": "Hilux", "registration_number": "LAG-123-AB" },
          "driver": { "id": 12, "f_name": "Emeka", "l_name": "Obi" },
          "vendor": { "id": 2, "name": "QuickFix Workshop" },
          "assigned_by": { "id": 3, "f_name": "James", "l_name": "Fleet" }
        }
      }
    ],
    "pagination": { "current_page": 1, "total": 15, "last_page": 1 }
  }
}
```

#### GET — Job Details

```
GET /v1/maintenance/jobs/{job_id}
```

Returns full job with `workflow_history` and `conversation` loaded.

#### POST — Create Repair Request

```
POST /v1/maintenance/jobs
```

**Payload:**
```json
{
  "vehicle_id": 5,
  "title": "Brake pad replacement",
  "description": "Front brake pads worn below safe limit — confirmed by driver inspection",
  "fault_category": "brake_system",
  "cost_estimate_kobo": 4500000,
  "driver_id": 12
}
```

**`cost_estimate_kobo`** — Amount in kobo (multiply naira by 100). e.g. ₦45,000 = `4500000`

**Response:** `201 Created` with job resource.

#### PATCH — Transition Job Status

```
PATCH /v1/maintenance/jobs/{job_id}/transition
```

**Payload:**
```json
{
  "to_status": "in_progress",
  "reason": "Approved and materials sourced",
  "notes": "Parts ordered from supplier"
}
```

**Valid transitions:**
| From | To |
|------|----|
| `draft` | `submitted` |
| `submitted` | `approved`, `rejected` |
| `approved` | `in_progress` |
| `in_progress` | `pending_verification` |
| `pending_verification` | `verified` |
| `verified` | `closed` |

#### POST — Approve / Reject Job

```
POST /v1/maintenance/jobs/{job_id}/approve
```

**Payload:**
```json
{
  "from_status": "submitted",
  "to_status": "approved",
  "decision": "approved",
  "reason": "Budget approved by finance department"
}
```

#### POST — Assign to Workshop

```
POST /v1/maintenance/jobs/{job_id}/assign
```

**Payload:**
```json
{ "vendor_id": 3 }
```

#### GET — Cost Summary

```
GET /v1/maintenance/jobs/{job_id}/cost-summary
```

**Response:**
```json
{
  "data": {
    "cost_summary": {
      "cost_estimate": 45000.00,
      "actual_cost": 48500.00,
      "parts_cost": 32000.00,
      "labor_cost": 16500.00,
      "variance": 3500.00,
      "currency": "NGN"
    }
  }
}
```

#### POST — Verify Completed Job

```
POST /v1/maintenance/jobs/{job_id}/verify
```

No body required. Transitions: `pending_verification → verified → closed`.

#### POST — Submit Workshop Review

```
POST /v1/maintenance/jobs/{job_id}/review
```

**Payload:**
```json
{
  "rating": 4,
  "comment": "Work was done well, but took longer than quoted"
}
```

---

### Component: Workflow Conversation Panel

Show on the right sidebar of every Job detail page. Allows team communication on the job.

#### GET — Conversation

```
GET /v1/maintenance/jobs/{job_id}/conversation
```

**Response:**
```json
{
  "data": {
    "conversation": {
      "id": 14,
      "messages": [
        {
          "id": 1,
          "body": "Vehicle ready for pickup, please confirm",
          "sender_id": 12,
          "sender_role": "mechanic",
          "is_internal": false,
          "created_at": "2026-03-09T11:00:00Z"
        }
      ]
    }
  }
}
```

#### POST — Post Message

```
POST /v1/maintenance/jobs/{job_id}/messages
```

**Payload:**
```json
{
  "body": "Parts have been ordered. ETA 2 days.",
  "is_internal": false
}
```

`is_internal: true` — Message only visible to fleet managers (hidden from driver/vendor).

---

### Component: Workflow History Timeline

Show on job detail page as a vertical timeline of status changes.

#### GET — Job History

```
GET /v1/maintenance/jobs/{job_id}/history
```

**Response:**
```json
{
  "data": {
    "history": [
      {
        "id": 1,
        "from_status": "draft",
        "to_status": "submitted",
        "actor_id": 12,
        "actor_role": "driver",
        "reason": null,
        "created_at": "2026-03-09T10:00:00Z"
      },
      {
        "id": 2,
        "from_status": "submitted",
        "to_status": "approved",
        "actor_id": 3,
        "actor_role": "fleet_manager",
        "reason": "Budget approved",
        "created_at": "2026-03-09T11:30:00Z"
      }
    ]
  }
}
```

---

## 1.4 Maintenance Logs

### Page: Maintenance Logs (`/maintenance/logs`)

**Purpose:** Track actual execution of scheduled maintenance tasks (distinct from repair jobs).

**Status Flow:** `pending → in_progress → completed / cancelled`

#### GET — All Logs

```
GET /v1/maintenances/logs
```

#### GET — Logs for a Schedule

```
GET /v1/maintenances/logs/{schedule_id}
```

#### GET — My Assigned Logs

```
GET /v1/maintenances/logs/assigned-to-me
```

For mechanic role — shows only logs assigned to them.

#### GET — Metrics

```
GET /v1/maintenances/logs/metric
```

#### POST — Start Log

```
POST /v1/maintenances/logs/{log_id}/start
```

#### POST — Complete Log

```
POST /v1/maintenances/logs/{log_id}/complete
```

#### PATCH — Update Progress

```
PATCH /v1/maintenances/logs/{log_id}/progress
```

**Payload:**
```json
{
  "progress": 65,
  "note": "Oil drained, waiting for new filter delivery"
}
```

#### POST — Add Parts

```
POST /v1/maintenances/logs/{log_id}/parts
```

**Payload:**
```json
{
  "name": "Oil Filter",
  "quantity": 1,
  "unit_price_kobo": 500000,
  "supplier": "AutoParts Lagos"
}
```

#### GET — List Parts

```
GET /v1/maintenances/logs/{log_id}/parts
```

#### DELETE — Remove Part

```
DELETE /v1/maintenances/logs/{log_id}/parts/{part_id}
```

---

---

# 2. Incident Management

## Overview

Incidents track vehicle accidents, breakdowns, theft, and other fleet events through a structured 9-state workflow with conversation threading and history tracking.

**Full Workflow:**
```
reported → under_investigation → action_required → action_taken → pending_resolution → resolved → closed
         ↘ dismissed
         ↘ cancelled (from any open state)
         ↘ escalated (raises severity)
```

---

## 2.1 Incident List & Reporting

### Page: Incident List (`/incidents`)

**UI Improvements:**
- Map view toggle — show incidents as pins on a map using `coords` field
- Severity color-coded rows: critical=red, high=orange, medium=yellow
- Quick-filter tabs: All / Open / Under Investigation / Resolved / Closed
- Export button (links to report export)

#### GET — List Incidents

```
GET /v1/incidents
```

**Query Parameters:**
| Param | Type | Description | Example |
|-------|------|-------------|---------|
| `per_page` | int | Items per page | `15` |
| `q` | string | Search reference/type/description | `INC-ABC` |
| `status` | string | Lifecycle state | `reported` |
| `type` | string | Incident type | `accident` |
| `orderBy` | string | `asc` / `desc` | `desc` |

**Valid status values:** `reported`, `under_investigation`, `action_required`, `action_taken`, `pending_resolution`, `resolved`, `closed`, `cancelled`, `dismissed`, `escalated`

**Valid type values:** `accident`, `breakdown`, `theft`, `traffic_violation`, `cargo_damage`

**Response:**
```json
{
  "data": {
    "incidents": [
      {
        "id": "1",
        "attributes": {
          "victim_name": "John Doe",
          "type": "accident",
          "status": "under_investigation",
          "occured_date": "2026-03-08",
          "occured_time": "14:30:00",
          "priority": "high",
          "description": "Collision at Lekki-Epe expressway",
          "coords": "6.5244,3.3792",
          "media": ["https://cdn.eonsfleet.com/incident/img1.jpg"],
          "witness": [{ "name": "Mr. Bayo", "phone": "0803..." }]
        },
        "relationships": {
          "vehicle": { "id": 5, "make": "Toyota", "model": "Hilux", "registration_number": "LAG-123-AB" },
          "reported_by": { "id": 3, "f_name": "James", "l_name": "Okafor", "avatar": "..." },
          "driver": { "id": 12, "f_name": "Emeka", "l_name": "Obi", "avatar": "..." },
          "address": { "street": "12 Lekki-Epe Expressway", "state": "Lagos", "city": "Lagos" }
        }
      }
    ],
    "pagination": { "current_page": 1, "per_page": 15, "total": 24, "last_page": 2 }
  }
}
```

---

### Page: Report Incident (`/incidents/create`)

**UI Improvements:**
- Map picker for incident location (click to set coords)
- File upload for media (photos/videos)
- Witness form — dynamically add/remove witness entries
- Vehicle selector pre-populated with fleet vehicles
- Auto-detect driver from vehicle assignment

#### POST — Create Incident

```
POST /v1/incidents
Content-Type: application/json
```

**Payload:**
```json
{
  "vehicle_id": 5,
  "victim_name": "John Doe",
  "type": "accident",
  "date": "2026-03-08",
  "time": "14:30",
  "street": "12 Lekki-Epe Expressway",
  "state": "Lagos",
  "city": "Lagos",
  "coords": "6.5244,3.3792",
  "description": "Vehicle collided with another car at the junction. Driver uninjured, front bumper damaged.",
  "priority": "high",
  "media": [
    "https://cdn.eonsfleet.com/incident/photo1.jpg",
    "https://cdn.eonsfleet.com/incident/photo2.jpg"
  ],
  "witness": [
    { "name": "Mr. Bayo Adeleke", "phone": "0803-456-7890", "statement": "Car ran red light" }
  ]
}
```

**`priority` values:** `low`, `medium`, `high`, `critical`

**Response:** `201 Created`
```json
{
  "message": "Incident reported successfully",
  "data": {
    "id": "24",
    "attributes": { "type": "accident", "status": "reported", ... }
  }
}
```

> **Note:** For `accident` and `breakdown` types, a corrective maintenance job (`MaintenanceJob`) is **automatically created** for the vehicle.

---

### Page: Incident Detail (`/incidents/{id}`)

**UI Improvements:**
- Header: reference, status badge, priority badge, timestamp
- Map showing incident location (from coords)
- Media gallery
- Witness list
- Linked maintenance job card (if auto-created)
- Workflow action buttons based on current status and user role
- Right sidebar: Conversation + History timeline

#### GET — Incident Details

```
GET /v1/incidents/{incident_id}
```

Returns full incident with `vehicle`, `reportBy`, `user`, `address`, `assignedTo` loaded.

#### PUT — Update Incident (reported status only)

```
PUT /v1/incidents/{incident_id}
```

**Payload (all optional):**
```json
{
  "description": "Updated: Vehicle damage more extensive than initially assessed",
  "priority": "critical",
  "media": ["https://cdn.eonsfleet.com/incident/updated-photo.jpg"]
}
```

---

## 2.2 Incident Workflow

Show workflow action buttons on the incident detail page, filtered by current status and user role.

### State Machine Summary

| Current Status | Available Actions | Required Role |
|----------------|-------------------|---------------|
| `reported` | Assign for Investigation | fleet_manager, administrator |
| `reported` | Dismiss | fleet_manager, administrator |
| `reported` | Cancel | fleet_manager |
| `under_investigation` | Define Action Required | fleet_manager |
| `under_investigation` | Escalate | fleet_manager |
| `under_investigation` | Cancel | fleet_manager |
| `action_required` | Mark Action Taken | mechanic, fleet_manager |
| `action_taken` | Submit for Resolution | fleet_manager |
| `pending_resolution` | Resolve | fleet_manager, administrator |
| `resolved` | Close | administrator |

---

#### POST — Assign for Investigation

```
POST /v1/incidents/{incident_id}/investigate
```

**Payload:**
```json
{ "assigned_to": 7 }
```

Transitions: `reported → under_investigation`

---

#### POST — Define Action Required

```
POST /v1/incidents/{incident_id}/action-required
```

**No additional payload required.**

Transitions: `under_investigation → action_required`

---

#### POST — Mark Action Taken

```
POST /v1/incidents/{incident_id}/action-taken
```

**Payload:**
```json
{ "action_taken": "Vehicle inspected by mechanic. Brake failure confirmed. Repair order raised." }
```

Transitions: `action_required → action_taken`

---

#### POST — Submit for Resolution

```
POST /v1/incidents/{incident_id}/pending-resolution
```

**Payload:**
```json
{ "resolved_notes": "Insurance claim filed. Vehicle repaired and returned to fleet." }
```

Transitions: `action_taken → pending_resolution`

---

#### POST — Resolve Incident

```
POST /v1/incidents/{incident_id}/resolve
```

**Payload:**
```json
{ "resolved_notes": "All corrective actions completed. Vehicle returned to service." }
```

Transitions: `pending_resolution → resolved`

---

#### POST — Close Incident

```
POST /v1/incidents/{incident_id}/close
```

**Payload:**
```json
{ "notes": "Case closed. All reports filed and archived." }
```

Transitions: `resolved → closed`

---

#### POST — Cancel Incident

```
POST /v1/incidents/{incident_id}/cancel
```

**Payload:**
```json
{ "reason": "Duplicate report — covered under INC-XY789." }
```

---

#### POST — Dismiss Incident

```
POST /v1/incidents/{incident_id}/dismiss
```

**Payload:**
```json
{ "reason": "Report filed in error. Vehicle was in depot at time stated." }
```

Fleet managers and administrators only.

---

#### POST — Escalate Incident

```
POST /v1/incidents/{incident_id}/escalate
```

**Payload:**
```json
{
  "reason": "Local team unable to handle. Requires insurance adjuster involvement.",
  "severity": "critical"
}
```

---

#### POST — Link Maintenance Job

```
POST /v1/incidents/{incident_id}/link-job
```

**Payload:**
```json
{ "job_id": 14 }
```

Links an existing `MaintenanceJob` to this incident for traceability.

---

## 2.3 Conversation & History

Shared across incidents (same API pattern as maintenance jobs).

#### GET — Conversation

```
GET /v1/incidents/{incident_id}/conversation
```

**Response:**
```json
{
  "data": {
    "conversation": {
      "id": 8,
      "messages": [
        {
          "id": 1,
          "body": "Driver has been contacted. Obtaining insurance details.",
          "sender_id": 7,
          "sender_role": "fleet_manager",
          "is_internal": false,
          "created_at": "2026-03-08T16:00:00Z"
        },
        {
          "id": 2,
          "body": "Internal note: driver's behavior score flagged",
          "sender_id": 3,
          "sender_role": "administrator",
          "is_internal": true,
          "created_at": "2026-03-08T17:00:00Z"
        }
      ]
    }
  }
}
```

#### POST — Post Message

```
POST /v1/incidents/{incident_id}/messages
```

**Payload:**
```json
{
  "body": "Insurance adjuster scheduled for 10 March 2026.",
  "is_internal": false
}
```

#### GET — Workflow History

```
GET /v1/incidents/{incident_id}/history
```

**Response:**
```json
{
  "data": {
    "history": [
      {
        "id": 1,
        "from_status": "reported",
        "to_status": "under_investigation",
        "actor_id": 3,
        "actor_role": "fleet_manager",
        "reason": null,
        "created_at": "2026-03-08T15:00:00Z"
      }
    ]
  }
}
```

---

---

# 3. Analytics & Reports

## Overview

The analytics layer provides 6 data categories, an insights layer, scheduled delivery, custom report templates, and on-demand export.

**Access requirement:** `org.subscription:analytics` — ensure subscription middleware check before rendering these pages.

---

## 3.1 Fleet Utilization

### Page: Fleet Analytics (`/analytics/fleet`)

**UI Improvements:**
- Summary KPI cards at the top (total vehicles, active %, utilization rate, idle time)
- Availability trend chart (line chart, last 30/90 days)
- Vehicle list table with utilization % per vehicle
- Top vehicles donut/bar chart

#### GET — Utilization Summary

```
GET /v1/analytics/fleet/utilization-summary
```

**Response:**
```json
{
  "data": {
    "total_vehicles": 53,
    "active_vehicles": 41,
    "idle_vehicles": 8,
    "maintenance_vehicles": 4,
    "utilization_rate": 77.36,
    "avg_daily_km": 142.5,
    "avg_trip_duration_hours": 3.2
  }
}
```

#### GET — Vehicle List (with utilization)

```
GET /v1/analytics/fleet/vehicle-list
```

#### GET — Availability Snapshot

```
GET /v1/analytics/fleet/availability-snapshot
```

**Response:** Vehicles grouped by status with counts.

#### GET — Availability Trend

```
GET /v1/analytics/fleet/availability-trend
```

**Query Parameters:**
| Param | Description | Example |
|-------|-------------|---------|
| `filter` | Date range | `30d`, `90d`, `1y` |

Returns time-series data for charting availability over time.

#### GET — Top Vehicles

```
GET /v1/analytics/fleet/top-vehicles
```

Returns highest-performing vehicles ranked by trips, distance, or utilization.

#### GET — Asset Performance Summary

```
GET /v1/analytics/fleet/asset-performance
```

Returns per-vehicle cost, utilization, and incident rate summary.

---

## 3.2 Driver Performance

### Page: Driver Analytics (`/analytics/drivers`)

**UI Improvements:**
- Leaderboard: Top 5 drivers with score/trips/incidents
- Compliance gauge (overall org compliance %)
- Workload distribution bar chart
- Incident history timeline per driver

#### GET — Trip Summary

```
GET /v1/analytics/drivers/trip-summary
```

#### GET — Top Drivers by Trips

```
GET /v1/analytics/drivers/top-by-trips
```

**Query Parameters:**
| Param | Description | Example |
|-------|-------------|---------|
| `limit` | Max results | `10` |
| `filter` | Date range | `30d` |

#### GET — Workload Distribution

```
GET /v1/analytics/drivers/workload-distribution
```

Returns trip count per driver for workload balancing.

#### GET — Compliance Report

```
GET /v1/analytics/drivers/compliance
```

Returns drivers with overdue license renewals, missing documents, or violations.

#### GET — Incident History

```
GET /v1/analytics/drivers/incident-history
```

Returns incidents per driver with severity breakdown.

---

## 3.3 Fuel Management

### Page: Fuel Analytics (`/analytics/fuel`)

**UI Improvements:**
- Monthly cost trend chart
- Efficiency heatmap (vehicle × week)
- Anomaly alerts list with link to fuel alerts module
- Top 5 most efficient / least efficient vehicles

#### GET — Consumption Report

```
GET /v1/analytics/fuel/consumption-report
```

**Query Parameters:** `filter` (7d, 30d, 90d, 1y)

#### GET — Cost Report

```
GET /v1/analytics/fuel/cost-report
```

Returns total spend, average cost per km, and period comparison.

#### GET — Efficiency Report

```
GET /v1/analytics/fuel/efficiency-report
```

Returns L/100km per vehicle with rankings.

#### GET — Anomaly Report

```
GET /v1/analytics/fuel/anomaly-report
```

Returns detected fuel theft, sudden drops, and sensor malfunctions.

#### GET — Card Transactions

```
GET /v1/analytics/fuel/card-transactions
```

Returns fuel card usage summary and per-transaction breakdown.

#### GET — Top/Bottom Vehicles

```
GET /v1/analytics/fuel/top-bottom-vehicles
```

Returns most and least fuel-efficient vehicles side by side.

#### GET — Driver Efficiency

```
GET /v1/analytics/fuel/driver-efficiency
```

Returns fuel efficiency ranked by driver.

#### GET — Executive KPIs

```
GET /v1/analytics/fuel/executive-kpis
```

Returns high-level fuel KPIs suitable for executive dashboard view.

---

## 3.4 Maintenance Compliance

### Page: Maintenance Analytics (`/analytics/maintenance`)

**UI Improvements:**
- Compliance gauge: % schedules on-time vs overdue
- Cost breakdown pie chart: labor vs parts vs external vendor
- Workflow funnel: jobs by status
- Document expiry calendar

#### GET — Schedule Compliance

```
GET /v1/analytics/maintenance/schedule-compliance
```

**Response:**
```json
{
  "data": {
    "total_schedules": 42,
    "on_time": 31,
    "overdue": 8,
    "approaching": 3,
    "compliance_rate": 73.8,
    "by_vehicle": [
      { "vehicle_id": 5, "registration": "LAG-123-AB", "status": "overdue", "days_overdue": 12 }
    ]
  }
}
```

#### GET — Cost Report

```
GET /v1/analytics/maintenance/cost-report
```

**Query Parameters:** `filter` (30d, 90d, 1y)

#### GET — Workflow Report

```
GET /v1/analytics/maintenance/workflow-report
```

Returns job counts per workflow status and average time in each state.

#### GET — Document Compliance

```
GET /v1/analytics/maintenance/document-compliance
```

Returns vehicle documents expiring within defined periods.

#### GET — Workshop Summary

```
GET /v1/analytics/maintenance/workshop-summary
```

Returns vendor/workshop performance: job count, total cost billed, avg rating.

---

## 3.5 Incident Analytics

### Page: Incident Analytics (`/analytics/incidents`)

**UI Improvements:**
- Incident trend chart (weekly count, last 6 months)
- Type distribution donut chart (accident / breakdown / theft / etc.)
- Priority breakdown bar chart
- Most incident-prone vehicles table
- Resolution time benchmark (avg days to close)

#### GET — Incident Summary

```
GET /v1/analytics/incidents/summary
```

**Response:**
```json
{
  "data": {
    "total": 48,
    "by_status": {
      "reported": 5,
      "under_investigation": 8,
      "action_taken": 3,
      "resolved": 20,
      "closed": 12
    },
    "by_priority": { "critical": 4, "high": 12, "medium": 18, "low": 14 },
    "avg_resolution_days": 6.4
  }
}
```

#### GET — Type Distribution

```
GET /v1/analytics/incidents/type-distribution
```

#### GET — Priority Distribution

```
GET /v1/analytics/incidents/priority-distribution
```

#### GET — Incidents Over Time

```
GET /v1/analytics/incidents/over-time?filter=30d
```

**`filter` values:** `7d`, `30d`, `90d`, `1y`

Returns daily/weekly incident count for trend charting.

#### GET — Resolution Time

```
GET /v1/analytics/incidents/resolution-time
```

Returns average days to resolve, broken down by incident type.

#### GET — Incidents by Vehicle

```
GET /v1/analytics/incidents/by-vehicle?limit=10
```

Returns vehicles ranked by total incident count.

---

## 3.6 Fleet Insights (AI Layer)

### Page: Fleet Insights (`/analytics/insights`)

**UI Improvements:**
- Fleet health score gauge (0–100 with color bands)
- Cost per km trend chart
- Driver risk ranking heatmap
- Predictive maintenance countdown list
- Fuel misuse probability alerts list

#### GET — Fleet Health Score

```
GET /v1/analytics/insights/fleet-health-score
```

**Response:**
```json
{
  "data": {
    "score": 72,
    "band": "good",
    "components": {
      "maintenance_compliance": 68,
      "incident_rate": 85,
      "driver_behavior": 74,
      "fuel_efficiency": 71
    },
    "recommendations": [
      "3 vehicles are overdue for service",
      "Driver Emeka Obi has 3 incidents in 30 days"
    ]
  }
}
```

#### GET — Cost Per KM Trend

```
GET /v1/analytics/insights/cost-per-km
```

#### GET — Driver Risk Ranking

```
GET /v1/analytics/insights/driver-risk-ranking
```

Returns drivers ordered by risk score (incident history + behavior patterns).

#### GET — Predictive Maintenance

```
GET /v1/analytics/insights/predictive-maintenance
```

Returns vehicles predicted to need maintenance soon based on mileage trends.

#### GET — Fuel Misuse Probability

```
GET /v1/analytics/insights/fuel-misuse-probability
```

Returns vehicles flagged as likely fuel misuse candidates.

#### POST — Detect Anomalies

```
POST /v1/analytics/insights/detect-anomalies
```

**Payload:**
```json
{
  "target": "fuel",
  "vehicle_ids": [5, 12, 18],
  "period": "30d"
}
```

---

## 3.7 Scheduled Reports

### Page: Scheduled Reports (`/reports/scheduled`)

**Purpose:** Configure reports to be automatically emailed on a recurring schedule.

**UI Improvements:**
- Card grid showing each report with status (active/paused) toggle
- "Next delivery" countdown
- Edit/delete actions per card
- Empty state with "Create your first scheduled report" CTA

#### GET — List Scheduled Reports

```
GET /v1/analytics/reports/scheduled
```

**Response:**
```json
{
  "data": {
    "data": [
      {
        "id": 1,
        "name": "Weekly Fuel Report",
        "report_type": "fuel_analysis",
        "format": "pdf",
        "frequency": "weekly",
        "day_of_week": 1,
        "day_of_month": null,
        "recipients": ["admin@company.com", "finance@company.com"],
        "is_active": true,
        "last_delivered_at": "2026-03-02T08:00:00Z",
        "created_at": "2026-01-15T10:00:00Z"
      }
    ],
    "meta": { "total": 5, "current_page": 1 }
  }
}
```

#### POST — Create Scheduled Report

```
POST /v1/analytics/reports/scheduled
```

**Payload:**
```json
{
  "name": "Weekly Fuel Report",
  "report_type": "fuel_analysis",
  "filter": "7d",
  "format": "pdf",
  "frequency": "weekly",
  "day_of_week": 1,
  "recipients": ["admin@company.com", "finance@company.com"]
}
```

**Valid `report_type` values:**

| Value | Description |
|-------|-------------|
| `fleet.utilization-summary` | Fleet utilization summary |
| `fleet.vehicle-list` | Vehicle utilization list |
| `fleet.availability-snapshot` | Availability snapshot |
| `fleet.top-vehicles` | Top performing vehicles |
| `fleet.asset-performance` | Asset performance summary |
| `drivers.trip-summary` | Driver trip summary |
| `drivers.top-by-trips` | Top drivers by trips |
| `drivers.compliance` | Driver compliance report |
| `drivers.incident-history` | Driver incident history |
| `fuel.consumption-report` | Fuel consumption |
| `fuel.cost-report` | Fuel cost analysis |
| `fuel.efficiency-report` | Fuel efficiency |
| `fuel.anomaly-report` | Fuel anomalies |
| `maintenance.schedule-compliance` | Schedule compliance |
| `maintenance.cost-report` | Maintenance cost |
| `maintenance.workflow-report` | Workflow throughput |
| `maintenance.workshop-summary` | Workshop performance |
| `incidents.summary` | Incident summary |
| `incidents.type-distribution` | Incident types |
| `incidents.by-vehicle` | Incidents per vehicle |

**Valid `filter` values:** `7d`, `30d`, `90d`, `1y`

**Valid `frequency` values:** `daily`, `weekly`, `monthly`

- `day_of_week` — Required when `frequency: weekly`. 1=Monday, 7=Sunday
- `day_of_month` — Required when `frequency: monthly`. 1–28

#### PUT — Update Scheduled Report

```
PUT /v1/analytics/reports/scheduled/{report_id}
```

Partial update supported — pass only fields to change (e.g., `is_active: false` to pause).

#### DELETE — Delete Scheduled Report

```
DELETE /v1/analytics/reports/scheduled/{report_id}
```

**Response:** `204 No Content`

---

## 3.8 Custom Reports

### Page: Custom Reports (`/reports/custom`)

**Purpose:** Create and save custom report templates with specific metrics and delivery settings.

**UI Improvements:**
- Split view: left=recommendations, right=my reports
- Recommendation cards with "Create from template" CTA
- Pre-fill form when creating from a recommendation
- Report card shows `is_created` badge if already configured

#### GET — Recommended Reports

```
GET /v1/reports/recommended
```

**Response:**
```json
{
  "data": {
    "recommendations": [
      {
        "id": "fuel_analysis",
        "name": "Weekly Fuel Analysis",
        "type": "fuel_analysis",
        "description": "Comprehensive fuel consumption and cost analysis across all vehicles",
        "use_case": "Monitor fuel spending, identify efficiency trends, detect fuel misuse",
        "frequency": "weekly",
        "format": "pdf",
        "priority": "high",
        "is_created": false
      },
      {
        "id": "driver_performance",
        "name": "Driver Performance Digest",
        "type": "driver_performance",
        "description": "Daily summary of driver behavior, safety incidents, and compliance",
        "frequency": "daily",
        "format": "pdf",
        "priority": "high",
        "is_created": true
      }
    ],
    "total": 5
  }
}
```

#### GET — List Custom Reports

```
GET /v1/reports/custom
```

**Query Parameters:**
| Param | Description | Example |
|-------|-------------|---------|
| `report_type` | Filter by type | `fuel_analysis` |
| `is_active` | Filter by active status | `true` |
| `per_page` | Items per page | `10` |

#### POST — Create Custom Report

```
POST /v1/reports/custom
```

**Payload:**
```json
{
  "name": "Monthly Maintenance Cost Report",
  "report_type": "maintenance.cost-report",
  "filter": "30d",
  "format": "csv",
  "frequency": "monthly",
  "day_of_month": 1,
  "recipients": ["cfo@company.com"],
  "is_active": true
}
```

**Valid `report_type` values:** Same list as scheduled reports above.

#### GET — Get Custom Report

```
GET /v1/reports/custom/{report_id}
```

#### PUT — Update Custom Report

```
PUT /v1/reports/custom/{report_id}
```

Partial update supported.

#### DELETE — Delete Custom Report

```
DELETE /v1/reports/custom/{report_id}
```

**Response:** `204 No Content`

---

## 3.9 Report Export

### Component: Export Button

Add an "Export" button to every analytics page and report detail. On click, open a modal to choose format (PDF/CSV) then trigger download.

#### GET — Export Report

```
GET /v1/analytics/reports/export
```

**Query Parameters:**
| Param | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `report_type` | string | ✅ | Report type identifier | `fuel.cost-report` |
| `format` | string | ❌ | `pdf` or `csv` (default: `csv`) | `pdf` |
| `filter` | string | ❌ | Date range | `30d` |
| `limit` | int | ❌ | Max records (max 500) | `100` |

**Example Requests:**

```bash
# Export fuel cost report as PDF for last 30 days
GET /v1/analytics/reports/export?report_type=fuel.cost-report&format=pdf&filter=30d

# Export incident summary as CSV
GET /v1/analytics/reports/export?report_type=incidents.summary&format=csv&filter=90d

# Export fleet utilization summary as CSV
GET /v1/analytics/reports/export?report_type=fleet.utilization-summary&format=csv
```

**Response:** The endpoint streams the file directly. Use the following on the frontend:

```javascript
// JavaScript download handler
async function exportReport(reportType, format = 'csv', filter = '30d') {
  const params = new URLSearchParams({ report_type: reportType, format, filter });

  const response = await fetch(`/api/v1/analytics/reports/export?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Request-Type': 'client'
    }
  });

  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${reportType}-${filter}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

---

# Appendix A — Common API Conventions

## Authentication Headers (Required on all requests)

```
Authorization: Bearer {access_token}
X-Request-Type: client
Content-Type: application/json
```

## Pagination Object

All paginated responses return:

```json
{
  "pagination": {
    "current_page": 1,
    "per_page": 15,
    "total": 100,
    "last_page": 7
  }
}
```

## Error Response Format

```json
{
  "message": "Validation error",
  "errors": [
    {
      "status": "422",
      "code": "validation_error",
      "title": "Validation Error",
      "detail": "The vehicle_id field is required.",
      "source": { "pointer": "/data/attributes/vehicle_id" }
    }
  ]
}
```

## Monetary Values

All monetary amounts are stored and returned in **kobo** (NGN). Divide by 100 to display in naira.

```javascript
// Display amount
const displayAmount = (kobo) => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
```

## Date Format

All timestamps are ISO 8601 UTC: `"2026-03-09T10:30:00Z"`

Use `dayjs` or `date-fns` to parse and format for display.

---

# Appendix B — Role-Based UI Visibility

| Feature | Administrator | Fleet Manager | Dispatcher | Mechanic | Finance | Driver | Vendor |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Create maintenance schedule | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Acknowledge/Snooze alerts | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create work order from alert | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create repair request (job) | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Approve / Reject repair job | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign job to workshop | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Verify completed job | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Report incident | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Investigate incident | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dismiss incident | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Escalate incident | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create/manage scheduled reports | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Export reports | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

---

# Appendix C — Key State Enumerations

## Maintenance Schedule Status
`pending` · `active` · `overdue` · `completed` · `cancelled`

## Maintenance Alert Status
`triggered` · `acknowledged` · `snoozed` · `overdue` · `work_order_created` · `closed`

## Maintenance Job Status
`draft` · `submitted` · `approved` · `rejected` · `in_progress` · `pending_verification` · `verified` · `closed`

## Maintenance Log Status
`pending` · `in_progress` · `completed` · `cancelled`

## Incident Status
`reported` · `under_investigation` · `action_required` · `action_taken` · `pending_resolution` · `resolved` · `closed` · `cancelled` · `dismissed` · `escalated`

## Incident Types
`accident` · `breakdown` · `theft` · `traffic_violation` · `cargo_damage`

## Incident Priority
`low` · `medium` · `high` · `critical`

## Report Frequencies
`daily` · `weekly` · `monthly`

## Report Formats
`pdf` · `csv`

## Analytics Date Filters
`7d` · `30d` · `90d` · `1y`

---

*Document maintained by Engineering. Update when backend API contracts change.*
