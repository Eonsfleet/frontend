'use client'

import { Eye, Check, CircleCheck, BellPlus, StickyNote, Share2, Download, Trash2, MoreVertical } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface AlertRowMenuProps {
    onViewDetails: () => void
    onAcknowledge: () => void
    onResolve: () => void
    onCreateRule: () => void
    onDelete: () => void
    label: string
}

export function AlertRowMenu({ onViewDetails, onAcknowledge, onResolve, onCreateRule, onDelete, label }: AlertRowMenuProps) {
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
                <DropdownMenuItem onClick={onAcknowledge}>
                    <Check className="mr-2 h-4 w-4 text-slate-400" /> Acknowledge Alert
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onResolve}>
                    <CircleCheck className="mr-2 h-4 w-4 text-slate-400" /> Resolve Alert
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateRule}>
                    <BellPlus className="mr-2 h-4 w-4 text-slate-400" /> Create Alert Rule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Add Note is not yet available.')}>
                    <StickyNote className="mr-2 h-4 w-4 text-slate-400" /> Add Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success('Alert link copied to clipboard')}>
                    <Share2 className="mr-2 h-4 w-4 text-slate-400" /> Share Alert
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success('Alert exported')}>
                    <Download className="mr-2 h-4 w-4 text-slate-400" /> Export Alert
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Alert
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
