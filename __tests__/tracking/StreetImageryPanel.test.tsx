import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createFakeMapProvider } from "../helpers/fakeMapProvider";
import { createFakeStreetImageryProvider, makeMetadata } from "../helpers/fakeStreetImageryProvider";
import { __resetStreetImageryCache } from "@/lib/streetImagery/cache";

const resolveAvailableProviderKind = vi.fn();
const createStreetImageryProvider = vi.fn();

vi.mock("@/lib/streetImagery/StreetImageryProviderFactory", () => ({
  resolveAvailableProviderKind: (...args: unknown[]) => resolveAvailableProviderKind(...args),
  getAvailableProviderKinds: () => ["google", "mapillary"],
  createStreetImageryProvider: (...args: unknown[]) => createStreetImageryProvider(...args),
}));

import { StreetImageryPanel } from "@/app/(portal)/tracking/components/StreetImageryPanel";
import { MapInstanceProvider } from "@/app/(portal)/tracking/MapInstanceContext";
import { useStreetImageryStore } from "@/store/streetImageryStore";

function renderPanel(mapProvider = createFakeMapProvider()) {
  return {
    mapProvider,
    ...render(
      <MapInstanceProvider value={{ provider: mapProvider, providerKind: mapProvider.kind, isReady: true, isFallback: false }}>
        <StreetImageryPanel locations={{ "vehicle-1": { lat: 6.5244, lng: 3.3792 } }} />
      </MapInstanceProvider>,
    ),
  };
}

beforeEach(() => {
  __resetStreetImageryCache();
  resolveAvailableProviderKind.mockReset();
  createStreetImageryProvider.mockReset();
  act(() => {
    useStreetImageryStore.getState().close();
  });
});

afterEach(() => {
  act(() => {
    useStreetImageryStore.getState().close();
  });
});

