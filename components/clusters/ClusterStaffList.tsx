'use client'

import { UserCircle, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/types/user'

function roleLabel(role: UserProfile['attributes']['role']): string {
    const first = Array.isArray(role) ? role[0] : role
    if (!first) return 'Staff'
    return first.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ClusterStaffList({
    staff,
    managerName,
}: {
    staff: UserProfile[]
    managerName: string | null
}) {
    if (staff.length === 0) {
        return (
            <div className="py-16 text-center text-sm text-slate-400">
                No staff are currently assigned to this cluster.
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-slate-100 overflow-hidden bg-white divide-y divide-slate-100">
            {staff.map((user) => {
                const isManager = !!managerName && user.attributes.full_name === managerName
                return (
                    <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {user.attributes.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.attributes.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <UserCircle className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                {user.attributes.full_name}
                                {isManager && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                            </p>
                            <p className="text-[11px] text-slate-400">{user.attributes.email}</p>
                        </div>
                        <span
                            className={cn(
                                'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md shrink-0',
                                isManager ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500',
                            )}
                        >
                            {isManager ? 'Manager' : roleLabel(user.attributes.role)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
