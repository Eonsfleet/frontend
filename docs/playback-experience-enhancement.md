# Playback Experience Enhancement Notes

## Current implementation summary

The previous playback page advanced one raw GPS record at a time with a fixed `setTimeout(1000 / speed)`. That made route playback depend on frame count rather than source timestamps, so a 5-second GPS gap and a 5-minute GPS gap advanced visually at the same pace. The map marker was reused imperatively, but the position, telemetry, scrubber, and route progress only changed when the selected raw index changed.

## Weaknesses identified

- Playback speed was index-based, not timestamp-based.
- Marker movement jumped from point to point instead of interpolating along the segment.
- Heading updates used raw point heading only, causing abrupt turns.
- Timeline dragging only selected an index, not a true playback time.
- Completed and remaining route state was not visible.
- Live telemetry did not update between GPS records.
- Address resolution needed throttling/caching before it could feel live safely.
- Camera follow was always forced and did not support free/manual investigation mode.

## Improvements implemented

- Added a timestamp-driven playback engine using `requestAnimationFrame`.
- Added interpolation for latitude, longitude, speed, heading, fuel, and altitude.
- Added smoothstep easing between points and shortest-path heading interpolation for natural turns.
- Added support for `0.25x`, `0.5x`, `1x`, `2x`, `4x`, `8x`, `16x`, and `32x` playback speeds.
- Added route preparation that filters invalid/zero coordinates, removes duplicate records, sorts by timestamp, and tracks cumulative distance.
- Added live route progress overlays: vivid completed route and subtle dashed remaining route.
- Added map camera modes: smart follow, follow, free, and recenter.
- Added live telemetry overlay with address, coordinates, timestamp, speed, fuel, ignition, movement, altitude, heading, elapsed distance, remaining distance, and stop state.
- Added cached/debounced reverse geocoding with rounded coordinate keys and upcoming-address prefetch.
- Made timeline, event, and stop rows clickable so operators can jump directly to investigation points.

## Performance optimizations

- Reuses the same vehicle marker; movement uses provider marker handles instead of recreating markers.
- Keeps speed segment overlays stable and only rebuilds them when backend movement data changes.
- Uses binary search for time-to-segment lookup.
- Rounds reverse-geocode keys and tracks pending requests to prevent lookup storms.
- Throttles camera movement so high playback speeds do not spam `flyTo` calls.
- Caps large GPS gaps and unreasonable segment distances so bad data degrades gracefully instead of creating teleport-like distance metrics.

## Remaining recommendations

- Add backend-provided heading/course where possible for richer turn behavior on dense routes.
- Add backend event streams for ignition, parking, idle, harsh braking, geofence, and fuel deltas so event visualization is more authoritative.
- Add a provider-level mutable GeoJSON route-progress API for ultra-long trips instead of resetting progress polylines.
- Add traffic, terrain, pitch, rotation, compass, and measurement controls when supported by the selected map provider.
- Add a first-party reverse-geocoding endpoint or map-provider geocoding proxy for quota control and observability.