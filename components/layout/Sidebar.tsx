'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Car, Users, Route, MapPin, Wrench,
    AlertTriangle, Fuel, BarChart3, CreditCard, Bell,
    Webhook, Store, Settings, Lock
} from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'
import { useSubscription } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'

const NAV_SECTIONS = [
    {
        label: 'Operations',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null, module: null },
            { href: '/vehicles', label: 'Vehicles', icon: Car, permission: 'vehicles:read', module: null },
            { href: '/drivers', label: 'Drivers', icon: Users, permission: 'drivers:read', module: null },
            { href: '/trips', label: 'Trips', icon: Route, permission: 'trips:read', module: null },
            { href: '/tracking', label: 'Live Tracking', icon: MapPin, permission: 'tracking:read', module: null },
        ],
    },
    {
        label: 'Fleet Health',
        items: [
            { href: '/maintenance', label: 'Maintenance', icon: Wrench, permission: 'maintenance:read', module: null },
            { href: '/geofences', label: 'Geofences', icon: MapPin, permission: null, module: 'geofencing' },
            { href: '/incidents', label: 'Incidents', icon: AlertTriangle, permission: null, module: 'incidents' },
            { href: '/fuel', label: 'Fuel', icon: Fuel, permission: null, module: 'fuel_management' },
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
            { href: '/notifications', label: 'Notifications', icon: Bell, permission: 'notifications:read', module: null },
            { href: '/webhooks', label: 'Webhooks', icon: Webhook, permission: null, module: 'webhooks' },
            { href: '/vendors', label: 'Vendors', icon: Store, permission: 'vendors:read', module: null },
            { href: '/settings', label: 'Settings', icon: Settings, permission: null, module: null },
        ],
    },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { can } = usePermission()
    const { hasModule } = useSubscription()

    return (
        <aside className="w-64 border-r bg-white flex flex-col h-full">
            <div className="h-16 flex items-center gap-2 px-5 border-b">
                <div className="h-7 w-7 rounded-lg bg-blue-600" />
                <span className="font-semibold text-gray-900">EonsFleet</span>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {NAV_SECTIONS.map((section) => {
                    const visibleItems = section.items.filter(({ permission }) =>
                        !permission || can(permission)
                    )
                    if (visibleItems.length === 0) return null
                    return (
                        <div key={section.label}>
                            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                {section.label}
                            </p>
                            <div className="space-y-0.5">
                                {visibleItems.map(({ href, label, icon: Icon, module }) => {
                                    const isLocked = module && !hasModule(module as any)
                                    const isActive = pathname === href || pathname.startsWith(href + '/')
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            className={cn(
                                                'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                                                isLocked && 'opacity-60'
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Icon className="h-4 w-4 shrink-0" />
                                                {label}
                                            </div>
                                            {isLocked && <Lock className="h-3 w-3 text-gray-400" />}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </nav>
        </aside>
    )
}
