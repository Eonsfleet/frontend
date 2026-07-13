'use client'

import { Eye, Check, CircleCheck, ShieldOff, MoreVertical } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AlertStatus } from './useFuelAlerts'

interface AlertRowMenuProps {
    onViewDetails: () => void
    onAcknowledge: () => void
    onResolve: () => void
    /** Marks the alert as a false positive (kept as `onDelete` in callers). */
    onDelete: () => void
    onCreateRule?: () => void
    label: string
    status: AlertStatus
}

export function AlertRowMenu({ onViewDetails, onAcknowledge, onResolve, onDelete, label, status }: AlertRowMenuProps) {
    // The backend only allows these transitions on an active (new) alert (and resolve
    // on anything not already resolved) — gate the items so we don't fire a 422.
    const canAcknowledge = status === 'new'
    const canResolve = status !== 'resolved'
    const canFalsePositive = status === 'new'
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`Actions for ${label}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-600"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={onViewDetails}>
                    <Eye className="mr-2 h-4 w-4 text-slate-400" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAcknowledge} disabled={!canAcknowledge}>
                    <Check className="mr-2 h-4 w-4 text-slate-400" /> Acknowledge Alert
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onResolve} disabled={!canResolve}>
                    <CircleCheck className="mr-2 h-4 w-4 text-slate-400" /> Resolve Alert
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} disabled={!canFalsePositive} className="text-rose-600 focus:text-rose-600">
                    <ShieldOff className="mr-2 h-4 w-4" /> Mark as False Positive
                </DropdownMenuItem>
                {/* Delete Alert — commented out for now
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Alert
                </DropdownMenuItem>
                */}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
