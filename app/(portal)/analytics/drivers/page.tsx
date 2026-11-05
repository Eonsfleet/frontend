"use client";

import { Suspense } from "react";
import { useAnalyticsUi } from "@/hooks/analytics/useAnalyticsUi";
import LegacyDrivers from "@/components/analytics/legacy/LegacyDrivers";
import { DriversV2 } from "@/components/analytics/drivers/DriversV2";

/** The Drivers tab. Same decision as the layout: the existing page stays available for comparison and rollback. */
function DriversSwitch() {
  const decision = useAnalyticsUi();
  if (!decision.ready) return null;
  return decision.ui === "v2" ? <DriversV2 /> : <LegacyDrivers />;
}

export default function DriverAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <DriversSwitch />
    </Suspense>
  );
}
