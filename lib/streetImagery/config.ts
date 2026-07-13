/**
 * Search-radius ladder walked by `findNearestImage` — start tight, widen
 * gradually, stop at the configured max rather than pulling in imagery from
 * an unreasonable distance without telling the user.
 */
export const SEARCH_RADII_METERS = [25, 50, 100, 250] as const;

export const MAX_SEARCH_RADIUS_METERS = SEARCH_RADII_METERS[SEARCH_RADII_METERS.length - 1];

/** Below this distance the connector line/"nearest imagery is X away" copy is suppressed. */
export const COINCIDENT_DISTANCE_METERS = 2;

/** Distance the live vehicle must drift from the frozen snapshot before showing the "moved" affordance. */
export const SIGNIFICANT_MOVEMENT_METERS = 50;

export const CACHE_TTL_HIT_MS = 10 * 60_000;
export const CACHE_TTL_MISS_MS = 60_000;
