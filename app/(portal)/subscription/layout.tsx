'use client'

import React from 'react'
import { RoleGate } from '@/components/shared/RoleGate'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Receipt, Sparkles } from 'lucide-react'

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    const navItems = [
        { name: 'Overview', href: '/subscription', icon: LayoutDashboard },
        { name: 'Plan & Capacity', href: '/subscription/plan', icon: Sparkles },
        { name: 'Invoices', href: '/subscription/invoices', icon: FileText },
        { name: 'Payments', href: '/subscription/payments', icon: Receipt },
    ]

    return (
        <RoleGate
            allowedRoles={['administrator', 'finance']}
            fallbackMessage="Subscription and billing details are restricted to designated Organization Administrators and Finance managers."
        >
            <div className="min-h-full bg-slate-50">
                <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                    <div className="mb-5 flex flex-col gap-4 rounded-lg bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="px-1">
                            <h2 className="text-sm font-semibold text-slate-950">Subscription & Billing</h2>
                            <p className="text-xs text-slate-500">Plan, invoices, payments, and billable capacity</p>
                        </div>
                        <nav className="flex gap-1 overflow-x-auto">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/subscription' && pathname.startsWith(item.href))
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`group flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors
                                            ${isActive ? 'bg-[#0055FF] font-semibold text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}
                                        `}
                                    >
                                        <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                    <main>{children}</main>
                </div>
            </div>
        </RoleGate>
    )
}
