"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import { LegacyAnalyticsShell } from "@/components/analytics/legacy/LegacyAnalyticsShell";
import { AnalyticsShell } from "@/components/analytics/shell/AnalyticsShell";
import { useAnalyticsUi } from "@/hooks/analytics/useAnalyticsUi";
import { UI_PARAM } from "@/lib/analytics/flags";

/**
 * Analytics keeps its subscription gate for both experiences; only the frame
 * differs. Which frame is decided by lib/analytics/flags.ts (kill switch, then
 * ?ui=, then cookie, then the runtime default), so the existing experience
 * stays available for comparison and rollback.
 */
function ShellSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const decision = useAnalyticsUi();

  if (!decision.ready) {
    return <div className="p-8 text-sm text-slate-400 animate-pulse">Loading analytics…</div>;
  }

  if (decision.ui === "legacy") {
    return (
      <>
        <LegacyAnalyticsShell>{children}</LegacyAnalyticsShell>
        {decision.canSwitch && (
          <Link
            href={`${pathname}?${UI_PARAM}=v2`}
            className="fixed bottom-4 right-4 z-40 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-md hover:text-slate-900"
          >
            Preview the new Analytics
          </Link>
        )}
      </>
    );
  }

  return (
    <AnalyticsShell
      switcher={
        decision.canSwitch ? (
          <Link
            href={`${pathname}?${UI_PARAM}=legacy`}
            className="rounded-md border border-an-border px-2.5 py-1.5 text-xs font-medium text-an-muted hover:text-an-text"
          >
            Preview build · Switch to previous version
          </Link>
        ) : null
      }
    >
      {children}
    </AnalyticsShell>
  );
}

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
        <ShellSwitch>{children}</ShellSwitch>
      </Suspense>
    </UpgradeGate>
  );
}
