"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  Route,
  MapPin,
  Network,
  Wrench,
  AlertTriangle,
  Fuel,
  BarChart3,
  Store,
  Settings,
  Lock,
  Menu,
  LogOut,
  Loader2,
  FileText,
  FileBarChart,
  HardDrive,
  Plug,
  CreditCard,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { useSubscription } from "@/hooks/useSubscription";
import type { Capability } from "@/store/subscriptionStore";
import { useAccessControl } from "@/hooks/useAccessControl";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { logoutUser } from "@/lib/api/auth";
import * as notificationsApi from "@/lib/api/notifications";
import { toast } from "sonner";
import { NotificationBell } from "@/components/shared/NotificationBell";
import Image from "next/image";
import logoE from "@/public/images/logoE.svg";
import logo from "@/public/images/logo.png";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string | null;
  module: Capability | null;
  trialAllowed: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Command",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: null,
        module: null,
        trialAllowed: true,
      },
      {
        href: "/tracking",
        label: "Live Tracking",
        icon: MapPin,
        permission: "tracking:read",
        module: "geofence",
        trialAllowed: false,
      },
      {
        href: "/trips",
        label: "Trips",
        icon: Route,
        permission: "trips:read",
        module: "trips",
        trialAllowed: false,
      },
    ],
  },
  {
    label: "Fleet",
    items: [
      {
        href: "/vehicles",
        label: "Vehicles",
        icon: Car,
        permission: "vehicles:read",
        module: "vehicles",
        trialAllowed: true,
      },
      {
        href: "/drivers",
        label: "Drivers",
        icon: Users,
        permission: "drivers:read",
        module: "drivers",
        trialAllowed: true,
      },
      {
        href: "/settings/clusters",
        label: "Clusters",
        icon: Network,
        permission: null,
        module: null,
        trialAllowed: true,
      },
      {
        href: "/devices",
        label: "Devices",
        icon: HardDrive,
        permission: null,
        module: null,
        trialAllowed: false,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/geofences",
        label: "Geofences",
        icon: MapPin,
        permission: null,
        module: "geofence",
        trialAllowed: false,
      },
      {
        href: "/incidents",
        label: "Incidents",
        icon: AlertTriangle,
        permission: null,
        module: "incidents",
        trialAllowed: false,
      },
      {
        href: "/maintenance",
        label: "Maintenance",
        icon: Wrench,
        permission: "maintenance:read",
        module: "maintenance",
        trialAllowed: false,
      },
      {
        href: "/fuel",
        label: "Fuel",
        icon: Fuel,
        permission: null,
        module: "fuel",
        trialAllowed: false,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        permission: null,
        module: "analytics",
        trialAllowed: false,
      },
      {
        href: "/reports",
        label: "Reports",
        icon: FileBarChart,
        permission: null,
        module: null,
        trialAllowed: false,
      },
      {
        href: "/documents",
        label: "Documents",
        icon: FileText,
        permission: null,
        module: "documents",
        trialAllowed: false,
      },
      {
        href: "/vendors",
        label: "Vendors",
        icon: Store,
        permission: "vendors:read",
        module: "vendors",
        trialAllowed: false,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/subscription",
        label: "Subscription",
        icon: CreditCard,
        permission: null,
        module: null,
        trialAllowed: true,
      },
      {
        href: "/integrations",
        label: "Integrations",
        icon: Plug,
        permission: null,
        module: null,
        trialAllowed: false,
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        permission: null,
        module: null,
        trialAllowed: true,
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermission();
  const { hasCapability } = useSubscription();
  const { isExpiredTrial } = useAccessControl();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();

  // Reuses the exact same query key/fn as NotificationBell so this is a cache hit,
  // not a second network request — drives the "Alerts" nav item's unread badge.
  const { data: inboxData } = useQuery({
    queryKey: ["notifications", "inbox"],
    queryFn: () =>
      notificationsApi.getInbox({ unread_only: true, per_page: 10 }),
  });
  const unreadAlertsCount = (inboxData?.data?.notifications || []).filter(
    (n) => !n.attributes.is_read,
  ).length;

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: logoutUser,
    onMutate: () => {
      toast.loading("Signing out...", { id: "logout" });
    },
    onSuccess: () => {
      toast.success("Signed out successfully", { id: "logout" });
      clearAuth();
      queryClient.clear();
      localStorage.removeItem("eonsfleet-session");
      router.push("/login");
    },
    onError: () => {
      // Even if the API call fails, clear local session and redirect
      toast.success("Signed out successfully", { id: "logout" });
      clearAuth();
      queryClient.clear();
      localStorage.removeItem("eonsfleet-session");
      router.push("/login");
    },
  });

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "border-r bg-white flex flex-col h-full transition-all duration-300 ease-in-out z-50 shrink-0 relative shadow-sm",
          isSidebarCollapsed ? "w-20" : "w-64",
        )}
      >
        {/* Floating Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            "absolute -right-4 top-4 h-8 w-8 rounded-full border border-slate-200 bg-white shadow-md z-50 text-slate-400 hover:text-blue-600 transition-all",
            isSidebarCollapsed ? "rotate-180" : "rotate-0",
          )}
        >
          <Menu className="w-4 h-4" />
        </Button>

        <div
          className={cn(
            "h-16 flex items-center border-b shrink-0 transition-all ",
            isSidebarCollapsed ? "justify-center px-0" : "gap-3",
          )}
        >
          <div
            className={cn(
              "h-16 flex items-center border-b shrink-0 transition-all px-5",
              isSidebarCollapsed ? "justify-center px-0" : "gap-3",
            )}
          >
            {isSidebarCollapsed && <Image src={logoE} alt="Eonsfleet logo" />}
            {!isSidebarCollapsed && <Image src={logo} alt="EonsFleet Logo" />}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-none">
          <div className={cn("space-y-5", isSidebarCollapsed && "space-y-4")}>
            {NAV_GROUPS.map((group) => {
              const visibleItems = group.items.filter(({ permission, trialAllowed }) => {
                if (permission && !can(permission)) return false;
                if (isExpiredTrial && !trialAllowed) return false;
                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
                <section key={group.label} className="space-y-1.5">
                  {!isSidebarCollapsed ? (
                    <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {group.label}
                    </p>
                  ) : (
                    <div className="mx-auto mb-2 h-px w-8 bg-slate-100" />
                  )}

                  <div className="space-y-1">
                    {visibleItems.map(({ href, label, icon: Icon, module }) => {
                      const isLocked = module && !hasCapability(module);
                      const isActive =
                        !isLocked &&
                        (href === "/settings"
                          ? pathname === href
                          : pathname === href || pathname.startsWith(href + "/"));
                      const badgeCount = href === "/alerts" ? unreadAlertsCount : 0;
                      const itemContent = (
                        <Link
                          href={isLocked ? "/subscription" : href}
                          className={cn(
                            "flex items-center rounded-xl transition-all duration-200 group relative",
                            isSidebarCollapsed
                              ? "mx-auto h-11 w-11 justify-center"
                              : "justify-between px-3 py-2.5",
                            isActive
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                            isLocked && "hover:bg-amber-50/50",
                          )}
                        >
                          <div
                            className={cn(
                              "flex min-w-0 items-center gap-3",
                              isLocked && "opacity-40 grayscale",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                                isActive
                                  ? "bg-white/15 text-white"
                                  : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600",
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                            </span>
                            {!isSidebarCollapsed && (
                              <span className="truncate text-[13px] font-bold tracking-tight">
                                {label}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!isLocked && badgeCount > 0 && (
                              <span
                                className={cn(
                                  "flex items-center justify-center rounded-full bg-rose-500 font-black text-white",
                                  isSidebarCollapsed
                                    ? "absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[9px] ring-2 ring-white"
                                    : "h-5 min-w-5 px-1.5 text-[10px]",
                                )}
                              >
                                {badgeCount > 9 ? "9+" : badgeCount}
                              </span>
                            )}
                            {isLocked && (
                              <div
                                className={cn(
                                  "transition-all",
                                  isSidebarCollapsed
                                    ? "absolute -right-1 -top-1 rounded-full bg-white p-0.5"
                                    : "rounded-md bg-amber-100/50 p-1",
                                )}
                              >
                                <Lock
                                  className={cn(
                                    "text-amber-600",
                                    isSidebarCollapsed ? "h-2 w-2" : "h-3 w-3",
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        </Link>
                      );

                      if (isSidebarCollapsed) {
                        return (
                          <Tooltip key={href}>
                            <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
                            <TooltipContent
                              side="right"
                              sideOffset={15}
                              className="bg-slate-900 border-none text-white px-3 py-1.5 font-bold text-xs ring-4 ring-slate-900/10"
                            >
                              {label} {isLocked ? "(UPGRADE TO UNLOCK)" : ""}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return <React.Fragment key={href}>{itemContent}</React.Fragment>;
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Logout — last item in nav */}
          <div className="mt-6">
            {!isSidebarCollapsed ? (
              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-in fade-in">
                Session
              </p>
            ) : (
              <div className="h-px bg-slate-100 mb-6 mx-2" />
            )}
            <div className="space-y-1">
              {isSidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => logout()}
                      disabled={isLoggingOut}
                      className="h-12 w-12 mx-auto flex items-center justify-center rounded-xl text-rose-400 hover:bg-rose-50 transition-all group disabled:opacity-50"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={15}
                    className="bg-slate-900 border-none text-white px-3 py-1.5 font-bold text-xs ring-4 ring-slate-900/10"
                  >
                    Logout
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5 shrink-0 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="font-bold text-[13px] tracking-tight">
                    {isLoggingOut ? "Signing out..." : "Logout"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-50 p-4 space-y-3">
          <div
            className={cn(
              isSidebarCollapsed ? "flex justify-center" : "w-full",
            )}
          >
            <NotificationBell showLabel={!isSidebarCollapsed} />
          </div>

          <Link
            href="/profile"
            className="flex items-center gap-3 p-2 rounded-xl border border-transparent transition-all hover:bg-slate-50"
          >
            <div className="h-9 w-9 rounded-full bg-slate-100 shrink-0 overflow-hidden border-2 border-white shadow-sm">
              <img
                className="h-full w-full object-cover"
                src={
                  user?.attributes?.avatar ??
                  "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"
                }
                alt="User-avatar"
              />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">
                  {user?.attributes?.full_name}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  {user?.attributes?.role}
                </p>
              </div>
            )}
          </Link>
        </div>
      </aside>
    </TooltipProvider>
  );
}
