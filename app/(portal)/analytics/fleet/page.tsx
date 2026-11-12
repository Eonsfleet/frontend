"use client";

import { Suspense } from "react";
import { FleetV2 } from "@/components/analytics/fleet/FleetV2";

export default function FleetAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <FleetV2 />
    </Suspense>
  );
}
