'use client'

import React from 'react'
import { RoleGate } from '@/components/shared/RoleGate'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Layers, FileText, Receipt, Sparkles, FlaskConical } from 'lucide-react'

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    const navItems = [
        { name: 'Overview', href: '/subscription', icon: LayoutDashboard },
        { name: 'Billing Groups', href: '/subscription/billing-groups', icon: Layers },
        { name: 'Invoices', href: '/subscription/invoices', icon: FileText },
        { name: 'Payments', href: '/subscription/payments', icon: Receipt },
        { name: 'Plan & Features', href: '/subscription/plan', icon: Sparkles },
        { name: 'POC', href: '/subscription/poc', icon: FlaskConical },
    ]

    return (
        <RoleGate
            allowedRoles={['administrator', 'finance']}
            fallbackMessage="Subscription and billing details are restricted to designated Organization Administrators and Finance managers."
        >
            <div className="flex h-full flex-col lg:flex-row bg-slate-50">
                <aside className="w-full lg:w-60 shrink-0 border-r border-slate-200 bg-white lg:h-[calc(100vh-64px)] overflow-y-auto">
                    <div className="p-5">
                        <div className="mb-7 flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <Layers className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <h2 className="text-[13px] font-bold leading-tight text-slate-900">Subscription & Billing</h2>
                                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Asset-based billing</p>
                            </div>
                        </div>

                        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Manage</p>
                        <nav className="flex flex-row space-y-0.5 overflow-x-auto pb-4 lg:flex-col lg:overflow-x-visible lg:pb-0">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/subscription' && pathname.startsWith(item.href))
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`group flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-all lg:whitespace-normal
                                            ${isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                        `}
                                    >
                                        <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'}`} />
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                </aside>

                <main className="h-full w-full flex-1 min-w-0 overflow-y-auto p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </RoleGate>
    )
}
