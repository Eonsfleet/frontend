"use client";

import React, { Suspense } from "react";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import { ReportsHub } from "@/components/reports/ReportsHub";

export default function ReportsPage() {
  return (
    <UpgradeGate
      requiredPlan="growth"
      module="analytics"
      featureName="Reports"
      description="Preview, export and schedule fleet business reports."
    >
      <Suspense fallback={null}>
        <ReportsHub />
      </Suspense>
    </UpgradeGate>
  );
}
