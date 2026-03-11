# EonsFleet — Maintenance System

> Last updated: 2026-03-11

---

## Overview

The maintenance system has three parallel tracks:

| Track | Models | Trigger | Status |
|---|---|---|---|
| 1 — Legacy Scheduling | `MaintenanceSchedule` + `MaintenanceLog` | Manual | Active (being superseded) |
| 2 — Repair Requests | `MaintenanceJob` | Manual | Active (new) |
| 3 — Threshold Alerts | `MaintenanceAlert` | Automatic (cron) | Active (new) |

All routes require:
- `authenticate.client.or.api.key`
- `identify.tenant`
- `org.subscription:maintenance`

---

## Track 1 — Legacy Scheduling (MaintenanceSchedule + MaintenanceLog)

### What it is

A fleet manager creates a `MaintenanceSchedule` for a vehicle. For recurring schedules the system auto-generates child occurrences. Each occurrence has a corresponding `MaintenanceLog` which is the actual job record that gets assigned, worked on, and completed.

### Create Schedule

```
POST /maintenances
```

**Payload:**

```json
{
  "vehicle_id": 12,
  "service_type": "preventive",
  "schedule_type": "time",
  "checklists": [1, 3, 7],

  "schedule_date": "2026-04-01",
  "is_recurring": true,
  "interval_value": 3,
  "interval_unit": "months",
  "end_date": "2027-12-31",
  "occurrences": 6,

  "vendor_id": 2,
  "technician_id": 5,
  "description": "Full quarterly service",
  "service_duration": 120,
  "priority": "high",
  "turn_on_notification": true,
  "note": "Check brake pads too"
}
```

**Field reference:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `vehicle_id` | integer | yes | Must exist in vehicles table |
| `service_type` | enum | yes | `preventive` \| `predictive` \| `corrective` |
| `schedule_type` | enum | yes | `time` \| `mileage` |
| `checklists` | integer[] | yes | Array of checklist IDs — supports multiple |
| `schedule_date` | date | if time-based | First due date |
| `is_recurring` | boolean | no | Defaults false |
| `interval_value` | integer | if recurring | e.g. `3` |
| `interval_unit` | string | if recurring (time) | `months` \| `weeks` \| `days` |
| `end_date` | date | no | Stop generating occurrences after this |
| `occurrences` | integer | no | Max number of recurrences |
| `vendor_id` | integer | no | Pre-assign to vendor |
| `technician_id` | integer | no | Pre-assign to user/technician |
| `description` | string | no | |
| `service_duration` | integer | no | Minutes |
| `priority` | string | no | `low` \| `medium` \| `high` \| `critical` |
| `turn_on_notification` | boolean | no | |
| `note` | string | no | |

> **Multiple checklists:** `"checklists": [1, 3, 7]` attaches all IDs via pivot table `maintenance_schedule_checklists`. Each starts with `status = pending`. On update, the full set is replaced via `sync()`. Child occurrences inherit the same checklists automatically.

### When Does a Schedule Become a Job?

**It is manual — there is no auto-conversion.**

```
MaintenanceSchedule created
       │
       ├── time-based + recurring:
       │     schedulePeriodicMaintenance() runs immediately
       │     → child MaintenanceSchedule (occurrence #1) created
       │     → pending MaintenanceLog created for that child
       │
       └── mileage-based:
             expected_odometer set from GPS odometer
             → child schedule + pending MaintenanceLog created

Fleet manager manually calls:
  POST /maintenances/{schedule}/assign  { vendor_id, priority }
       │
       └── If log exists → updates vendor_id
           If no log exists → creates MaintenanceLog (status: pending)

Then manually progresses:
  POST   /maintenances/{log}/assign    → assigned
  POST   /maintenances/{log}/start     → in_progress
  PATCH  /maintenances/{log}/progress  → updates progress_percent
  POST   /maintenances/{log}/parts     → add parts/labour line items
  POST   /maintenances/{log}/complete  → completed
  POST   /maintenances/{log}/verify    → verified
```

The `ScheduleRecurringMaintenance` artisan command runs **daily** to generate the next occurrence in a recurring series.

### Log States

```
pending → assigned → in_progress → completed → verified
                                             ↘ cancelled
```

### All Endpoints

