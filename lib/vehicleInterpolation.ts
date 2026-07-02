/**
 * Client-side smoothing for live vehicle marker movement.
 *
 * The backend only pushes a new GPS fix every few seconds (see docs/livetracking.md).
 * Snapping the marker straight to each new fix looks like teleporting. This engine
 * keeps the last two known fixes per vehicle and linearly interpolates position and
 * heading between them, driven by a single shared requestAnimationFrame loop (not one
 * per vehicle — critical for the 10,000-vehicle performance target).
 *
 * Consumers should NOT store interpolated positions in React state — read them
 * imperatively inside the rAF loop and mutate the Leaflet marker/DOM node directly.
 */

export interface PositionSample {
  lat: number;
  lng: number;
  heading: number;
  /** ms, typically performance.now() or Date.now() at ingest time */
  timestamp: number;
}

interface InterpolationState {
  prev: PositionSample;
  next: PositionSample;
}

/** Below this interval (ms) we treat packets as effectively simultaneous and snap. */
const MIN_INTERVAL_MS = 1000;

/** Interval interpolation is stretched to; if two packets differ more than this we still cap. */
const MAX_INTERVAL_MS = 60_000;

function shortestHeadingDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export class VehicleInterpolator {
  private states = new Map<string, InterpolationState>();

  /** Feed a freshly-received GPS fix for a vehicle. */
  ingest(id: string, sample: PositionSample): void {
    const existing = this.states.get(id);

    if (!existing) {
      // First sample for this vehicle — nothing to interpolate from yet.
      this.states.set(id, { prev: sample, next: sample });
      return;
    }

    // Re-anchor "prev" to wherever the marker is *currently, visually* rendered
    // (not the last raw packet) so a new packet never causes a visible snap,
    // even if it arrives before the previous animation finished.
    const visualNow = this.getInterpolated(id, sample.timestamp) ?? existing.next;

    this.states.set(id, {
      prev: { ...visualNow, timestamp: sample.timestamp },
      next: sample,
    });
  }

  /** Stationary vehicles (parked/offline/speed 0) should snap directly, no lerp. */
  snap(id: string, sample: PositionSample): void {
    this.states.set(id, { prev: sample, next: sample });
  }

  remove(id: string): void {
    this.states.delete(id);
  }

  /** Compute the interpolated position for a vehicle at a given time (ms). */
  getInterpolated(id: string, now: number): PositionSample | null {
    const s = this.states.get(id);
    if (!s) return null;

    const rawInterval = s.next.timestamp - s.prev.timestamp;
    if (rawInterval <= 0) return s.next;

    const interval = Math.min(Math.max(rawInterval, MIN_INTERVAL_MS), MAX_INTERVAL_MS);
    const elapsed = now - s.prev.timestamp;
    const t = Math.min(1, Math.max(0, elapsed / interval));

    const lat = s.prev.lat + (s.next.lat - s.prev.lat) * t;
    const lng = s.prev.lng + (s.next.lng - s.prev.lng) * t;
    const heading =
      (s.prev.heading + shortestHeadingDelta(s.prev.heading, s.next.heading) * t + 360) % 360;

    return { lat, lng, heading, timestamp: now };
  }

  hasVehicle(id: string): boolean {
    return this.states.has(id);
  }

  ids(): string[] {
    return Array.from(this.states.keys());
  }
}
