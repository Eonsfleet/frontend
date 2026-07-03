# Live Tracking — Asset Panel Full Telemetry & Packet Stream Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface every telemetry field already computed by `resolveVehicleTelemetry()` in the Live Tracking asset detail panel, and fix a duplicate-packet bug so the "Live IoT" packet stream shows exactly one row per distinct WS event with visible (not silent) truncation.

**Architecture:** Add a new "Diagnostics" tab to the existing `AssetPanel.tsx` tab set, backed by a new presentational component that reads the already-resolved telemetry object (no new data fetching). Fix the packet-stream duplicate-row bug at the Zustand store layer (dedup on push), and add a visible cap indicator to the existing packet stream viewer.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Zustand, TanStack Query, Vitest + React Testing Library.

## Global Constraints

- No changes to `lib/resolveVehicleTelemetry.ts`'s resolution/fallback logic or `buildVehicleSnapshot` — only new JSX consuming the existing output.
- No changes to WS channel/event subscriptions (`useVehicleLocations.ts`, `useVehicleTelemetry.ts`) — the duplicate-packet fix happens in `packetStreamStore.ts` only.
- No backend/API changes — "all packets accessible" means everything received over WS since the page was opened this session, not backend-persisted history.
- Follow existing conventions exactly: `TelemetryRow` for label/value rows, `formatVoltage`/`fmtTime` from `lib/resolveVehicleTelemetry.ts` where applicable, Tailwind utility classes matching sibling tab files, Vitest + `@testing-library/react` for tests.

---

### Task 1: Fix stale git worktree polluting test runs

**Problem:** `.claude/worktrees/tracking-mockup-reskin` is a registered git worktree (from already-merged work) with its own `node_modules`. Vitest's `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']` glob picks up its test files too, and because it has a separate React copy, every test run in that worktree's copy fails with `Cannot read properties of null (reading 'useContext')`, corrupting the pass/fail signal for every test file in this plan. This must be fixed first so later tasks get a clean TDD signal.

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Reproduce the problem**

Run: `npx vitest run "$(pwd)/__tests__/tracking/AssetPanel.test.tsx"`
Expected: `Test Files  1 failed | 1 passed (2)` — the same test file runs twice (once from `__tests__/`, once from `.claude/worktrees/tracking-mockup-reskin/__tests__/`), with the worktree copy failing on `useContext` errors unrelated to the test itself.

- [ ] **Step 2: Exclude the worktree directory from test discovery**

In `vitest.config.ts`, change:

```ts
        exclude: ['node_modules', '.next'],
```

to:

```ts
        exclude: ['node_modules', '.next', '.claude/worktrees/**'],
```

- [ ] **Step 3: Verify the fix**

Run: `npx vitest run "$(pwd)/__tests__/tracking/AssetPanel.test.tsx"`
Expected: `Test Files  1 passed (1)` / `Tests  3 passed (3)` — only the real test file runs.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts
git commit -m "test: exclude stale git worktree from vitest test discovery"
```

---

### Task 2: Add the Diagnostics tab

**Files:**
- Modify: `store/trackingUiStore.ts:3`
- Create: `app/(portal)/tracking/components/tabs/DiagnosticsTab.tsx`
- Modify: `app/(portal)/tracking/components/AssetPanel.tsx`
- Create: `__tests__/tracking/DiagnosticsTab.test.tsx`
- Modify: `__tests__/tracking/AssetPanel.test.tsx`

**Interfaces:**
- Consumes: `ResolvedVehicleTelemetry` type and `formatVoltage` from `@/lib/resolveVehicleTelemetry` (both already exported, unchanged); `TelemetryRow` from `@/components/shared/TelemetryRow` (unchanged); `useRelativeTime` from `@/hooks/useRelativeTime` (unchanged).
- Produces: `DiagnosticsTab({ resolved: ResolvedVehicleTelemetry }): JSX.Element`, exported from `app/(portal)/tracking/components/tabs/DiagnosticsTab.tsx`. `TrackingDetailTab` gains the literal `"diagnostics"`.

- [ ] **Step 1: Add "diagnostics" to the tab type**

In `store/trackingUiStore.ts`, change line 3 from:

