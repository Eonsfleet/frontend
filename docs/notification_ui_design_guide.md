    # EonsFleet Notification System: Product & UI Implementation Guide

As the Product Designer, I’m providing this step-by-step guide to help you build a premium, cohesive notification experience. Our goal is to balance user awareness with powerful administrative control.

---

## Part 1: The User Experience (Core)

### Step 1: The In-App Inbox (Header Dropdown)
**Design Goal**: Quick awareness without leaving the current page.

- **UI Element**: A bell icon in the top navbar with a red badge for unread counts.
- **Interaction**: Clicking opens a scrollable dropdown/popover showing the last 10-20 notifications.
- **Features**:
    - **Mark All as Read**: A button at the top to clear the noise.
    - **View All**: Link at the bottom to a dedicated "Notifications" page.
- **Endpoints**:
    - **List**: `GET /api/v1/notifications/user/inbox?unread_only=true`
      - **Response**:
        ```json
        {
          "message": "Success",
          "data": {
            "notifications": [
              {
                "id": "9876-5432-1098",
                "attributes": {
                  "type": "TRIP_STARTED",
                  "subject": "Trip Started",
                  "body": "Vehicle ABC-123 has started a trip.",
                  "is_read": false,
                  "read_at": null,
                  "created_at": "2026-03-08T10:00:00Z"
                }
              }
            ],
            "pagination": { "current_page": 1, "total": 45, "last_page": 3 }
          }
        }
        ```
    - **Actions**:
        - `PATCH /api/v1/notifications/user/inbox/read` (Payload: `{ "ids": [uuid] }`)
          - **Response**: `{ "message": "Marked as read", "data": { "marked_count": 1 } }`
        - `POST /api/v1/notifications/user/inbox/read-all`
          - **Response**: `{ "message": "All marked as read", "data": { "marked_count": 12 } }`

### Step 2: User Channel Preferences
**Design Goal**: Put the user in control of their "noise level."

- **Location**: Profile Settings > Notifications.
- **UI Element**: A table or list of toggles for each available channel (Email, SMS, Push, In-App).
- **Endpoints**:
    - **Fetch**: `GET /api/v1/notifications/user/channels`
      - **Response**:
        ```json
        {
          "message": "Success",
          "data": {
            "channels": {
              "email": true,
              "sms": false,
              "push": true,
              "in_app": true
            }
          }
        }
        ```
    - **Update**: `PUT /api/v1/notifications/user/channels`
      - **Payload**: `{ "channels": { "email": true, ... } }`
      - **Response**: `{ "message": "Channel preferences updated", "data": { "channels": { ... } } }`

---

## Part 2: Administrative Control (Advanced/Enterprise)

### Step 3: Notification Groups (The "Who")
**Design Goal**: Simplify routing by grouping users (e.g., "Night Shift Dispatchers").

- **Location**: Organization Settings > Notification Groups.
- **UI Flow**:
    1.  **List View**: Show group names and member counts.
    2.  **Create/Edit**: A modal with a multi-select for choosing users from the organization.
- **Endpoints**:
    - **List**: `GET /api/v1/notifications/groups`
      - **Response**:
        ```json
        {
          "message": "Success",
          "data": {
            "success": true,
            "groups": [
              { "id": 1, "name": "Fleet Managers", "members_count": 5 }
            ]
          }
        }
        ```
    - **Create**: `POST /api/v1/notifications/groups` (Payload: `{ "name": "...", "user_ids": [5, 6] }`)
      - **Response**: `{ "message": "Notification group created successfully", "data": { "group": { "id": 10, ... } } }`
    - **Update Members**: `PUT /api/v1/notifications/groups/{id}/members` (Payload: `{ "user_ids": [10, 11] }`)
      - **Response**: `{ "message": "Group members updated successfully" }`

### Step 4: Routing Rules (The "How & What")
**Design Goal**: Define which events trigger which channels for which recipients.

- **Location**: Organization Settings > Notification Rules.
- **UI Flow**:
    - A list of Notification Types (e.g., `TRIP_STARTED`, `VEHICLE_MAINTENANCE_DUE`).
    - For each type, clicking "Configure" opens a drawer/modal to set:
        - **Enabled Channels**: Select subset of Email, SMS, Push, etc.
        - **Recipients**: Select Roles (e.g., Accountant) OR specific Groups OR specific Users.
- **Endpoints**:
    - **List All Notification Types**: `GET /api/v1/notifications/types?configurable=true`
      - **Response**:
        ```json
        {
          "message": "Notification types fetched successfully",
          "data": [
            { "id": 1, "code": "TRIP_STARTED", "name": "Trip Started" }
          ]
        }
        ```
    - **List Rules**: `GET /api/v1/notifications/config/rules` (Returns active rules per type).
      - **Response**:
        ```json
        {
          "message": "Success",
          "data": {
            "success": true,
            "rules": [
              { "notification_type_id": 1, "enabled_channels": ["in_app", "email"] }
            ]
          }
        }
        ```
    - **Configure Rule**: `POST /api/v1/notifications/config/rules`
      - **Payload**:
        ```json
        {
          "notification_type_id": 1,
          "is_enabled": true,
          "recipient_roles": ["administrator"],
          "enabled_channels": ["in_app"]
        }
        ```
      - **Response**: `{ "message": "Notification rule configured successfully", "data": { "rule": { ... } } }`

### Step 5: Delegations (Temporary Shifts)
**Design Goal**: Ensure no alert is missed when someone is on leave.

- **Location**: Organization Settings > Delegations.
- **UI Flow**:
    - A timeline or list of active/scheduled delegations.
    - **Create**: Select "Original User", "Delegate User", "Start Date", "End Date", and optionally specific "Notification Types".
- **Endpoints**:
    - **List**: `GET /api/v1/notifications/delegations`
      - **Response**:
        ```json
        {
          "message": "Success",
          "data": {
            "success": true,
            "delegations": [
              { "id": 1, "reason": "Annual Leave", "start_date": "2026-03-10" }
            ]
          }
        }
        ```
    - **Create**: `POST /api/v1/notifications/delegations`
      - **Payload**: `{ "initial_user_id": 5, ... }`
      - **Response**: `{ "message": "Delegation created successfully", "data": { "delegation": { "id": 5, ... } } }`
    - **End**: `DELETE /api/v1/notifications/delegations/{delegationId}`
      - **Response**: 204 No Content (Empty response)

---

## Part 3: Design Reference (Slugs & Codes)

### Core Notification Types (`notification_type_id`)
You'll need these to build the Routing configuration UI.
| Code | Category | Default Channels |
| :--- | :--- | :--- |
| `TRIP_STARTED` | Fleet | In-App, Push |
| `TRIP_COMPLETED` | Fleet | In-App, Push |
| `GEOFENCE_BREACH` | Fleet | SMS, In-App, Push |
| `VEHICLE_MAINTENANCE_DUE` | Fleet | Email, In-App |
| `PAYMENT_FAILED` | Billing | Email, SMS, In-App |
| `DRIVER_BEHAVIOR_ALERT` | Fleet | Email, In-App |

### Implementation Pro-Tips:
1.  **FCM Multi-Token**: When registering for Push (`POST /api/v1/drivers/me/fcm-tokens`), ensure the frontend handles token refresh logic so the user doesn't stop receiving alerts.
2.  **Webhooks as a channel**: Note that `webhook` is a valid channel in `enabled_channels`. This is for Enterprise users who want to pipe alerts into their own internal systems.
3.  **Real-time**: Use the In-app inbox endpoint with a short poll or WebSocket (if enabled) to keep the bell icon badge fresh.
