'use client'

import React, { useEffect } from 'react'
import { RoleGate } from '@/components/shared/RoleGate'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, Users, Shield, Key, Network, UserCircle, Activity, Bell, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { useAccessControl, TRIAL_EXPIRED_ALLOWED_PATHS } from '@/hooks/useAccessControl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'


export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { user } = useAuthStore()

    const { hasCapability } = useSubscription()
    const { isOwner, isExpiredTrial, isOwnerRestricted } = useAccessControl()

    const userRole = user?.attributes?.role
    const isAdmin = Array.isArray(userRole) ? userRole.includes('administrator') : userRole === 'administrator'

    // Redirect expired-trial users away from restricted settings sub-pages
    useEffect(() => {
        if (!isExpiredTrial) return
        const allowed = TRIAL_EXPIRED_ALLOWED_PATHS.some(
            p => pathname === p || pathname.startsWith(p + '/')
        )
        if (!allowed) {
            router.replace('/billing')
        }
    }, [isExpiredTrial, pathname, router])

    // Notify owner when they navigate directly to a restricted path
    useEffect(() => {
        if (isOwnerRestricted(pathname)) {
            toast.warning('Switch to a corporate account to access this feature.', {
                id: 'owner-restricted',
                duration: 5000,
            })
        }
    }, [pathname, isOwnerRestricted])

    const navItems = [
        { name: 'My Profile', href: '/profile', icon: UserCircle, show: true, ownerAllowed: true },
        { name: 'Organization', href: '/settings', icon: Building2, show: true, ownerAllowed: false },
        { name: 'User Management', href: '/settings/users', icon: Users, show: true, ownerAllowed: false },
        { name: 'Clusters (Groups)', href: '/settings/clusters', icon: Network, show: true, ownerAllowed: true },
        { name: 'Role Configurations', href: '/settings/roles', icon: Shield, show: isAdmin, capability: 'custom_roles', ownerAllowed: false },
        { name: 'Developer API Keys', href: '/settings/api-keys', icon: Key, show: isAdmin, ownerAllowed: false },
        { name: 'Notification Settings', href: '/settings/notifications', icon: Bell, show: isAdmin, ownerAllowed: false },
        { name: 'Webhooks', href: '/settings/webhooks', icon: Activity, show: true, ownerAllowed: false },
    ].filter(item => {
        if (!item.show) return false
        if (isOwner && !item.ownerAllowed) return false
        if (isExpiredTrial) return ['/profile', '/settings/clusters'].includes(item.href)
        return true
    })

    const ownerBlocked = isOwnerRestricted(pathname)

    return (
        <RoleGate
            allowedRoles={['administrator', 'fleet_manager', 'owner']}
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
                            {navItems.map((item) => {
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
                    {ownerBlocked ? (
                        <div className="flex h-[400px] items-center justify-center">
                            <Card className="w-full max-w-md shadow-sm border-slate-200">
                                <CardContent className="flex flex-col items-center justify-center pt-10 pb-8 px-8 text-center">
                                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50">
                                        <Building2 className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-2">Corporate Account Required</h2>
                                    <p className="text-slate-500 mb-8">
                                        This feature is only available on corporate accounts. Please switch to your
                                        corporate account to manage users, roles, webhooks, and organisation settings.
                                    </p>
                                    <Button className="w-full" onClick={() => router.push('/dashboard')}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ) : children}
                </main>
            </div>
        </RoleGate>
    )
}
