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

/** Maximum packets retained per-vehicle in the Live IoT Packet Stream ring buffer */
export const PACKET_STREAM_MAX_ROWS_DEFAULT = 200

// ── Live Tracking map/perf tuning ─────────────────────────────────────────────

/** Target frame budget (ms) for the shared marker-interpolation rAF loop */
export const INTERPOLATION_FRAME_BUDGET_MS = 16

/** Debounce (ms) before flipping the WS connection-status banner, to avoid flicker on brief blips */
export const WS_RECONNECT_DEBOUNCE_MS = 1500

/** Debounce (ms) for subscribing to a vehicle's Layer-2 (per-vehicle) WS channels after selection */
export const LAYER2_SUBSCRIBE_DEBOUNCE_MS = 250

/** Vehicle count above which the map prefers clustering over individual markers */
export const CLUSTER_THRESHOLD = 50

/** Asset list length above which the sidebar switches to virtualized rendering */
export const VIRTUALIZE_LIST_THRESHOLD = 50

// ── Billing feature flags ────────────────────────────────────────────────────

/**
 * Saved payment methods and B2B change requests have no backing endpoints —
 * the client billing API surface has no card vault and no change-request
 * route. The helpers in lib/api/billing.ts are in-memory stand-ins kept for
 * when those endpoints land; they refuse to run unless this is explicitly
 * enabled, so no user is shown state that silently disappears on refresh.
 */
export const BILLING_MOCKS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BILLING_MOCKS === 'true'
