'use client'

import { Card } from '@/components/ui/card'
import { Truck, UserCircle, Users2, Wifi, WifiOff } from 'lucide-react'

export function ClusterSummary({
    total,
    online,
    offline,
    totalStaff,
    manager,
}: {
    total: number
    online: number
    offline: number
    totalStaff: number
    manager: string | null
}) {
    const onlineRate = total > 0 ? (online / total) * 100 : 0
    const offlineRate = total > 0 ? (offline / total) * 100 : 0

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
                <Truck className="h-4 w-4 text-slate-400 mb-1.5" />
                <p className="text-xl font-black text-slate-900 tabular-nums">{total}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total Assets</p>
            </Card>
            <Card className="border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
                <Wifi className="h-4 w-4 text-emerald-500 mb-1.5" />
                <p className="text-xl font-black text-emerald-600 tabular-nums">{online}</p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">
                    Online ({onlineRate.toFixed(0)}%)
                </p>
            </Card>
            <Card className="border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
                <WifiOff className="h-4 w-4 text-blue-500 mb-1.5" />
                <p className="text-xl font-black text-blue-600 tabular-nums">{offline}</p>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">
                    Offline ({offlineRate.toFixed(0)}%)
                </p>
            </Card>
            <Card className="border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
                <Users2 className="h-4 w-4 text-slate-400 mb-1.5" />
                <p className="text-xl font-black text-slate-900 tabular-nums">{totalStaff}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total Staff</p>
            </Card>
            <Card className="border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
                <UserCircle className="h-4 w-4 text-slate-400 mb-1.5" />
                <p className="text-sm font-bold text-slate-900 truncate max-w-full mt-1">
                    {manager || <span className="text-slate-400 italic font-normal">Unassigned</span>}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Manager</p>
            </Card>
        </div>
    )
}
