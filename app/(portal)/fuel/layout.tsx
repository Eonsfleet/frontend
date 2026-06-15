'use client'

import React from 'react'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fuel, CreditCard, GitCompare, BarChart3, Radio, Lock as LockIcon } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'

export default function FuelLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { hasCapability } = useSubscription()

    const navItems = [
        { name: 'Expenses', href: '/fuel', icon: Fuel },
        // { name: 'Card Management', href: '/fuel/cards', icon: CreditCard },
        { name: 'Reconciliation', href: '/fuel/reconciliation', icon: GitCompare },
        { name: 'Reports', href: '/fuel/reports', icon: BarChart3 },
        { name: 'Live Monitor', href: '/fuel/monitor', icon: Radio },
    ]

    return (
        <UpgradeGate
            module="fuel"
            featureName="Fuel Management"
            description="Track fuel expenses, integrate external fuel cards, and run anomaly detection algorithms to stop fuel theft."
            requiredPlan="growth"
        >
            <div className="flex h-full flex-col lg:flex-row bg-slate-50">
                {/* Secondary Sidebar Navigation */}
                <aside className="w-full lg:w-64 shrink-0 border-r border-slate-200 bg-white shadow-[1px_0_2px_rgba(0,0,0,0.02)] h-auto lg:h-[calc(100vh-64px)] overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 flex-shrink-0 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                                <Fuel className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 leading-tight">Fuel Center</h2>
                                <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">Management</p>
                            </div>
                        </div>

                        <nav className="space-y-1.5 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/fuel' && pathname.startsWith(item.href))

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group whitespace-nowrap lg:whitespace-normal
                                            ${isActive
                                                ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm border border-emerald-100'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                            {item.name}
                                        </div>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Sub-module Content Area */}
                <main className="flex-1 min-w-0 overflow-y-auto w-full h-full p-6 lg:p-8 relative">
                    {children}
                </main>
            </div>
        </UpgradeGate>
    )
}
