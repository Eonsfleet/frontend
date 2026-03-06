'use client'

import React from 'react'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-white">
            <Sidebar />
            <main className="flex-1 overflow-auto relative bg-slate-50 min-w-0">
                {children}
            </main>
        </div>
    )
}
