"use client";

import React from "react";

interface MapErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface MapErrorBoundaryState {
  error: Error | null;
}

/**
 * Scoped error boundary for the map root only — a rendering error here
 * shouldn't take down the rest of the Live Tracking page (sidebar, filters,
 * asset panel stay interactive). Mirrors the two-tier fallback convention in
 * app/(portal)/error.tsx (message + retry), narrowed to just this region.
 */
export class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[MapErrorBoundary]", error, info);
  }

  private handleRetry = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg bg-slate-950 text-white">
          <p className="text-sm font-semibold">Map failed to render</p>
          <p className="max-w-xs text-center text-xs text-slate-400">
            {this.state.error.message || "An unexpected error occurred while rendering the map."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium hover:bg-emerald-500"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
