/** A single point in a vehicle's live breadcrumb trail. */
export interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

/** Trail is capped at whichever of these limits is hit first. */
export const TRAIL_MAX_POINTS = 50;
export const TRAIL_MAX_AGE_MS = 15 * 60_000;

/**
 * Appends a point to a vehicle's breadcrumb trail, evicting points older than
 * TRAIL_MAX_AGE_MS (relative to the new point) and capping the result at
 * TRAIL_MAX_POINTS. Pure — never mutates the input array.
 */
export function appendTrailPoint(trail: TrailPoint[], point: TrailPoint): TrailPoint[] {
  const cutoff = point.timestamp - TRAIL_MAX_AGE_MS;
  const kept = trail.filter((p) => p.timestamp >= cutoff);
  const next = [...kept, point];
  return next.length > TRAIL_MAX_POINTS ? next.slice(next.length - TRAIL_MAX_POINTS) : next;
}