```ts
export type TrackingDetailTab = "details" | "driver" | "trip" | "device" | "packets";
```

to:

```ts
export type TrackingDetailTab = "details" | "driver" | "trip" | "device" | "diagnostics" | "packets";
```

- [ ] **Step 2: Write the failing test for DiagnosticsTab**

Create `__tests__/tracking/DiagnosticsTab.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiagnosticsTab } from '@/app/(portal)/tracking/components/tabs/DiagnosticsTab'
import type { ResolvedVehicleTelemetry } from '@/lib/resolveVehicleTelemetry'

const baseResolved = {
  address: null, speed: 0, heading: 0, ignition: false, movement: null, status: null,
  lat: undefined, lng: undefined, altitude: null, satellites: null, odometer: null,
  engineHours: null, lastUpdate: null, rpm: null, rpmObd: null, oilLevel: null,
  fuelRate: null, fuelConsumed: null, fuelUsedGps: null, fuelLevelObd: null, fuelSource: null,
  ecoScore: null, idling: false, jamming: false, immobilizer: false, unplug: undefined,
  sleepMode: undefined, doorStatus: null, loadWeight: null, drivingState: null,
  batteryV: null, extV: null, batteryCurrent: null, engineTemp: 0, rssi: null, hdop: null,
  mileage: null, tripOdo: null, odoSource: null, protocol: null, confidence: null,
  fuel: null, fuelLiters: null, fuelTankCap: null, fuelQuality: null, fuelLastUpdate: null,
  deviceHasFuel: null, isDeviceOnline: true, fuelColor: '', ecoColor: '', ecoRingColor: '',
  batteryWarn: false, tempWarn: false, weakGps: false, health: {},
} as unknown as ResolvedVehicleTelemetry

describe('DiagnosticsTab', () => {
  it('shows "No active alerts" when all flags are inactive', () => {
    render(<DiagnosticsTab resolved={baseResolved} />)
    expect(screen.getByText('No active alerts')).toBeInTheDocument()
  })

  it('renders active alert chips and hides the "no active alerts" chip', () => {
    render(<DiagnosticsTab resolved={{ ...baseResolved, jamming: true, idling: true }} />)
    expect(screen.getByText('Jamming Detected')).toBeInTheDocument()
    expect(screen.getByText('Idling')).toBeInTheDocument()
    expect(screen.queryByText('No active alerts')).not.toBeInTheDocument()
  })

  it('renders populated telemetry fields with correct units', () => {
    render(
      <DiagnosticsTab
        resolved={{
          ...baseResolved,
          rpm: 1800,
          odometer: 45210,
          fuelRate: 3.2,
          extV: 12.6,
          ecoScore: 82,
          protocol: 'Teltonika Codec8',
        }}
      />,
    )
    expect(screen.getByText('1800 rpm')).toBeInTheDocument()
    expect(screen.getByText('45210 km')).toBeInTheDocument()
    expect(screen.getByText('3.2 L/h')).toBeInTheDocument()
    expect(screen.getByText('12.600V')).toBeInTheDocument()
    expect(screen.getByText('82/100')).toBeInTheDocument()
    expect(screen.getByText('Teltonika Codec8')).toBeInTheDocument()
  })

  it('shows an em dash placeholder for missing fields', () => {
    render(<DiagnosticsTab resolved={baseResolved} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(10)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/DiagnosticsTab.test.tsx`
