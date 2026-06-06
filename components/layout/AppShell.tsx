'use client'

import React from 'react'
import Sidebar from './Sidebar'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useAuthStore } from '@/store/authStore'
import { Sparkles } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
    useRealtimeNotifications()
    const user = useAuthStore((state) => state.user)

    return (
        <div className="flex h-screen w-full overflow-hidden bg-white">
            <Sidebar />
            <main className="flex-1 relative bg-slate-50 min-w-0 flex flex-col">
                <header className="h-16 shrink-0 border-b border-slate-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 flex items-center justify-between px-5 lg:px-8">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                            Live command center
                        </div>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
                            {user?.attributes?.full_name ? `Welcome back, ${user.attributes.full_name}` : 'Welcome back'}
                        </p>
                    </div>
                    <NotificationBell />
                </header>
                <div className="flex-1 overflow-auto relative">
                    {children}
                </div>
            </main>
        </div>
    )
}
