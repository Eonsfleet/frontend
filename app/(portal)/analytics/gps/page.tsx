"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAnalyticsUi } from "@/hooks/analytics/useAnalyticsUi";
import LegacyGps from "@/components/analytics/legacy/LegacyGps";

/**
 * GPS & Routes was merged into the Fleet tab. For the rebuilt Analytics this
 * page sends visitors to Fleet, keeping their filters; the previous version
 * still shows the original page. The detail pages under /analytics/gps/*
 * are untouched.
 */
function GpsSwitch() {
  const decision = useAnalyticsUi();
  const router = useRouter();
  const search = useSearchParams();
  const query = search.toString();
  const toFleet = decision.ready && decision.ui === "v2";

  useEffect(() => {
    if (toFleet) router.replace(`/analytics/fleet${query ? `?${query}` : ""}`);
  }, [toFleet, query, router]);

  if (!decision.ready || toFleet) return null;
  return <LegacyGps />;
}

export default function GpsAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <GpsSwitch />
    </Suspense>
  );
}
