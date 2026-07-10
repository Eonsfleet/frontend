'use client'

import Link from 'next/link'
import {
    LayoutGrid,
    MapPin,
    Receipt,
    BarChart3,
    Bell,
    Settings,
    type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FuelTab {
    label: string
    icon: LucideIcon
    /** Route for implemented tabs; omitted tabs render as visual-only (disabled). */
    href?: string
}

const TABS: FuelTab[] = [
    { label: 'Overview', icon: LayoutGrid, href: '/fuel' },
    { label: 'Real-time Tracking', icon: MapPin, href: '/fuel/realtime' },
    { label: 'Fuel Transactions', icon: Receipt, href: '/fuel/transactions' },
    { label: 'Fuel Analysis', icon: BarChart3, href: '/fuel/analysis' },
    { label: 'Fuel Alerts', icon: Bell, href: '/fuel/alerts' },
    { label: 'Fuel Settings', icon: Settings, href: '/fuel/settings' },
]

const TAB_CLASS =
    'relative inline-flex items-center gap-1.5 whitespace-nowrap pb-3 text-sm transition-colors duration-200'

export function FuelTabs({ active }: { active: string }) {
    return (
        <nav
            aria-label="Fuel sections"
            className="flex items-center gap-6 overflow-x-auto border-b border-slate-100 pb-px"
        >
            {TABS.map(({ label, icon: Icon, href }) => {
                const isActive = label === active
                const underline = isActive && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />
                )

                if (href && !isActive) {
                    return (
                        <Link
                            key={label}
                            href={href}
                            className={cn(TAB_CLASS, 'font-medium text-slate-500 hover:text-slate-700')}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    )
                }

                return (
                    <button
                        key={label}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        disabled={!isActive}
                        className={cn(
                            TAB_CLASS,
                            isActive
                                ? 'font-medium text-blue-600'
                                : 'font-medium text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:hover:text-slate-500',
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                        {underline}
                    </button>
                )
            })}
        </nav>
    )
}
