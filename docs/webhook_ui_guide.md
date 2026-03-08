# Webhook Management: UI Implementation Guide

This guide outlines how to build a premium, developer-friendly Webhook management interface.

## 1. The Workflow
The UI should consist of three main views:
1.  **Endpoints List**: Overview of registered URLs and their statuses.
2.  **Registration/Edit Modal**: Form to add or update endpoints.
3.  **Delivery History (Drawer/Modal)**: Timeline of sent webhooks and their results.

---

## 2. Component Breakdown

### A. Endpoints List View
**API**: `GET /api/v1/webhooks`
- **Columns**: Name/URL, Status (Active/Inactive), Subscribed Events (Count/Tags), Created At.
- **Actions**: Edit, Delete, **Test Connection** (Sends a `test.ping`).

### B. Registration / Edit Modal
**API**: `POST /api/v1/webhooks` or `PUT /api/v1/webhooks/{id}`
- **Field: URL**: Must start with `https://`.
- **Field: Description**: Optional internal label.
- **Field: Events Selection**: Multi-select or Checkbox list of available events.
    - `trip.started`, `trip.completed`, `trip.assigned`
    - `incident.created`, `incident.resolved`, `incident.closed`
    - `maintenance.assigned`, `maintenance.completed`
    - `geofence.alert`
    - `device.status_changed`
- **Field: Status**: Toggle for Active/Inactive.

> [!IMPORTANT]
> **Secret Key Handling**: When a webhook is first created (`POST`), the API returns a `secret_key`. 
> **You MUST show this to the user in a "Copy to Clipboard" modal immediately.** 
> It will NOT be returned in subsequent requests for security reasons.

### C. Delivery History
**API**: `GET /api/v1/webhooks/{id}/deliveries`
- Displays a list of sent webhooks.
- **Data Points**: Event Type, Response Code (e.g., 200, 500), timestamp, duration (ms).
- **Details View**: Show the JSON `payload` sent and the `response_body` received from the customer's server.

---

## 3. Developer Best Practices
1.  **Signing Secret**: Instruct the user to verify the `X-Eonsfleet-Signature` header.
    - Header format: `sha256=HMAC-SHA256(secret_key, timestamp + "." + body)`.
2.  **Ping Test**: Provide a "Send Test" button. This ensures the customer's server is correctly receiving and validating signatures before they go live.
3.  **Failure Indicators**: If `failure_count > 0` or `last_failure_at` is populated, show a warning badge (e.g., "Retrying" or "Endpoint unreachable").

## 4. Summary of API Actions
| Action | Method | Endpoint |
| :--- | :--- | :--- |
| List | `GET` | `/api/v1/webhooks` |
| Create | `POST` | `/api/v1/webhooks` |
| Update | `PUT` | `/api/v1/webhooks/{id}` |
| Delete | `DELETE` | `/api/v1/webhooks/{id}` |
| Test | `POST` | `/api/v1/webhooks/{id}/test` |
| History | `GET` | `/api/v1/webhooks/{id}/deliveries` |
