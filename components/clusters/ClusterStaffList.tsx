'use client'

import { UserCircle, Crown } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { UserProfile } from '@/types/user'

function roleLabel(role: UserProfile['attributes']['role']): string {
    const first = Array.isArray(role) ? role[0] : role
    if (!first) return 'Staff'
    return first.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function lastSeen(value: string | null): string {
    if (!value) return 'Never'
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy')
}

const HEAD = 'text-[10px] font-bold uppercase tracking-widest text-slate-400'

export function ClusterStaffList({
    staff,
    managerId,
}: {
    staff: UserProfile[]
    managerId: string | number | null | undefined
}) {
    if (staff.length === 0) {
        return (
            <div className="py-16 text-center text-sm text-slate-400">
                No staff are currently assigned to this cluster.
            </div>
        )
    }

    // Manager first, then the rest in the order the API returned them.
    const isManagerOf = (u: UserProfile) => managerId != null && String(u.id) === String(managerId)
    const sorted = [...staff].sort((a, b) => Number(isManagerOf(b)) - Number(isManagerOf(a)))

    return (
        <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
            <Table className="table-fixed min-w-[720px]">
                <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                        <TableHead className={cn(HEAD, 'w-[34%] pl-5')}>Staff</TableHead>
                        <TableHead className={cn(HEAD, 'w-[14%]')}>Role</TableHead>
                        <TableHead className={cn(HEAD, 'w-[18%]')}>Phone</TableHead>
                        <TableHead className={cn(HEAD, 'w-[12%]')}>Status</TableHead>
                        <TableHead className={cn(HEAD, 'w-[22%] pr-5 text-right')}>Last seen</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((user) => {
                        const isManager = isManagerOf(user)
                        const active = user.attributes.status?.toLowerCase() === 'active'
                        return (
                            <TableRow key={user.id}>
                                <TableCell className="pl-5 py-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                            {user.attributes.avatar ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={user.attributes.avatar} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <UserCircle className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <span className="truncate">{user.attributes.full_name}</span>
                                                {isManager && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate">{user.attributes.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={cn(
                                            'inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md whitespace-nowrap',
                                            isManager ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500',
                                        )}
                                    >
                                        {isManager ? 'Manager' : roleLabel(user.attributes.role)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                    {user.attributes.phone_number || '—'}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1.5 text-xs capitalize',
                                            active ? 'text-emerald-600' : 'text-slate-400',
                                        )}
                                    >
                                        <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-300')} />
                                        {user.attributes.status || '—'}
                                    </span>
                                </TableCell>
                                <TableCell className="pr-5 text-right text-xs text-slate-500 whitespace-nowrap">
                                    {lastSeen(user.attributes.last_login)}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
