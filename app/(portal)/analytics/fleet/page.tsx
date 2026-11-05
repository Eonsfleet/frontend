"use client";

import { Suspense } from "react";
import { useAnalyticsUi } from "@/hooks/analytics/useAnalyticsUi";
import LegacyFleet from "@/components/analytics/legacy/LegacyFleet";
import { FleetV2 } from "@/components/analytics/fleet/FleetV2";

/** The Fleet tab. Same decision as the layout: the existing page stays available for comparison and rollback. */
function FleetSwitch() {
  const decision = useAnalyticsUi();
  if (!decision.ready) return null;
  return decision.ui === "v2" ? <FleetV2 /> : <LegacyFleet />;
}

export default function FleetAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <FleetSwitch />
    </Suspense>
  );
}
