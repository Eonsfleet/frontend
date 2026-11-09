"use client";

import React, { Suspense } from "react";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import { AnalyticsShell } from "@/components/analytics/shell/AnalyticsShell";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UpgradeGate
      requiredPlan="growth"
      module="analytics"
      featureName="Analytics Hub"
      description="Access advanced telemetry and business reports."
    >
      <Suspense fallback={<div className="p-8 text-sm text-slate-400 animate-pulse">Loading analytics…</div>}>
        <AnalyticsShell>{children}</AnalyticsShell>
      </Suspense>
    </UpgradeGate>
  );
}
