'use client'

import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto flex flex-col">
                {children}
            </main>
        </div>
    )
}