```
GET    /maintenances                          index — list schedules
POST   /maintenances                          store — create schedule
GET    /maintenances/{id}                     show
PATCH  /maintenances/{id}                     update
DELETE /maintenances/{id}                     destroy

POST   /maintenances/{schedule}/assign        assign vendor to schedule
POST   /maintenances/{log}/assign             assign job to technician
POST   /maintenances/{log}/start              start job
POST   /maintenances/{log}/complete           complete job
POST   /maintenances/{log}/verify             verify job
POST   /maintenances/{log}/cancel             cancel job
PATCH  /maintenances/{log}/progress           update progress %
POST   /maintenances/{log}/parts              add part/labour line item
GET    /maintenances/{log}/parts              list parts
DELETE /maintenances/{log}/parts/{part}       remove part
POST   /maintenances/{log}/attachments        upload invoice/photo

GET    /maintenances/logs                     all logs (org-scoped)
GET    /maintenances/{schedule}/logs          logs for a schedule
GET    /maintenances/{schedule}/logs/{log}    single log
GET    /maintenances/logs/assigned            my assigned logs

GET    /maintenances/checklists               available checklists
POST   /maintenances/checklists               create checklist
GET    /maintenances/{schedule}/checklists    checklists for schedule
GET    /maintenances/org/checklists           org-wide checklist view

GET    /maintenances/metrics                  summary counts
GET    /maintenances/stats                    monthly stats
```

### Schedule Preview Response

```json
{
  "id": "14",
  "attributes": {
    "service_type": "preventive",
    "schedule_type": "time",
    "status": "upcoming",
    "is_recurring": true,
    "interval_value": 3,
    "interval_unit": "months",
    "schedule_date": "2026-04-01",
    "due_date": "2026-04-01",
    "next_due_date": "2026-07-01",
    "expected_odometer": null,
    "description": "Full quarterly service",
    "priority": "high",
    "service_duration": 120,
    "turn_on_notification": true,
    "occurrence_number": 1,
    "occurrences": 6,
    "created_at": "2026-03-11T00:00:00Z"
  },
  "relationships": {
    "vehicle": {
      "id": 12,
      "make": "Toyota",
      "model": "Hilux",
      "registration_number": "LAG-123-XY",
      "current_odometer": 45200,
      "image": "..."
    },
    "vendor": { "id": 2, "name": "AutoFix Ltd", "phone": "..." },
    "checklists": [
      { "id": 1, "name": "Oil & Filter Check", "status": "pending" },
      { "id": 3, "name": "Brake Inspection", "status": "pending" }
    ],
    "latest_log": {
      "id": 9,
      "ticket_id": "mse-042871",
      "status": "in_progress",
      "progress_percent": 60,
      "due_date": "2026-04-01",
      "assigned_vendor": "AutoFix Ltd"
    }
  }
}
```

### Parts / Labour Line Items

```
POST /maintenances/{log}/parts
```

```json
{
  "description": "Synthetic 5W-40 Oil",
  "category": "part",
  "quantity": 4,
  "unit_price_kobo": 250000,
  "notes": "4 litres required"
}
```

| Field | Type | Values |
|---|---|---|
| `category` | enum | `part` \| `labor` \| `diagnostic` \| `other` |
| `unit_price_kobo` | integer | stored in kobo (÷100 = naira) |
| `quantity` | decimal | supports 0.5, 1.5 etc. |

---

## Track 2 — Repair Requests (MaintenanceJob)

### What it is

A user (driver, dispatcher, fleet manager) raises a repair request. It flows through a full approval and vendor assignment workflow engine before work begins.

### State Machine

```
draft
  └── submitted                    (auto on create)
        ├── pending_approval
        │     ├── approved
        │     │     └── assigned   (vendor set here)
        │     │           └── in_progress
        │     │                 └── pending_verification
        │     │                       ├── verified
        │     │                       │     └── closed
        │     │                       └── reopened → in_progress
        │     └── rejected          (terminal)
        └── pending_admin_approval
              └── (same as above)
```

Every transition:
- Writes an immutable `WorkflowHistory` record (actor, from/to, reason, timestamp)
- Auto-posts a system message to the conversation thread
- Fires `WorkflowTransitioned` event
- Sends email notification (non-blocking)

### Create Job

```
POST /maintenance/jobs
```

**Payload:**

