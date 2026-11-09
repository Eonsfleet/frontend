"use client";

import { Suspense } from "react";
import { OverviewV2 } from "@/components/analytics/overview/OverviewV2";

export default function AnalyticsOverviewPage() {
  return (
    <Suspense fallback={null}>
      <OverviewV2 />
    </Suspense>
  );
}
