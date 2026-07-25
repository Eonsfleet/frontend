"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  Activity,
  Wrench,
  ShieldAlert,
  Map,
} from "lucide-react";
import { UpgradeGate } from "@/components/shared/UpgradeGate";

const navItems = [
  { name: "Overview", href: "/analytics", icon: LayoutDashboard },
  { name: "Fleet Utilization", href: "/analytics/fleet", icon: Truck },
  { name: "Driver Performance", href: "/analytics/drivers", icon: Users },
  // { name: 'Fuel Intelligence', href: '/analytics/fuel', icon: Activity },
  { name: "Maintenance", href: "/analytics/maintenance", icon: Wrench },
  { name: "Incidents", href: "/analytics/incidents", icon: ShieldAlert },
  { name: "GPS & Routes", href: "/analytics/gps", icon: Map },
];

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <UpgradeGate
      requiredPlan="growth"
      module="analytics"
      featureName="Analytics Hub"
      description="Access advanced telemetry and business reports."
    >
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Secondary Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto hidden md:block shrink-0">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Intelligence Hub</h2>
            <p className="text-xs text-slate-500 mt-1">
              Fleet data and insights
            </p>
          </div>
          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">{children}</div>
      </div>
    </UpgradeGate>
  );
}
