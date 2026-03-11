## Context

You are building a settings UI for EonsFleet — a fleet management platform built with Laravel 10 (backend API) and Next.js (frontend). The backend uses REST JSON APIs with the custom envelope format:

{
  "message": "...",
  "data": { ... },
  "status": 200
}

Authentication: Bearer token in Authorization header + X-Request-Type: client header on every request.

---

## What you are building

A **Workflow Approval Settings** page, specifically for the **Maintenance Repair** workflow. This page lets an organisation administrator or fleet manager configure:

1. **Finance cost threshold** — the naira amount above which a repair request is automatically routed to finance for approval instead of going directly to approved.

2. In the future this same page will host other workflow config (incident escalation, etc.) — build it to be extensible.

---

## Backend — what needs to be built first (API endpoints)

There is a `workflow_approval_configs` table with these columns:

| Column | Type | Notes |
|---|---|---|
| id | bigint | |
| organization_id | bigint | scoped to org |
| workflow_type | string | e.g. `maintenance_repair` |
| from_status | string | e.g. `pending_approval` |
| to_status | string | e.g. `pending_finance_approval` |
| required_role | string nullable | role that must approve |
| minimum_approvals | integer | how many approvals needed |
| cost_threshold | float nullable | naira amount |
| escalation_hours | integer nullable | |
| snooze_limit_days | integer nullable | |

The `WorkflowApprovalConfig` model already exists. You need to create:

### `GET /v1/workflow-settings/maintenance`
Returns the current approval config for `workflow_type = maintenance_repair` for the org.

Response:
```json
{
  "data": {
    "settings": {
      "finance_threshold_enabled": true,
      "cost_threshold": 100000,
      "minimum_approvals": 1,
      "required_role": "finance"
    }
  }
}