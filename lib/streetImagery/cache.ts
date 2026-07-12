import type { StreetImageryMetadata, StreetImageryPoint, StreetImageryProvider } from "./types";
import { CACHE_TTL_HIT_MS, CACHE_TTL_MISS_MS } from "./config";

interface CacheEntry {
  value: StreetImageryMetadata | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<StreetImageryMetadata | null>>();

function cacheKey(provider: StreetImageryProvider["kind"], point: StreetImageryPoint, radiusMeters: number): string {
  return `${provider}:${point.lat.toFixed(4)}:${point.lng.toFixed(4)}:${radiusMeters}`;
}

/**
 * Caches and de-duplicates `provider.findNearestImage` calls keyed by
 * rounded coordinate *and radius* — the radius must be part of the key since
 * callers walk a radius ladder for the same point, and a cached miss at a
 * smaller radius must not shadow a still-unattempted, wider radius. Two
 * components requesting imagery for the same location+radius at once share
 * one lookup instead of racing duplicate requests. "Not found" results use a
 * much shorter TTL than hits, so coverage that lands later (or was
 * momentarily rate-limited) gets re-checked soon.
 */
export function resolveNearestImage(
  provider: StreetImageryProvider,
  point: StreetImageryPoint,
  radiusMeters: number,
): Promise<StreetImageryMetadata | null> {
  const key = cacheKey(provider.kind, point, radiusMeters);

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = provider
    .findNearestImage(point, radiusMeters)
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + (value ? CACHE_TTL_HIT_MS : CACHE_TTL_MISS_MS) });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Test-only: clears cache/in-flight state between test cases. */
export function __resetStreetImageryCache(): void {
  cache.clear();
  inFlight.clear();
}

/**
 * Discards out-of-order async results — e.g. a user rapidly selecting
 * different vehicles, or closing the panel mid-lookup, must not let a
 * slow, now-irrelevant response get applied after a newer request started.
 */
export function createRequestFence() {
  let counter = 0;
  let latest = 0;
  return {
    begin(): number {
      latest = ++counter;
      return latest;
    },
    isCurrent(id: number): boolean {
      return id === latest;
    },
  };
}