Expected: FAIL with "Failed to resolve import" / "Cannot find module" for `@/app/(portal)/tracking/components/tabs/DiagnosticsTab` (file doesn't exist yet).

- [ ] **Step 4: Create the DiagnosticsTab component**

Create `app/(portal)/tracking/components/tabs/DiagnosticsTab.tsx`:

```tsx
"use client";

import React from "react";
import { TelemetryRow } from "@/components/shared/TelemetryRow";
import { formatVoltage } from "@/lib/resolveVehicleTelemetry";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { cn } from "@/lib/utils";
import type { ResolvedVehicleTelemetry } from "@/lib/resolveVehicleTelemetry";

interface DiagnosticsTabProps {
  resolved: ResolvedVehicleTelemetry;
}

function fmt(value: number | string | null | undefined, suffix = ""): string | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (typeof num !== "number" || isNaN(num)) return null;
  return `${num}${suffix}`;
}

function isFlagActive(value: boolean | string | null | undefined): boolean {
  return value === true || value === "true" || value === "1" || value === "on";
}

function yesNo(value: boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value ? "Yes" : "No";
}

const ALERT_CHIPS: Array<{
  key: "jamming" | "immobilizer" | "unplug" | "idling" | "sleepMode";
  label: string;
  style: string;
}> = [
  { key: "jamming", label: "Jamming Detected", style: "bg-rose-50 text-rose-700 border-rose-100" },
  { key: "immobilizer", label: "Immobilizer Active", style: "bg-rose-50 text-rose-700 border-rose-100" },
  { key: "unplug", label: "Unplugged", style: "bg-rose-50 text-rose-700 border-rose-100" },
  { key: "idling", label: "Idling", style: "bg-amber-50 text-amber-700 border-amber-100" },
  { key: "sleepMode", label: "Sleep Mode", style: "bg-amber-50 text-amber-700 border-amber-100" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-3 pb-1 first:pt-0">
      {children}
    </p>
  );
}

export function DiagnosticsTab({ resolved }: DiagnosticsTabProps) {
  const fuelLastUpdateRelative = useRelativeTime(resolved.fuelLastUpdate);
  const activeAlerts = ALERT_CHIPS.filter((chip) => isFlagActive(resolved[chip.key]));

  return (
    <div className="space-y-1 p-1">
      <SectionLabel>Alerts</SectionLabel>
      {activeAlerts.length === 0 ? (
        <div className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-100 inline-block">
          No active alerts
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {activeAlerts.map((chip) => (
            <span key={chip.key} className={cn("text-[10px] font-bold px-2.5 py-1.5 rounded-lg border", chip.style)}>
              {chip.label}
            </span>
          ))}
        </div>
      )}
      <TelemetryRow label="Driving State" value={resolved.drivingState} />
      <TelemetryRow label="Movement" value={resolved.movement} />
      <TelemetryRow label="Door Status" value={resolved.doorStatus} />
      <TelemetryRow label="Load Weight" value={fmt(resolved.loadWeight, " kg")} />

      <SectionLabel>Engine</SectionLabel>
      <TelemetryRow label="Engine RPM" value={fmt(resolved.rpm, " rpm")} />
      <TelemetryRow label="Engine RPM (OBD)" value={fmt(resolved.rpmObd, " rpm")} />
      <TelemetryRow label="Oil Level" value={fmt(resolved.oilLevel)} />

      <SectionLabel>Odometer &amp; Mileage</SectionLabel>
      <TelemetryRow label="Live Odometer" value={fmt(resolved.odometer, " km")} />
      <TelemetryRow label="Total Mileage" value={fmt(resolved.mileage, " km")} />
      <TelemetryRow label="Trip Odometer" value={fmt(resolved.tripOdo, " km")} />
      <TelemetryRow label="Odometer Source" value={resolved.odoSource} />

      <SectionLabel>Fuel Detail</SectionLabel>
      <TelemetryRow label="Fuel Rate" value={fmt(resolved.fuelRate, " L/h")} />
      <TelemetryRow label="Fuel Consumed" value={fmt(resolved.fuelConsumed, " L")} />
      <TelemetryRow label="Fuel Used (GPS)" value={fmt(resolved.fuelUsedGps, " L")} />
      <TelemetryRow label="Fuel Level (OBD)" value={fmt(resolved.fuelLevelObd, "%")} />
      <TelemetryRow label="Fuel Source" value={resolved.fuelSource} />
      <TelemetryRow label="Fuel Liters" value={fmt(resolved.fuelLiters, " L")} />
      <TelemetryRow label="Tank Capacity" value={fmt(resolved.fuelTankCap, " L")} />
      <TelemetryRow label="Fuel Data Quality" value={fmt(resolved.fuelQuality)} />
      <TelemetryRow label="Fuel Last Updated" value={fuelLastUpdateRelative} />
      <TelemetryRow label="Has Fuel Sensor" value={yesNo(resolved.deviceHasFuel)} />

      <SectionLabel>Electrical</SectionLabel>
      <TelemetryRow label="External Voltage" value={formatVoltage(resolved.extV)} />
      <TelemetryRow label="Battery Current" value={fmt(resolved.batteryCurrent, " A")} />

      <SectionLabel>GPS &amp; Eco</SectionLabel>
      <TelemetryRow label="Eco Score" value={fmt(resolved.ecoScore, "/100")} />
      <TelemetryRow label="Altitude" value={fmt(resolved.altitude, " m")} />
      <TelemetryRow label="GPS Precision (HDOP)" value={fmt(resolved.hdop)} />

      <SectionLabel>Protocol</SectionLabel>
      <TelemetryRow label="Protocol Name" value={resolved.protocol} />
      <TelemetryRow label="Confidence" value={fmt(resolved.confidence)} />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/DiagnosticsTab.test.tsx`
Expected: `Test Files  1 passed (1)` / `Tests  4 passed (4)`

- [ ] **Step 6: Wire the tab into AssetPanel**

In `app/(portal)/tracking/components/AssetPanel.tsx`, add the import after the `DeviceTab` import (line 40):

```tsx
import { DeviceTab } from "./tabs/DeviceTab";
import { DiagnosticsTab } from "./tabs/DiagnosticsTab";
import { PacketStreamTab } from "./tabs/PacketStreamTab";
```

Add a tab trigger after the "Device" trigger and before "Live IoT" (around line 276-277):

```tsx
          <TabsTrigger value="device" className={TAB_TRIGGER_CLASS}>Device</TabsTrigger>
          <TabsTrigger value="diagnostics" className={TAB_TRIGGER_CLASS}>Diagnostics</TabsTrigger>
          <TabsTrigger value="packets" className={TAB_TRIGGER_CLASS}>Live IoT</TabsTrigger>
```

Add the corresponding tab content after the Device `TabsContent` and before the Live IoT `TabsContent` (around line 294-297):

```tsx
        <TabsContent value="device" className="flex-1 overflow-y-auto p-4 m-0">
          <DeviceTab device={selectedVehicle.relationships?.device} resolved={resolved} deviceStatusData={deviceStatusData} />
        </TabsContent>
        <TabsContent value="diagnostics" className="flex-1 overflow-y-auto p-4 m-0">
          <DiagnosticsTab resolved={resolved} />
        </TabsContent>
        <TabsContent value="packets" className="flex-1 min-h-0 m-0">
```

- [ ] **Step 7: Add an AssetPanel test asserting the Diagnostics tab is wired in**

In `__tests__/tracking/AssetPanel.test.tsx`, add this test inside the existing `describe('AssetPanel', ...)` block:

```tsx
  it('includes a Diagnostics tab trigger', () => {
    render(
      <AssetPanel
        isOpen
        onClose={vi.fn()}
        selectedVehicle={vehicle}
        locations={{}}
        vehicles={[vehicle]}
        onLiveTrack={vi.fn()}
        onPlayback={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByRole('tab', { name: 'Diagnostics' })).toBeInTheDocument()
  })
```

- [ ] **Step 8: Run both test files to verify everything passes**

Run: `npx vitest run __tests__/tracking/AssetPanel.test.tsx __tests__/tracking/DiagnosticsTab.test.tsx`
Expected: `Test Files  2 passed (2)` / `Tests  8 passed (8)`

- [ ] **Step 9: Commit**

```bash
git add store/trackingUiStore.ts app/"(portal)"/tracking/components/tabs/DiagnosticsTab.tsx app/"(portal)"/tracking/components/AssetPanel.tsx __tests__/tracking/DiagnosticsTab.test.tsx __tests__/tracking/AssetPanel.test.tsx
git commit -m "feat(tracking): add Diagnostics tab surfacing full vehicle/device telemetry"
```

---

### Task 3: Fix duplicate packets in the packet stream store

**Problem:** For the selected vehicle, `.current.recent` location events are pushed into `packetStreamStore` twice — once by `useVehicleLocations`'s `pushIfSelected` (fed by the org-wide channel) and once by `useVehicleTelemetry`'s per-vehicle channel listener. Both call `usePacketStreamStore.getState().push(buildPacketEntry(...))` with the same backend payload, producing duplicate rows in the "Live IoT" tab.

**Files:**
- Modify: `store/packetStreamStore.ts`
- Create: `__tests__/tracking/packetStreamStore.test.ts`

**Interfaces:**
- Consumes: `PacketStreamEntry` type from `@/lib/packetStream` (unchanged).
- Produces: `usePacketStreamStore.getState().push(entry: PacketStreamEntry): void` — behavior changes (adds dedup) but the signature is unchanged, so no caller (`useVehicleLocations.ts`, `useVehicleTelemetry.ts`) needs modification.

- [ ] **Step 1: Write the failing test**

Create `__tests__/tracking/packetStreamStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePacketStreamStore } from '@/store/packetStreamStore'
import type { PacketStreamEntry } from '@/lib/packetStream'

function entry(overrides: Partial<PacketStreamEntry>): PacketStreamEntry {
  return {
    id: overrides.id ?? 'default-id',
    vehicleId: '1',
    type: 'Location',
    receivedAt: 1000,
    summary: 'Location update',
    raw: { speed: 10 },
    ...overrides,
  }
}

describe('packetStreamStore dedup', () => {
  beforeEach(() => {
    usePacketStreamStore.setState({ buffers: {}, droppedWhilePaused: {}, isPaused: false, maxRows: 200 })
  })

  it('drops a duplicate payload delivered on a second channel within the dedup window', () => {
    const { push } = usePacketStreamStore.getState()
    push(entry({ id: 'a', receivedAt: 1000, raw: { speed: 10 } }))
    push(entry({ id: 'b', receivedAt: 1500, raw: { speed: 10 } }))
    expect(usePacketStreamStore.getState().buffers['1']).toHaveLength(1)
  })

  it('keeps a genuinely different payload arriving within the same window', () => {
    const { push } = usePacketStreamStore.getState()
    push(entry({ id: 'a', receivedAt: 1000, raw: { speed: 10 } }))
    push(entry({ id: 'b', receivedAt: 1500, raw: { speed: 20 } }))
    expect(usePacketStreamStore.getState().buffers['1']).toHaveLength(2)
  })

  it('keeps an identical payload if it arrives after the dedup window', () => {
    const { push } = usePacketStreamStore.getState()
    push(entry({ id: 'a', receivedAt: 1000, raw: { speed: 10 } }))
    push(entry({ id: 'b', receivedAt: 5000, raw: { speed: 10 } }))
    expect(usePacketStreamStore.getState().buffers['1']).toHaveLength(2)
  })

  it('still respects maxRows after dedup', () => {
    usePacketStreamStore.setState({ maxRows: 2 })
    const { push } = usePacketStreamStore.getState()
    push(entry({ id: 'a', receivedAt: 1000, raw: { speed: 1 } }))
    push(entry({ id: 'b', receivedAt: 5000, raw: { speed: 2 } }))
    push(entry({ id: 'c', receivedAt: 9000, raw: { speed: 3 } }))
    expect(usePacketStreamStore.getState().buffers['1']).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/packetStreamStore.test.ts`
Expected: FAIL on the first test ("drops a duplicate payload...") — `buffers['1']` has length 2, not 1, because dedup doesn't exist yet.

- [ ] **Step 3: Implement the dedup fix**

In `store/packetStreamStore.ts`, replace the `push` function body:

```ts
  push: (entry) => {
    const { isPaused, maxRows, buffers, droppedWhilePaused } = get();
    if (isPaused) {
      set({
        droppedWhilePaused: {
          ...droppedWhilePaused,
          [entry.vehicleId]: (droppedWhilePaused[entry.vehicleId] ?? 0) + 1,
        },
      });
      return;
    }
    const existing = buffers[entry.vehicleId] ?? [];
    const [mostRecent] = existing;
    const isDuplicate =
      mostRecent != null &&
      mostRecent.type === entry.type &&
      entry.receivedAt - mostRecent.receivedAt < 3000 &&
      JSON.stringify(mostRecent.raw) === JSON.stringify(entry.raw);
    if (isDuplicate) return;
    set({
      buffers: {
        ...buffers,
        [entry.vehicleId]: [entry, ...existing].slice(0, maxRows),
      },
    });
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/packetStreamStore.test.ts`
Expected: `Test Files  1 passed (1)` / `Tests  4 passed (4)`

- [ ] **Step 5: Commit**

```bash
git add store/packetStreamStore.ts __tests__/tracking/packetStreamStore.test.ts
git commit -m "fix(tracking): dedup packet stream entries delivered on overlapping WS channels"
```

---

### Task 4: Show a visible note when the packet buffer is at capacity

**Files:**
- Modify: `app/(portal)/tracking/components/tabs/PacketStreamTab.tsx`
- Create: `__tests__/tracking/PacketStreamTab.test.tsx`

**Interfaces:**
- Consumes: `usePacketStreamStore` (adds a `maxRows` selector read; store shape unchanged from Task 3).

- [ ] **Step 1: Write the failing test**

Create `__tests__/tracking/PacketStreamTab.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PacketStreamTab } from '@/app/(portal)/tracking/components/tabs/PacketStreamTab'
import { usePacketStreamStore } from '@/store/packetStreamStore'
import type { PacketStreamEntry } from '@/lib/packetStream'

function makeEntries(count: number, vehicleId: string): PacketStreamEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${vehicleId}-${i}`,
    vehicleId,
    type: 'Location' as const,
    receivedAt: 1000 - i,
    summary: `Location update ${i}`,
    raw: { speed: i },
  }))
}

