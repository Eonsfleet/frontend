'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Car, Users, Route, MapPin, Wrench,
    AlertTriangle, Fuel, BarChart3, CreditCard, Bell,
    Webhook, Store, Settings, Lock, Menu
} from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'
import { useSubscription } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useQuery } from '@tanstack/react-query'
import * as notificationApi from '@/lib/api/notifications'
import { Button } from '@/components/ui/button'

const NAV_SECTIONS = [
    {
        label: 'Operations',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null, module: null },
            { href: '/vehicles', label: 'Vehicles', icon: Car, permission: 'vehicles:read', module: 'vehicles' },
            { href: '/drivers', label: 'Drivers', icon: Users, permission: 'drivers:read', module: 'drivers' },
            { href: '/trips', label: 'Trips', icon: Route, permission: 'trips:read', module: 'trips' },
            { href: '/tracking', label: 'Live Tracking', icon: MapPin, permission: 'tracking:read', module: 'geofence' },
        ],
    },
    {
        label: 'Fleet Health',
        items: [
            { href: '/maintenance', label: 'Maintenance', icon: Wrench, permission: 'maintenance:read', module: 'maintenance' },
            { href: '/geofences', label: 'Geofences', icon: MapPin, permission: null, module: 'geofence' },
            { href: '/incidents', label: 'Incidents', icon: AlertTriangle, permission: null, module: 'incidents' },
            { href: '/fuel', label: 'Fuel', icon: Fuel, permission: null, module: 'fuel' },
        ],
    },
    {
        label: 'Intelligence',
        items: [
            { href: '/analytics', label: 'Analytics', icon: BarChart3, permission: null, module: 'analytics' },
        ],
    },
    {
        label: 'Account',
        items: [
            { href: '/billing', label: 'Billing', icon: CreditCard, permission: 'billing:read', module: null },
            { href: '/notifications', label: 'Notifications', icon: Bell, permission: 'notifications:read', module: 'notifications' },
            { href: '/webhooks', label: 'Webhooks', icon: Webhook, permission: null, module: 'webhooks' },
            { href: '/vendors', label: 'Vendors', icon: Store, permission: 'vendors:read', module: 'vendors' },
            { href: '/settings', label: 'Settings', icon: Settings, permission: null, module: null },
        ],
    },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { can } = usePermission()
    const { hasCapability } = useSubscription()
    const { isSidebarCollapsed, toggleSidebar } = useUIStore()

    // Fetch notifications for the badge
    const { data: inboxData } = useQuery({
        queryKey: ['notifications', 'inbox'],
        queryFn: () => notificationApi.getInbox({ unread_only: true }),
        refetchInterval: 30000, // Sync every 30s
    })

    const unreadCount = inboxData?.data?.notifications?.filter(n => !n.attributes.read_at).length || 0

    return (
        <TooltipProvider delayDuration={0}>
            <aside className={cn(
                "border-r bg-white flex flex-col h-full transition-all duration-300 ease-in-out z-50 shrink-0 relative shadow-sm",
                isSidebarCollapsed ? "w-20" : "w-64"
            )}>
                {/* Floating Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className={cn(
                        "absolute -right-4 top-4 h-8 w-8 rounded-full border border-slate-200 bg-white shadow-md z-50 text-slate-400 hover:text-blue-600 transition-all",
                        isSidebarCollapsed ? "rotate-180" : "rotate-0"
                    )}
                >
                    <Menu className="w-4 h-4" />
                </Button>

                <div className={cn(
                    "h-16 flex items-center border-b shrink-0 transition-all px-5",
                    isSidebarCollapsed ? "justify-center px-0" : "gap-3"
                )}>
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                        <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
                    </div>
                    {!isSidebarCollapsed && (
                        <span className="font-black text-slate-900 tracking-tighter text-lg animate-in fade-in slide-in-from-left-2">
                            EonsFleet
                        </span>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 scrollbar-none">
                    {NAV_SECTIONS.map((section) => {
                        const visibleItems = section.items.filter(({ permission }) =>
                            !permission || can(permission)
                        )
                        if (visibleItems.length === 0) return null
                        return (
                            <div key={section.label}>
                                {!isSidebarCollapsed ? (
                                    <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-in fade-in">
                                        {section.label}
                                    </p>
                                ) : (
                                    <div className="h-px bg-slate-100 mb-6 mx-2" />
                                )}
                                <div className="space-y-1">
                                    {visibleItems.map(({ href, label, icon: Icon, module }) => {
                                        const isLocked = module && !hasCapability(module as any)
                                        const isActive = !isLocked && (pathname === href || pathname.startsWith(href + '/'))
                                        const isNotifications = label === 'Notifications'

                                        const itemContent = (
                                            <Link
                                                href={isLocked ? '/billing' : href}
                                                className={cn(
                                                    'flex items-center rounded-xl transition-all duration-200 group relative',
                                                    isSidebarCollapsed ? 'justify-center h-12 w-12 mx-auto' : 'px-4 py-2.5 justify-between',
                                                    isActive
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                                                    isLocked && 'hover:bg-amber-50/50'
                                                )}
                                            >
                                                <div className={cn("flex items-center gap-3.5", isLocked && "opacity-40 grayscale")}>
                                                    <Icon className={cn(
                                                        "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                                                        isActive ? "text-white" : "text-slate-400 group-hover:text-blue-500"
                                                    )} />
                                                    {!isSidebarCollapsed && (
                                                        <span className="font-bold text-[13px] tracking-tight">{label}</span>
                                                    )}
                                                </div>

                                                {/* Badge Integration */}
                                                <div className="flex items-center gap-2">
                                                    {isNotifications && unreadCount > 0 && !isLocked && (
                                                        <div className={cn(
                                                            "flex h-5 items-center justify-center rounded-full text-[10px] font-black px-1.5",
                                                            isActive ? "bg-white text-blue-600" : "bg-rose-500 text-white shadow-sm shadow-rose-200",
                                                            isSidebarCollapsed && "absolute top-1 right-1 h-2 w-2 p-0 border border-white"
                                                        )}>
                                                            {!isSidebarCollapsed && unreadCount}
                                                        </div>
                                                    )}
                                                    {isLocked && (
                                                        <div className={cn(
                                                            "transition-all",
                                                            isSidebarCollapsed ? "absolute -top-1 -right-1 bg-white rounded-full p-0.5" : "bg-amber-100/50 p-1 rounded-md"
                                                        )}>
                                                            <Lock className={cn("text-amber-600", isSidebarCollapsed ? "h-2 w-2" : "h-3 w-3")} />
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        )

                                        if (isSidebarCollapsed) {
                                            return (
                                                <Tooltip key={href}>
                                                    <TooltipTrigger asChild>
                                                        {itemContent}
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" sideOffset={15} className="bg-slate-900 border-none text-white px-3 py-1.5 font-bold text-xs ring-4 ring-slate-900/10">
                                                        {label} {isLocked ? '(UPGRADE TO UNLOCK)' : ''}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        }

                                        return <React.Fragment key={href}>{itemContent}</React.Fragment>
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-50">
                    <div className={cn(
                        "flex items-center gap-3 p-2 rounded-xl border border-transparent transition-all",
                        !isSidebarCollapsed && "hover:bg-slate-50"
                    )}>
                        <div className="h-9 w-9 rounded-full bg-slate-100 shrink-0 overflow-hidden border-2 border-white shadow-sm">
                            <img src="/api/placeholder/100/100" alt="User" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">Suleiman Musa</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Fleet Admin</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </TooltipProvider>
    )
}
