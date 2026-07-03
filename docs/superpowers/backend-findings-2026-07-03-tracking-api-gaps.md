# Backend Findings — Live Tracking API Gaps & Bugs

**Date:** 2026-07-03
**Audience:** Backend team
**Source:** Code audit of `/var/www/eonsfleet/backend` while wiring the Live
Tracking asset panel's Device/Trip/Driver tabs and IoT packet stream on the
frontend. All findings below are cited against the actual backend source —
nothing here is speculative.

## 1. Bug — `GET /trips` silently ignores `vehicle_id`

**Route:** `GET /trips` (`routes/api/v1/trips.php:9`) → `TripController::index`
(`app/Http/Controllers/Api/v1/TripController.php:128-138`). The controller's own
docblock (lines 86-88) documents `status`, `driver_id`, and `vehicle_id` as
supported query params.

**Bug:** `TripService::getTrips()` (`app/Services/TripService.php:37-60`) only
builds `$filter` from `status` (and `sortBy`/`orderBy`) — `vehicle_id` and
`driver_id` are read from the request in the docblock's promise but never
actually placed into `$filter`, so they're silently dropped:

```php
$filter = ['status' => $request->get('status'), 'sortBy' => ..., 'orderBy' => ...];
// vehicle_id / driver_id never added here
```

The underlying repository already supports arbitrary column filters —
`TripRepository::paginateTripManagementList()` (`app/Repositories/TripRepository.php:17-48`)
calls `$query->filter($filter)`, and `HasFilters::scopeFilter`
(`app/Trait/Scope/HasFilters.php:12-70`) applies any extra key as a generic
`where($key, $value)`. So threading `vehicle_id`/`driver_id` from the request
into `$filter` in `TripService::getTrips()` should be a small, low-risk fix.

**Impact:** `GET /trips?status=ongoing&vehicle_id=X` returns *all* ongoing
trips org-wide, not just vehicle X's. Any consumer (including our frontend's
"get the active trip for this vehicle" call) that takes the first result off
that list can silently show the wrong vehicle's trip in an org with more than
one ongoing trip at a time.

**Suggested fix:** add `vehicle_id` / `driver_id` to the `$filter` array in
`TripService::getTrips()` when present on the request.

## 2. Schema gap — device hardware fields don't exist

We need a Device tab showing firmware version, SIM/ICCID, network/carrier, and
signal strength for a vehicle's tracker. None of these exist anywhere in the
schema:

- `devices` table (`database/migrations/2025_03_20_120554_create_devices_table.php`)
  only has `organization_id, hardware_id, imei, phone_number, country, status, is_online`.
- `Device` model `$fillable` (`app/Models/Device.php:22-31`) adds only
  `last_packet_received_at`, `has_fuel`.
- `Hardware` model `$fillable` (`app/Models/Hardware.php:12`) is
  `['name', 'status', 'description', 'apn_id', 'slug']` — a device-*type*
  catalog entry (e.g. "Teltonika FMB140"), not a per-unit firmware version.

This isn't a wrong-endpoint problem — `GET /devices/{device}`
(`DeviceController::show`, `app/Http/Controllers/Api/v1/Backoffice/DeviceController.php:91-100`
→ `DeviceResource`, `app/Http/Resources/DeviceResource.php:19-45`) is the
correct endpoint for device hardware info, and we've switched the frontend to
use it (see companion frontend commit), but it structurally cannot return
firmware/network/signal because those columns don't exist.

**What we get today from `DeviceResource`:** IMEI (`attributes.device_id`),
registered phone number (`attributes.phone_number` — the closest thing to a
"SIM number," not a true ICCID), online status, and the linked hardware's
`name` (device type/model). **What's missing:** firmware version, SIM
ICCID/number, network/carrier, signal strength.

**Suggested fix:** add columns (or a related `device_diagnostics`-style table)
for firmware version and signal quality if these should ever be tracked
server-side; network/carrier may need to come from the ingest packet's
`metadata` (see §4 — `mcc`/`mnc` are already accepted on ingest but discarded).

## 3. Alarm broadcast gaps

We expected 5 real-time broadcast categories (location, status, alarm, device,
fuel). Location/status/device/fuel are solidly wired (see below), but **alarm
is the weak category**:

- Only two alarm-shaped broadcasts exist: `GeofenceAlertEvent`
  (`app/Events/GeofenceAlertEvent.php:19-67`, `.geofence.monitor`) and
  `SpeedingViolationBroadcast` (`app/Events/SpeedingViolationBroadcast.php:19-54`,
  `alert.speeding` — see §5, undocumented).
- **Jamming, immobilizer, unplug, and door-status are never broadcast as
  discrete alarms.** They're validated on ingest
  (`app/Http/Requests/TrackingRequest.php:59-60`), and only reach the frontend
  as a passthrough inside the *Location* broadcast's `metadata` object, via
  `TelemetryFormatHelper::EXTENDED_METADATA_KEYS`
  (`app/Services/TelemetryFormatHelper.php:17-38`, consumed in
  `BroadcastLocationListener.php:49-54`) — and only if the specific
  device/firmware populates that metadata key. Teltonika devices do;
  **CNOTE devices (`CnoteTk003Processor`) never populate `metadata` at all**,
  so CNOTE-tracked vehicles broadcast none of these signals, full stop.
- **Idling detection is computed but never broadcast.** `CheckIdlingListener`
  (`app/Listeners/Telemetry/CheckIdlingListener.php:26-63`) dispatches
  `App\Jobs\CheckIdling`, whose `handle()` ends with the comment
  `// send notification for idle vehicle (implement when channel is ready)`
  (`app/Jobs/CheckIdling.php:37-46`) — no broadcast is ever fired. Idling is
  only visible to the frontend if it happens to ride along in a Location
  packet's `metadata.idling` key (same device/firmware caveat as above).
