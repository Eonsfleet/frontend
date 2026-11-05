"use client";

import { Suspense } from "react";
import { useAnalyticsUi } from "@/hooks/analytics/useAnalyticsUi";
import LegacyOverview from "@/components/analytics/legacy/LegacyOverview";
import { OverviewV2 } from "@/components/analytics/overview/OverviewV2";

/**
 * The Overview. Which version renders is the same decision the layout makes
 * (kill switch, ?ui=, cookie, runtime default), so the existing Overview stays
 * reachable for comparison and rollback.
 */
function OverviewSwitch() {
  const decision = useAnalyticsUi();
  if (!decision.ready) return null;
  return decision.ui === "v2" ? <OverviewV2 /> : <LegacyOverview />;
}

export default function AnalyticsOverviewPage() {
  return (
    <Suspense fallback={null}>
      <OverviewSwitch />
    </Suspense>
  );
}