```json
{
  "vehicle_id": 12,
  "title": "Engine knocking noise",
  "description": "Intermittent knocking at idle, started 3 days ago",
  "fault_category": "engine",
  "cost_estimate_kobo": 5000000,
  "driver_id": 8,
  "vendor_id": 2
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `vehicle_id` | integer | yes | |
| `title` | string | yes | Short description |
| `description` | string | yes | Full details |
| `fault_category` | string | yes | e.g. `engine`, `tyres`, `brakes` |
| `cost_estimate_kobo` | integer | no | Estimate in kobo (÷100 = naira) |
| `driver_id` | integer | no | Driver raising the request |
| `vendor_id` | integer | no | Pre-assign vendor |

**On create:**
- Reference generated: `MJ-2026-0042`
- Status set to `draft`
- Immediately auto-transitioned to `submitted`
- Conversation thread created

### Transition Job

```
PATCH /maintenance/jobs/{job}/transition
```

```json
{
  "to_status": "in_progress",
  "reason": "Parts arrived, starting work"
}
```

`reason` is required for: `rejected`, `cancelled`, `reopened`

### Approve Job

```
POST /maintenance/jobs/{job}/approve
```

```json
{
  "decision": "approved",
  "reason": "Approved for immediate repair"
}
```

### Assign to Vendor

```
POST /maintenance/jobs/{job}/assign
```

```json
{
  "vendor_id": 3
}
```

Transitions job to `assigned`.

### Cost Summary

```
GET /maintenance/jobs/{job}/cost-summary
```

```json
{
  "cost_estimate": 50000.00,
  "actual_cost": 47500.00,
  "variance": -2500.00,
  "currency": "NGN"
}
```

All values in naira. Stored internally as kobo (`cost_estimate_kobo`, `actual_cost_kobo`).

### All Endpoints

```
GET    /maintenance/jobs                        list jobs
POST   /maintenance/jobs                        create job
GET    /maintenance/jobs/{job}                  show job
PATCH  /maintenance/jobs/{job}/transition       transition state
POST   /maintenance/jobs/{job}/approve          approve/reject
POST   /maintenance/jobs/{job}/assign           assign to vendor
POST   /maintenance/jobs/{job}/verify           verify completed work
POST   /maintenance/jobs/{job}/review           submit vendor rating
GET    /maintenance/jobs/{job}/cost-summary     cost breakdown
GET    /maintenance/jobs/{job}/history          full audit trail
GET    /maintenance/jobs/{job}/conversation     conversation thread
POST   /maintenance/jobs/{job}/messages         post message
```

### Job Preview Response

```json
{
  "id": "42",
  "attributes": {
    "reference": "MJ-2026-0042",
    "title": "Engine knocking noise",
    "description": "Intermittent knocking at idle",
    "fault_category": "engine",
    "status": "in_progress",
    "cost_estimate_kobo": 5000000,
    "actual_cost_kobo": null,
    "started_at": "2026-03-11T08:00:00Z",
    "completed_at": null,
    "created_at": "2026-03-10T14:22:00Z"
  },
  "relationships": {
    "vehicle": { "id": 12, "registration_number": "LAG-123-XY", "model": "Hilux" },
    "vendor": { "id": 2, "name": "AutoFix Ltd" },
    "driver": { "id": 8, "name": "John Doe" },
    "maintenance_alert": { "id": 5 }
  }
}
```

---

## Track 3 — Threshold Alerts (MaintenanceAlert)

### What it is

Fully automated. The system watches every vehicle's mileage and schedule due dates hourly. When a threshold is breached it creates a `MaintenanceAlert`. A fleet manager then acknowledges and optionally converts it into a Track 2 repair job.

### State Machine

```
triggered
  ├── acknowledged                (manual)
  │     ├── snoozed               (manual, with reason + days)
  │     │     └── triggered       (auto when snooze_expires_at passes)
  │     └── work_order_created    (manual, creates a MaintenanceJob)
  │           └── closed
  └── overdue                     (auto after 48h unacknowledged)
        └── acknowledged
