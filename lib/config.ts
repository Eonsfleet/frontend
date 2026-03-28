// ── Pagination ───────────────────────────────────────────────────────────────

/** Default page size for paginated tables */
export const PAGE_SIZE_DEFAULT = 15

/** Page size for dropdown / select lists (fetch all options) */
export const PAGE_SIZE_DROPDOWN = 100

/** Page size for exhaustive fetches where every record is needed (e.g. live map) */
export const PAGE_SIZE_FULL = 1000

// ── React Query stale times (milliseconds) ───────────────────────────────────

/** General-purpose data — changes occasionally (30 seconds) */
export const STALE_TIME_DEFAULT = 30_000

/** Live / real-time data — should refetch frequently (10 seconds) */
export const STALE_TIME_REALTIME = 10_000

/** Slow-changing reference data — roles, permissions, clusters (5 minutes) */
export const STALE_TIME_STATIC = 5 * 60_000

// ── Refetch intervals (milliseconds) ─────────────────────────────────────────

/** How often the dashboard/tracking map auto-refetches vehicle positions */
export const REFETCH_INTERVAL_MAP = 30_000

// ── Real-time buffers ─────────────────────────────────────────────────────────

/** Maximum number of geofence alert events kept in memory */
export const ALERTS_BUFFER_SIZE = 50