describe('PacketStreamTab buffer cap indicator', () => {
  beforeEach(() => {
    usePacketStreamStore.setState({ buffers: {}, droppedWhilePaused: {}, isPaused: false, maxRows: 3 })
  })

  it('shows no cap note when the buffer is below maxRows', () => {
    usePacketStreamStore.setState({ buffers: { '1': makeEntries(2, '1') } })
    render(<PacketStreamTab vehicleId="1" />)
    expect(screen.queryByText(/Showing last/)).not.toBeInTheDocument()
  })

  it('shows a cap note once the buffer reaches maxRows', () => {
    usePacketStreamStore.setState({ buffers: { '1': makeEntries(3, '1') } })
    render(<PacketStreamTab vehicleId="1" />)
    expect(screen.getByText('Showing last 3 events — older events are no longer available.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tracking/PacketStreamTab.test.tsx`
Expected: FAIL on the second test ("shows a cap note...") — the text isn't rendered anywhere yet.

- [ ] **Step 3: Add the cap indicator**

In `app/(portal)/tracking/components/tabs/PacketStreamTab.tsx`, add a `maxRows` selector alongside the existing store selectors (near line 77-80):

```tsx
  const buffer = usePacketStreamStore((s) => s.buffers[vehicleId]) ?? [];
  const isPaused = usePacketStreamStore((s) => s.isPaused);
  const maxRows = usePacketStreamStore((s) => s.maxRows);
  const droppedCount = usePacketStreamStore((s) => s.droppedWhilePaused[vehicleId]) ?? 0;
  const setPaused = usePacketStreamStore((s) => s.setPaused);
```

Add the cap note directly after the existing paused/dropped banner block (after line 168's closing `)}`):

```tsx
      {isPaused && droppedCount > 0 && (
        <div className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[9px] font-bold text-center">
          Paused — {droppedCount} event{droppedCount === 1 ? "" : "s"} not shown
        </div>
      )}

      {buffer.length >= maxRows && (
        <div className="px-3 py-1.5 bg-slate-50 text-slate-500 text-[9px] font-bold text-center">
          Showing last {maxRows} events — older events are no longer available.
        </div>
      )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/tracking/PacketStreamTab.test.tsx`
Expected: `Test Files  1 passed (1)` / `Tests  2 passed (2)`

- [ ] **Step 5: Run the full tracking test suite to check for regressions**

Run: `npx vitest run __tests__/tracking`
Expected: All test files pass (no failures introduced in `useVehicleLocations.test.ts`, `components.test.tsx`, etc.)

- [ ] **Step 6: Commit**

```bash
git add app/"(portal)"/tracking/components/tabs/PacketStreamTab.tsx __tests__/tracking/PacketStreamTab.test.tsx
git commit -m "feat(tracking): show a visible note when the packet stream buffer is at capacity"
```
