'use client'

import React from 'react'
import Sidebar from './Sidebar'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

export default function AppShell({ children }: { children: React.ReactNode }) {
    useRealtimeNotifications()

    return (
        <div className="flex h-screen w-full overflow-hidden bg-white">
            <Sidebar />
            <main className="flex-1 overflow-auto relative bg-slate-50 min-w-0">
                {children}
            </main>
        </div>
    )
}
