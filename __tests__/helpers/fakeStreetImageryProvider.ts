import { vi } from "vitest";
import type {
  StreetImageryError,
  StreetImageryMetadata,
  StreetImageryProvider,
  StreetImageryProviderKind,
} from "@/lib/streetImagery/types";

let current: StreetImageryProvider | null = null;

export interface FakeStreetImageryProviderOptions {
  kind?: StreetImageryProviderKind;
  /** What `findNearestImage` resolves to — null simulates "no coverage". */
  metadata?: StreetImageryMetadata | null;
}

/**
 * Test double for StreetImageryProvider — mirrors fakeMapProvider.ts's shape
 * (every method a vi.fn(), a module-level "most recently created" accessor)
 * so component tests can assert on calls without touching mapillary-js or a
 * real Google iframe.
 */
export function createFakeStreetImageryProvider(options: FakeStreetImageryProviderOptions = {}): StreetImageryProvider {
  const kind = options.kind ?? "mapillary";
  const errorCbs = new Set<(error: StreetImageryError) => void>();
  const bearingCbs = new Set<(bearing: number) => void>();
  const positionCbs = new Set<(metadata: StreetImageryMetadata) => void>();

  const provider: StreetImageryProvider = {
    kind,
    isConfigured: vi.fn(() => true),
    findNearestImage: vi.fn(async () => options.metadata ?? null),
    mount: vi.fn(async () => {}),
    unmount: vi.fn(),
    rotate: vi.fn(),
    onBearingChange: vi.fn((cb: (bearing: number) => void) => {
      bearingCbs.add(cb);
      return () => bearingCbs.delete(cb);
    }),
    onPositionChange: vi.fn((cb: (metadata: StreetImageryMetadata) => void) => {
      positionCbs.add(cb);
      return () => positionCbs.delete(cb);
    }),
    onError: vi.fn((cb: (error: StreetImageryError) => void) => {
      errorCbs.add(cb);
      return () => errorCbs.delete(cb);
    }),
  };

  current = provider;
  return provider;
}

export function getFakeStreetImageryProvider(): StreetImageryProvider {
  if (!current) throw new Error("No fake street imagery provider has been created yet");
  return current;
}

export function makeMetadata(overrides: Partial<StreetImageryMetadata> = {}): StreetImageryMetadata {
  return {
    imageId: "img-1",
    provider: "mapillary",
    position: { lat: 6.5244, lng: 3.3792 },
    capturedAt: "2024-01-01T08:00:00Z",
    bearing: 90,
    distanceMeters: 10,
    ...overrides,
  };
}
