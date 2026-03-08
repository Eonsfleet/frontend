'use client'

import React from 'react'
import { RoleGate } from '@/components/shared/RoleGate'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Shield, Key, Network, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'


export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { user } = useAuthStore()

    const { hasCapability } = useSubscription()
    const userRole = user?.attributes?.role
    const isAdmin = Array.isArray(userRole) ? userRole.includes('administrator') : userRole === 'administrator'


    const navItems = [
        { name: 'My Profile', href: '/profile', icon: UserCircle, show: true },
        { name: 'Organization', href: '/settings', icon: Building2, show: true },
        { name: 'User Management', href: '/settings/users', icon: Users, show: true },
        { name: 'Clusters (Groups)', href: '/settings/clusters', icon: Network, show: true },
        { name: 'Role Configurations', href: '/settings/roles', icon: Shield, show: isAdmin, capability: 'custom_roles' },
        { name: 'Developer API Keys', href: '/settings/api-keys', icon: Key, show: isAdmin },
    ]

    return (
        <RoleGate
            allowedRoles={['administrator', 'fleet_manager']}
            fallbackMessage="Organizational settings and user management are restricted to Fleet Managers and Administrators."
        >
            <div className="flex h-full flex-col lg:flex-row bg-slate-50">
                {/* Secondary Sidebar Navigation */}
                <aside className="w-full lg:w-[280px] shrink-0 border-r border-slate-200 bg-white shadow-[1px_0_2px_rgba(0,0,0,0.02)] h-auto lg:h-[calc(100vh-64px)] overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 flex-shrink-0 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center border border-slate-200">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 leading-tight">Settings</h2>
                                <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">Administration</p>
                            </div>
                        </div>

                        <nav className="space-y-1.5 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
                            {navItems.filter(i => i.show).map((item) => {
                                const isLocked = (item as any).capability && !hasCapability((item as any).capability)
                                const isActive = !isLocked && pathname === item.href

                                return (
                                    <Link
                                        key={item.name}
                                        href={isLocked ? '/billing' : item.href}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group whitespace-nowrap lg:whitespace-normal
                                            ${isActive
                                                ? 'bg-slate-100 text-slate-900 font-semibold shadow-sm border border-slate-200'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                                            }
                                            ${isLocked ? 'opacity-60 grayscale' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                            {item.name}
                                        </div>
                                        {isLocked && <Shield className="h-3 w-3 text-amber-600 animate-pulse" />}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Sub-module Content Area */}
                <main className="flex-1 min-w-0 overflow-y-auto w-full h-full p-6 lg:p-8 relative max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </RoleGate>
    )
}
