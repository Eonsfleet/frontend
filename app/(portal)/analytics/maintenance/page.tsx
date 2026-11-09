"use client";

import { Suspense } from "react";
import { MaintenanceV2 } from "@/components/analytics/maintenance/MaintenanceV2";

export default function MaintenanceAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <MaintenanceV2 />
    </Suspense>
  );
}