describe("StreetImageryPanel", () => {
  it("shows the not-configured state when no provider is available", async () => {
    resolveAvailableProviderKind.mockReturnValue(null);
    renderPanel();

    act(() => {
      useStreetImageryStore.getState().open({ lat: 6.5244, lng: 3.3792 }, { label: "ABC-123" });
    });

    expect(await screen.findByText(/not configured for this environment/i)).toBeInTheDocument();
    expect(createStreetImageryProvider).not.toHaveBeenCalled();
  });

  it("shows the no-coverage state when the provider finds nothing", async () => {
    resolveAvailableProviderKind.mockReturnValue("mapillary");
    const fake = createFakeStreetImageryProvider({ metadata: null });
    createStreetImageryProvider.mockResolvedValue(fake);
    renderPanel();

    act(() => {
      useStreetImageryStore.getState().open({ lat: 6.5244, lng: 3.3792 }, { label: "ABC-123" });
    });

    expect(await screen.findByText(/no street-level imagery was found/i)).toBeInTheDocument();
    // Walked every configured radius before giving up.
    expect(fake.findNearestImage).toHaveBeenCalledTimes(4);
  });

  it("renders imagery details and syncs a map marker when a hit is found", async () => {
    resolveAvailableProviderKind.mockReturnValue("mapillary");
    const metadata = makeMetadata({ distanceMeters: 42 });
    const fake = createFakeStreetImageryProvider({ metadata });
    createStreetImageryProvider.mockResolvedValue(fake);
    const { mapProvider } = renderPanel();

    act(() => {
      useStreetImageryStore.getState().open({ lat: 6.5244, lng: 3.3792 }, { label: "ABC-123", vehicleId: "vehicle-1" });
    });

    expect(await screen.findByText("mapillary")).toBeInTheDocument();
    expect(screen.getByText(/~42m away/)).toBeInTheDocument();
    await waitFor(() => expect(fake.mount).toHaveBeenCalledWith(expect.anything(), metadata));

    await waitFor(() =>
      expect(mapProvider.addMarker).toHaveBeenCalledWith(
        "street-imagery-position",
        expect.objectContaining({ lat: metadata.position.lat, lng: metadata.position.lng }),
      ),
    );
  });

  it("discards a stale lookup when the user reopens for a different point before it resolves", async () => {
    resolveAvailableProviderKind.mockReturnValue("mapillary");

    let resolveFirst!: (value: ReturnType<typeof makeMetadata> | null) => void;
    const firstLookup = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const firstProvider = createFakeStreetImageryProvider();
    firstProvider.findNearestImage = vi.fn(() => firstLookup as any);

    const secondMetadata = makeMetadata({ imageId: "img-2", distanceMeters: 5 });
    const secondProvider = createFakeStreetImageryProvider({ metadata: secondMetadata });

    createStreetImageryProvider.mockResolvedValueOnce(firstProvider).mockResolvedValueOnce(secondProvider);
    renderPanel();

    act(() => {
      useStreetImageryStore.getState().open({ lat: 1, lng: 1 }, { label: "First" });
    });
    await waitFor(() => expect(firstProvider.findNearestImage).toHaveBeenCalled());

    act(() => {
      useStreetImageryStore.getState().open({ lat: 2, lng: 2 }, { label: "Second" });
    });
    expect(await screen.findByText("mapillary")).toBeInTheDocument();

    // The first (still in-flight) lookup resolving late must not clobber the second's result.
    act(() => {
      resolveFirst(makeMetadata({ imageId: "img-1-late" }));
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText(/~5m away/)).toBeInTheDocument();
  });

  it("rotates the view when the left/right controls are clicked", async () => {
    resolveAvailableProviderKind.mockReturnValue("mapillary");
    const metadata = makeMetadata();
    const fake = createFakeStreetImageryProvider({ metadata });
    createStreetImageryProvider.mockResolvedValue(fake);
    renderPanel();

    act(() => {
      useStreetImageryStore.getState().open({ lat: 6.5244, lng: 3.3792 }, { label: "ABC-123" });
    });
    await waitFor(() => expect(fake.mount).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText("Rotate view left"));
    fireEvent.click(screen.getByLabelText("Rotate view right"));

    expect(fake.rotate).toHaveBeenNthCalledWith(1, -30);
    expect(fake.rotate).toHaveBeenNthCalledWith(2, 30);
  });

  it("unmounts the viewer and clears map overlays when the panel closes", async () => {
    resolveAvailableProviderKind.mockReturnValue("mapillary");
    const metadata = makeMetadata();
    const fake = createFakeStreetImageryProvider({ metadata });
    createStreetImageryProvider.mockResolvedValue(fake);
    const { mapProvider } = renderPanel();

    act(() => {
      useStreetImageryStore.getState().open({ lat: 6.5244, lng: 3.3792 }, { label: "ABC-123" });
    });
    await waitFor(() => expect(fake.mount).toHaveBeenCalled());

    act(() => {
      useStreetImageryStore.getState().close();
    });

    await waitFor(() => expect(fake.unmount).toHaveBeenCalled());
    expect(mapProvider.removeMarker).toHaveBeenCalledWith("street-imagery-position");
    expect(mapProvider.removeOverlay).toHaveBeenCalledWith("street-imagery-connector");
  });
});

describe("StreetImageryPanel source switch", () => {
  it("passes the chosen source to the provider lookup and remembers it", async () => {
    resolveAvailableProviderKind.mockReturnValue("google");
    createStreetImageryProvider.mockResolvedValue(createFakeStreetImageryProvider({ metadata: null }));
    render(<StreetImageryPanel />);
    await act(async () => {
      useStreetImageryStore.getState().open({ lat: 6.5244, lng: 3.3792 }, { label: "ABC-123" });
    });
    await act(async () => {
      screen.getByRole("button", { name: "Mapillary" }).click();
    });
    expect(useStreetImageryStore.getState().preferredProvider).toBe("mapillary");
    expect(resolveAvailableProviderKind).toHaveBeenLastCalledWith("mapillary");
  });
});
