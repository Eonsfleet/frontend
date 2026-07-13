# Alerts Module Frontend Implementation Prompt

## Objective

Implement the complete Alerts module using the approved UI/UX designs.
The experience should feel consistent with the Dashboard, Live Tracking,
Trips, and Playback modules.

## Pages

-   Alerts (Active)
-   Acknowledged
-   Resolved
-   Alert Configuration

## Layout

-   Persistent left navigation.
-   Page header with search, date range, filters, export, and
    **Configure Alerts**.
-   KPI cards at the top.
-   Main content in the center.
-   Context-sensitive right-side drawer.

## Right-side Drawer Rules

Use a drawer (not navigation) whenever a user selects an alert from
Active, Acknowledged, or Resolved.

The drawer should: - Slide in from the right. - Keep the alert list
visible. - Be closable. - Update immediately when another alert is
selected. - Never reload the page.

### Active Drawer

Show: - Vehicle card - Alert summary - Metrics - Mini map - Alert
timeline - Actions: - Acknowledge - Resolve - Live Tracking - Playback -
Route History - Send Command - More (dropdown)

### Acknowledged Drawer

Show: - Everything from Active - Acknowledgement section: - Acknowledged
by - Role - Time - Optional note (editable) - Actions: - Mark as
Resolved - Reopen Alert

### Resolved Drawer

Show: - Resolution Summary - Resolution timeline - Resolution notes -
Related alerts - Before vs After comparison - Mini map - Actions: - View
in Playback - View Route History - View on Live Tracking - Download
Report - Export PDF - Attach Evidence - Reopen Alert

## Configure Alerts

Selecting **Configure Alerts** opens a dedicated page (not a drawer).

Tabs: - Alert Rules - Notification Settings - Escalation Rules - Quiet
Hours - Users & Roles

Three-column layout: 1. Categories 2. Alert rules table 3. Rule editor

Rule editor supports: - Enable/disable - Name - Category - Severity -
Conditions - Thresholds - Applies to - Notification channels -
Escalation - Save - Delete

## More Menus

Use dropdown menus for row actions.

Alert row menu: - View Details - Acknowledge (Active only) - Resolve -
Playback - Route History - Live Tracking - Download Report - Reopen
(Resolved only) - Delete (if permitted)

## Filtering

Primary filters: - Date range - Severity - Vehicle - Driver - Status

Advanced filter drawer: - Alert type - Vehicle group - Geofence -
Priority - Assigned user - Acknowledged by - Resolution type -
Notification channel

Display active filters as removable chips.

## Tables

Support: - Sorting - Search - Pagination - Multi-select - Bulk actions

Bulk actions depend on tab: - Active: Acknowledge, Export -
Acknowledged: Resolve - Resolved: Export, Download

## Loading

Use skeleton loaders for: - KPI cards - Alert rows - Drawer - Charts -
Maps

## Empty States

Provide dedicated empty states for each tab.

## Error Handling

Inline retry for failed sections. Never block the entire page because
one request fails.

## Accessibility

Keyboard navigation, ARIA labels, focus states, and screen-reader
support.

## Performance

-   Lazy load maps.
-   Virtualize long tables.
-   Debounce search.
-   Cancel stale requests.
-   Load drawer data independently.

## Acceptance Criteria

The module should behave like an enterprise operations center: - Lists
remain visible while details open in drawers. - Navigation is only used
for Alert Configuration. - Drawers preserve context. - All transitions
are smooth and consistent with the application's design language.
