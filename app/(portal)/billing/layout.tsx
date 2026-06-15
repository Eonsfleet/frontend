'use client'

import React from 'react'
import { RoleGate } from '@/components/shared/RoleGate'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, FileText, ArrowUpCircle, Layers } from 'lucide-react'

export default function BillingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    const navItems = [
        { name: 'Overview',             href: '/billing',         icon: CreditCard },
        { name: 'Asset Subscriptions',  href: '/billing/assets',  icon: Layers },
        { name: 'Invoice History',      href: '/billing/invoices',icon: FileText },
        { name: 'Plans & Upgrades',     href: '/billing/upgrade', icon: ArrowUpCircle },
    ]

    return (
        <RoleGate
            allowedRoles={['administrator', 'finance']}
            fallbackMessage="Billing and subscription details are restricted to designated Organization Administrators and Finance managers."
        >
            <div className="flex h-full flex-col lg:flex-row bg-slate-50">
                {/* Sidebar */}
                <aside className="w-full lg:w-60 shrink-0 border-r border-slate-200 bg-white lg:h-[calc(100vh-64px)] overflow-y-auto">
                    <div className="p-5">
                        <div className="flex items-center gap-3 mb-7">
                            <div className="h-9 w-9 flex-shrink-0 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                <CreditCard className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <h2 className="text-[13px] font-bold text-slate-900 leading-tight">Billing Center</h2>
                                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">Administration</p>
                            </div>
                        </div>

                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Manage</p>
                        <nav className="space-y-0.5 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/billing' && pathname.startsWith(item.href))
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group whitespace-nowrap lg:whitespace-normal
                                            ${isActive
                                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }
                                        `}
                                    >
                                        <item.icon
                                            className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'}`}
                                        />
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 min-w-0 overflow-y-auto w-full h-full p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </RoleGate>
    )
}
