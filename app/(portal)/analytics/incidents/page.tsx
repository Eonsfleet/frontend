"use client";

import { Suspense } from "react";
import { IncidentsV2 } from "@/components/analytics/incidents/IncidentsV2";

export default function IncidentAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <IncidentsV2 />
    </Suspense>
  );
}
