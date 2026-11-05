"use client";

import { Suspense } from "react";
import { DriversV2 } from "@/components/analytics/drivers/DriversV2";

export default function DriverAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <DriversV2 />
    </Suspense>
  );
}
