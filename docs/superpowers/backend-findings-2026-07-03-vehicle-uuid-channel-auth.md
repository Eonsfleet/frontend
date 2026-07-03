# Backend Finding — Vehicle UUID vs bigint mismatch breaks per-vehicle WS channels & sensor health

**Date:** 2026-07-03
**Audience:** Backend team
**Source:** Live reproduction while debugging why the Live Tracking asset panel's
Details tab, Device Status card, and Location & Movement card weren't syncing
with live telemetry. Confirmed against real request/response traffic in a
running dev environment (Postgres error text and stack trace quoted verbatim
below), not speculative.

## Root cause

`VehicleResource`/`VehicleCollectionResource` deliberately expose the
vehicle's UUID as the public `id` field:

```php
// app/Http/Resources/Vehicle/VehicleResource.php:28
'id' => $this->uuid,
// app/Http/Resources/Vehicle/VehicleCollectionResource.php:20
'id' => $this->uuid,
```

This is what every frontend consumer of `GET /vehicles` reads and then threads
through as "the vehicle id" everywhere else (channel subscriptions, other
REST calls). Two backend entry points never got updated for this and still
assume `id` is the bigint primary key:

**This is confirmed intentional, not accidental**, per the migration that
added the `uuid` column
(`database/migrations/2026_06_16_113019_add_uuid_to_resource_tables.php:9-12`):

> "The integer PK is kept for internal DB operations. The uuid is what
> external callers use — prevents sequential ID enumeration."

So there is no frontend-available identifier that will ever satisfy the
current gates below — not the UUID (public `id`), not `device_id`/IMEI (an
unrelated column). Only the internal bigint PK would work, and it is
deliberately never exposed to any API consumer. This can only be fixed on the
backend side.

### 1. Broadcast channel auth — `routes/channels.php:44` and `:75`

```php
Broadcast::channel('location.vehicle.{vehicleId}', function (User $user, string $vehicleId) {
    ...
    return Vehicle::withoutGlobalScopes()
        ->where('id', $vehicleId)   // <-- vehicles.id is bigint; $vehicleId is a UUID string
        ->where('organization_id', $user->organization_id)
        ->whereNull('deleted_at')
        ->exists();
}, ['guards' => ['client']]);
```

Same pattern at `fuel.vehicle.{vehicleId}` (`routes/channels.php:75`). When the
frontend authenticates either channel with the UUID it was given, Postgres
throws before the `exists()` check ever runs:

```
SQLSTATE[22P02]: Invalid text representation: 7 ERROR:  invalid input syntax
for type bigint: "a94f06a2-9645-4fab-ae4c-f45f71ffe090"
CONTEXT:  unnamed portal parameter $1 = '...' (Connection: pgsql, SQL: select
exists(select * from "vehicles" where "id" = a94f06a2-9645-4fab-ae4c-f45f71ffe090
and "organization_id" = 3543877 and "deleted_at" is null) as "exists")
```

`POST /broadcasting/auth` returns a 500, Laravel Echo's authorizer treats that
as an auth failure, and the channel subscription is silently abandoned
(`pusher-js` doesn't retry a failed channel auth). Net effect: the frontend's
Layer-2 per-vehicle location and fuel WS streams (`location.vehicle.{id}`,
`fuel.vehicle.{id}`) never deliver a single event, for any vehicle, ever — not
intermittent, this fails on 100% of subscription attempts.

**Suggested fix:** `->where('uuid', $vehicleId)` (or resolve via whatever
scope/method the working `id`-as-uuid endpoints already use) in both channel
closures.

### 2. `GET /vehicles/{id}/sensors/health`

`VehicleController::sensorHealth()` (`app/Http/Controllers/Api/v1/VehicleController.php:1056`)
is still type-hinted `int`:

```php
public function sensorHealth(int $vehicle_id): \Illuminate\Http\JsonResponse
```

Calling it with a UUID route param throws before the method body runs:

```
App\Http\Controllers\Api\v1\VehicleController::sensorHealth(): Argument #1
($vehicle_id) must be of type int, string given, called in
/var/www/eonsfleet/backend/vendor/laravel/framework/src/Illuminate/Routing/Controller.php
on line 54
```

**Suggested fix:** change the parameter type to `string` and resolve the
vehicle by `uuid` internally, matching whatever every other UUID-based vehicle
lookup in this controller already does.

## Impact

Because these are the *only* two backend entry points still keyed on the
bigint PK, every vehicle in every organization hits this on every page load
of the Live Tracking asset panel:

- Details tab: RPM, driving state, door status, fuel rate/consumed, altitude,
  HDOP, protocol, etc. never populate from live telemetry (only a client-side
  IMEI-channel fallback partially covers location fields — see companion
  frontend fix in this session's commits).
- Device tab / Device Status card: sensor health never loads, so `health`
  falls back to the client-computed approximation everywhere.
- Fuel Detail section: tank capacity, data quality score, and last-updated
  timestamp never populate (these only come from the sensor-health-adjacent
  current-fuel endpoint, a separate but related UUID-vs-int bug already fixed
  on the frontend side — see `getVehicleCurrentFuel`).

Nothing crashes visibly (the frontend degrades to placeholder `—` values),
which is likely why this has gone unnoticed — there's no error toast, just
permanently-blank fields.

## Verification once fixed

With both fixes in place, `Pusher.instances[0].channels.channels` in the
browser console should show `subscribed: true` for
`private-location.vehicle.{uuid}` and `private-fuel.vehicle.{uuid}` (currently
`false`), and `GET /vehicles/{uuid}/sensors/health` should return 200 instead
of 500.