```

### Automatic Triggers (Cron)

**EvaluateMaintenanceThresholdsJob — runs hourly:**

For every active `MaintenanceSchedule`:
- **Mileage:** vehicle `current_mileage` within 200 km of `expected_odometer` → `approaching`; past it → `due`
- **Time:** `days_until_due <= 14` → `approaching`; past `due_date` → `due`
- If threshold hit and no active alert exists → creates `MaintenanceAlert` (status: `triggered`)

**EscalateMaintenanceAlertsJob — runs every 4 hours:**
- Alerts still `triggered` after **48 hours** → auto-transitioned to `overdue`
- Alerts in `snoozed` with `snooze_expires_at` past → re-transitioned to `triggered`

### Alert Fields

| Field | Type | Notes |
|---|---|---|
| `alert_type` | enum | `approaching` \| `due` |
| `threshold_type` | enum | `mileage` \| `time` \| `both` |
| `status` | string | See state machine above |
| `snooze_count` | integer | Increments on each snooze |
| `snooze_expires_at` | datetime | Set when snoozed |
| `triggered_at` | datetime | When alert was first created |
| `acknowledged_at` | datetime | When acknowledged |
| `maintenance_job_id` | integer | Set when work order created |

### Acknowledge Alert

```
PATCH /maintenance/alerts/{alert}/acknowledge
```

No body required.

### Snooze Alert

```
PATCH /maintenance/alerts/{alert}/snooze
```

```json
{
  "snooze_days": 7,
  "reason": "Vehicle booked for next maintenance window"
}
```

### Create Work Order from Alert

```
POST /maintenance/alerts/{alert}/work-order
```

```json
{
  "title": "Oil change — threshold reached",
  "description": "Auto-generated from mileage alert",
  "fault_category": "engine",
  "cost_estimate_kobo": 3500000
}
```

**What happens:**
1. Validates alert is `acknowledged`
2. Creates `MaintenanceJob` directly at `approved` status (skips draft/submit/approval flow)
3. Sets `alert.maintenance_job_id`
4. Transitions alert to `work_order_created`

The resulting job then follows the standard Track 2 flow from `approved` onwards.

### All Endpoints

```
GET    /maintenance/alerts                         list alerts
GET    /maintenance/alerts/{alert}                 show alert
PATCH  /maintenance/alerts/{alert}/acknowledge     acknowledge
PATCH  /maintenance/alerts/{alert}/snooze          snooze
POST   /maintenance/alerts/{alert}/work-order      create job from alert
GET    /maintenance/alerts/{alert}/history         audit trail
GET    /maintenance/alerts/{alert}/conversation    conversation thread
POST   /maintenance/alerts/{alert}/messages        post message
```

### Alert Preview Response

```json
{
  "id": "5",
  "attributes": {
    "alert_type": "approaching",
    "threshold_type": "mileage",
    "status": "acknowledged",
    "snooze_count": 0,
    "snooze_expires_at": null,
    "triggered_at": "2026-03-10T06:00:00Z",
    "acknowledged_at": "2026-03-11T09:00:00Z",
    "created_at": "2026-03-10T06:00:00Z"
  },
  "relationships": {
    "vehicle": { "id": 12, "registration_number": "LAG-123-XY" },
    "schedule": { "id": 14, "service_type": "preventive", "expected_odometer": 50000 },
    "maintenance_job": null
  }
}
```

---

## Shared — Workflow Engine

All transitions in Track 2 and Track 3 go through `WorkflowService::transition()`:

1. Validates transition is in the allowed map
2. Checks if `reason` is required (`rejected`, `cancelled`, `reopened`, `escalated`, `snoozed`, `dismissed`)
3. Checks approval requirements if configured
4. DB transaction:
   - Updates model `status`
   - Writes immutable `WorkflowHistory`
   - Posts system message to conversation thread
5. Outside transaction: fires `WorkflowTransitioned` event + sends email

**Conversation threads** are polymorphic — every workflow model (job, alert, log) gets its own thread. System messages are auto-posted on every transition. Users can post internal or external messages.

---

## Shared — Cost Tracking

| Field | Model | Unit | Notes |
|---|---|---|---|
| `cost_estimate_kobo` | MaintenanceJob | kobo | ÷100 = naira |
| `actual_cost_kobo` | MaintenanceJob | kobo | Set on completion |
| `unit_price_kobo` | MaintenanceJobPart | kobo | Per line item |
| `cost` | MaintenanceLog | naira decimal | Legacy track only |
| `actual_cost` | MaintenanceLog | naira decimal | Legacy track only |

---

## Role Access Summary

| Action | Roles |
|---|---|
| Create schedule / job | `fleet_manager`, `dispatcher` |
| Approve job | `fleet_manager`, `administrator` |
| Assign to vendor | `fleet_manager`, `dispatcher` |
| Acknowledge / snooze alert | `fleet_manager` |
| Create work order from alert | `fleet_manager`, `dispatcher` |
| Update progress / add parts | `mechanic` |
| Verify completed job | `fleet_manager` |
| View costs / reports | `finance` |
| Post conversation messages | Any authenticated user |