- **No panic-button field exists anywhere** in the ingest schema, processors,
  or broadcasts.

**Suggested fix:** consider a dedicated `AlarmBroadcast` event (or similar)
fired whenever jamming/immobilizer/unplug/door-status/idling actually changes
state, independent of whether that packet also happens to be a Location
update — this would also fix the CNOTE-device blind spot, since it wouldn't
depend on the raw packet's `metadata` shape.

## 4. Parsed on ingest, stored, but never broadcast to anyone

The ingest validator (`TrackingRequest::rules()`,
`app/Http/Requests/TrackingRequest.php:56-99`) accepts a wide `metadata.*`
schema. Several accepted fields are stored to Postgres but never included in
any `ShouldBroadcast` payload — not a frontend bug, the backend simply never
puts these on the wire in real time:

- `metadata.fuel_level_obd` — only read to compute the boolean `has_fuel` flag
  on `Device` (`app/Actions/Telemetry/UpdateDeviceHeartbeatAction.php:35-38`);
  the actual OBD fuel value is discarded.
- `metadata.fuel_consumed` (distinct from `fuel_consumed_counted`, which *is*
  broadcast) — only referenced later via raw JSON path in historical report
  queries (`app/Trait/Utilities/HasReportFunction.php:21,53`).
- `metadata.total_mileage` / `metadata.total_mileage_counted` (distinct from
  `total_odometer`/`trip_odometer`, which *are* broadcast) — only used in
  historical mileage reports (`app/Trait/Utilities/HasReportFunction.php:33,36,65,68`,
  `app/Trait/Utilities/MovementReportFunction.php:111-134`).
- `metadata.course_status.positioned` / `metadata.course_status.course` —
  accepted by validation, not read anywhere else in the codebase. Fully dead
  data.
- `metadata.mcc` / `metadata.mnc` / `metadata.lac` / `metadata.cell_id`
  (cell-tower positioning) — accepted by validation, not read anywhere else.
  Fully dead data; this is also the closest existing raw signal to a
  "network/carrier" field for the Device schema gap in §2, if that's ever
  prioritized.

If any of these matter to a future feature (OBD fuel accuracy, GPS-fallback
positioning, network/carrier display), the ingest side already has the data —
it just needs a broadcast (or persisted column) to surface it.

## 5. Undocumented broadcasts (FYI, not necessarily a bug)

Our frontend's internal docs describe 5 broadcast events. The actual backend
has 15 classes implementing `ShouldBroadcast`/`ShouldBroadcastNow`. These 4
are real, working broadcasts that aren't part of that documented set — worth
the backend team's awareness in case anything downstream assumes the "5
events" list is exhaustive:

- `FuelAlertBroadcast` (`app/Events/FuelAlertBroadcast.php:12-48`),
  `broadcastAs() = 'fuel_alert'` (note: underscore, unlike the dotted naming
  everywhere else) — a low-fuel-specific alert, distinct from
  `FuelEventBroadcast`'s theft/leakage/refill anomalies. Dispatched via
  `FuelAlertObserver` (`app/Observers/FuelAlertObserver.php:34`).
- `SpeedingViolationBroadcast` (`app/Events/SpeedingViolationBroadcast.php:19-54`),
  `alert.speeding` on `org.{orgId}.tracking`.
- `MaintenanceOverdueBroadcast`, `alert.maintenance_overdue` on
  `org.{orgId}.tracking`.
- `VehicleLocationUpdated` (`event: vehicle.location.updated`, channel
  `org.{orgId}.tracking`, debounced 1/sec/vehicle) — a **parallel/duplicate**
  location broadcast fired alongside `LocationUpdated`'s `.current.recent`
  from the same listener (`BroadcastLocationListener`). Worth confirming
  whether this is intentional (e.g. a different consumer subscribes to
  `org.{orgId}.tracking` for a reason) or leftover from a migration between
  two channel-naming schemes.

Also flagging: `App\Events\VehicleTracking` (also broadcasts `current.recent`
on `location.{imei}`) and its dispatcher `App\Actions\SendLocationInRealtime`
are dead code — `SendLocationInRealtime::execute()` is never called from any
live code path (confirmed via full-repo grep). Same for
`App\Listeners\Telemetry\UpdateDeviceStatusListener`, which duplicates
`UpdateDeviceStatusJob`'s logic but isn't registered in
`EventServiceProvider`. Both are candidates for removal if nobody's aware of
a reason to keep them.

## 6. Driver lookup — not a bug, just flagging a better option exists

`GET /vehicles/{vehicle_id}/current-driver`
(`VehicleController::getCurrentDriver`,
`app/Http/Controllers/Api/v1/VehicleController.php:736-747` →
`VehicleRepository::getCurrentDriver`,
`app/Repositories/VehicleRepository.php:239-246`) already does the right
thing — filters to `deassigned_date IS NULL`, i.e. a truly active assignment.

By contrast, the vehicle resource's embedded `relationships.current_driver`
comes from `Vehicle::operator` (`app/Models/Vehicle.php:110-131`), which picks
whoever has the latest `assigned_date` **without excluding deassigned
drivers** — it can return a stale/former driver. We've switched the frontend
to call the dedicated endpoint instead (see companion commit). No backend
change requested here, just flagging that `Vehicle::operator` has this
staleness footgun in case anything else in the codebase still relies on it
for "who's the current driver" logic.
