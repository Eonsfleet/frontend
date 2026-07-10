'use client'

import {
    Settings as SettingsIcon,
    Droplet,
    Bell,
    Activity,
    Plug,
    Tag,
    Archive,
    SlidersHorizontal,
    HelpCircle,
    ExternalLink,
    type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
    id?: string
    label: string
    description: string
    icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
    { id: 'general-settings', label: 'General Settings', description: 'Units, currency and preferences', icon: SettingsIcon },
    { id: 'fuel-thresholds', label: 'Fuel Thresholds', description: 'Set fuel level limits', icon: Droplet },
    { id: 'fuel-alerts', label: 'Fuel Alerts & Notifications', description: 'Configure alert preferences', icon: Bell },
    { label: 'Fuel Sensors', description: 'Sensor calibration & configuration', icon: Activity },
    { label: 'Fuel Integration', description: 'Third-party integrations', icon: Plug },
    { label: 'Fuel Price', description: 'Manage fuel prices', icon: Tag },
    { label: 'Data Retention', description: 'Data storage & history', icon: Archive },
    { label: 'Advanced Settings', description: 'Custom rules & system behavior', icon: SlidersHorizontal },
]

export function SettingsNav({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-white p-3">
                <h2 className="px-2 pb-2 pt-1 text-sm font-bold text-slate-900">Fuel Settings</h2>
                <nav className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.label === active
                        const isEnabled = Boolean(item.id)

                        return (
                            <button
                                key={item.label}
                                type="button"
                                disabled={!isEnabled}
                                onClick={() => item.id && onNavigate(item.id)}
                                className={cn(
                                    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200',
                                    isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : isEnabled
                                            ? 'text-slate-600 hover:bg-slate-50'
                                            : 'cursor-not-allowed text-slate-400',
                                )}
                            >
                                <item.icon
                                    className={cn('mt-0.5 h-4 w-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')}
                                />
                                <span>
                                    <span className={cn('block text-sm font-semibold', isActive ? 'text-blue-700' : isEnabled ? 'text-slate-900' : 'text-slate-400')}>
                                        {item.label}
                                    </span>
                                    <span className="block text-xs text-slate-400">{item.description}</span>
                                </span>
                            </button>
                        )
                    })}
                </nav>
            </div>

            <div className="rounded-2xl bg-white p-5">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900">Need Help?</h3>
                </div>
                <p className="mt-1.5 text-sm text-slate-500">Learn more about fuel settings</p>
                <a
                    href="#"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                    View Documentation
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>
        </div>
    )
}
