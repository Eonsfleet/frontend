'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, format } from 'date-fns'
import Link from 'next/link'
import React from 'react'
import {
    Bell, BellOff, Building2, Car, Check,
    ChevronDown, ChevronRight, ChevronUp, Clock, DollarSign,
    EyeOff, Gauge, Loader2, Mail, Maximize2, Minimize2,
    Paperclip, Phone, Play, Repeat2, ShieldCheck, Trash2,
    User, Wrench, ClipboardList, FileText, ListChecks,
    Plus, ChevronsUpDown, X, GitBranch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
    Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { toast } from 'sonner'
import {
    getScheduleById, getScheduleChecklists, getMaintenances,
    toggleChecklistItem, assignVendorToSchedule,
    updateSchedule, deleteSchedule,
    addChecklistItemToSchedule, removeChecklistItemFromSchedule,
    startLog, completeLog, verifyLog, cancelLog,
    updateLogProgress,
    getLogParts, addLogPart, deleteLogPart, uploadLogAttachment,
    getMaintenanceAlerts, acknowledgeMaintenanceAlert,
    snoozeMaintenanceAlert, closeMaintenanceAlert,
} from '@/lib/api/maintenance'
import { getVendors } from '@/lib/api/vendors'
import { cn, extractApiError } from '@/lib/utils'
import type { MaintenanceSchedule, ScheduleChecklist } from '@/types'
import { MileageConfigDialog, MileageStateBadge, mileageIntervalText } from './MileageStatus'
import { formatDistance, kmToUnit, mileageStateLabel } from '@/lib/odometer'

// ── Status / priority config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string }> = {
    upcoming:    { label: 'Upcoming',    color: 'text-blue-600 bg-blue-50',        border: 'border-l-blue-400'    },
    pending:     { label: 'Pending',     color: 'text-amber-600 bg-amber-50',      border: 'border-l-amber-400'   },
    active:      { label: 'Active',      color: 'text-indigo-600 bg-indigo-50',    border: 'border-l-indigo-400'  },
    overdue:     { label: 'Overdue',     color: 'text-rose-600 bg-rose-50',        border: 'border-l-rose-500'    },
    completed:   { label: 'Completed',   color: 'text-emerald-600 bg-emerald-50',  border: 'border-l-emerald-400' },
    verified:    { label: 'Verified',    color: 'text-violet-600 bg-violet-50',    border: 'border-l-violet-400'  },
    in_progress: { label: 'In Progress', color: 'text-amber-700 bg-amber-50',      border: 'border-l-amber-500'   },
    cancelled:   { label: 'Cancelled',   color: 'text-slate-500 bg-slate-100',     border: 'border-l-slate-300'   },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low:      { label: 'Low',      color: 'text-slate-500 bg-slate-100'       },
    normal:   { label: 'Normal',   color: 'text-sky-600 bg-sky-50'            },
    medium:   { label: 'Medium',   color: 'text-amber-600 bg-amber-50'        },
    high:     { label: 'High',     color: 'text-orange-600 bg-orange-50'      },
    critical: { label: 'Critical', color: 'text-rose-700 bg-rose-50'          },
}

const LOG_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    pending:     { label: 'Pending',     color: 'text-slate-600 bg-slate-50 border border-slate-200',      dot: 'bg-slate-400'    },
    in_progress: { label: 'In Progress', color: 'text-amber-700 bg-amber-50 border border-amber-200',      dot: 'bg-amber-500'    },
    completed:   { label: 'Completed',   color: 'text-emerald-700 bg-emerald-50 border border-emerald-200',dot: 'bg-emerald-500'  },
    verified:    { label: 'Verified',    color: 'text-violet-700 bg-violet-50 border border-violet-200',   dot: 'bg-violet-500'   },
    cancelled:   { label: 'Cancelled',   color: 'text-slate-500 bg-slate-100 border border-slate-200',     dot: 'bg-slate-300'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn('text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3', className)}>
            {children}
        </p>
    )
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <div className="text-xs font-bold text-slate-900">{children}</div>
        </div>
    )
}

function DueDateChip({ dueDate }: { dueDate: string }) {
    const days = differenceInDays(new Date(dueDate), new Date())
    const { text, color } =
        days < 0  ? { text: `${Math.abs(days)}d overdue`, color: 'bg-rose-50 text-rose-600' } :
        days === 0 ? { text: 'Due today',                  color: 'bg-amber-50 text-amber-600' } :
        days <= 7  ? { text: `${days}d left`,              color: 'bg-amber-50 text-amber-600' } :
                     { text: `${days}d left`,              color: 'bg-blue-50 text-blue-600' }
    return (
        <span className={cn('inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest', color)}>
            {text}
        </span>
    )
}

function LoadingSkeleton() {
    return (
        <div className="flex flex-col lg:flex-row flex-1">
            <div className="flex-1 min-w-0 px-6 py-5 space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
            </div>
            <div className="lg:w-64 border-l border-slate-100 px-5 py-5 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-xl" />
                ))}
            </div>
        </div>
    )
}

// ── Checklist row with delete ─────────────────────────────────────────────────

function ChecklistRowWithDelete({
    item, onToggle, onRemove, isToggling,
}: {
    item: ScheduleChecklist
    onToggle: (pivotId: string, completed: boolean) => void
    onRemove: (pivotId: string) => void
    isToggling: boolean
}) {
    const [hovered, setHovered] = React.useState(false)
    const isDone = item.attributes.status === 'completed'
    return (
        <div
            className="group grid grid-cols-[1fr_auto_auto_auto_auto] px-4 py-2.5 gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors items-center"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <button type="button" disabled={isToggling}
                onClick={() => onToggle(String(item.id), !isDone)}
                className="flex items-center gap-2.5 min-w-0 text-left disabled:opacity-60">
                <div className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white hover:border-emerald-400'
                )}>
                    {isDone && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <span className={cn(
                    'text-xs font-bold truncate transition-colors',
                    isDone ? 'line-through text-slate-400' : 'text-slate-900'
                )}>
                    {item.attributes.name}
                </span>
            </button>
            <div className="w-8 flex justify-center">
                <span className="text-[9px] font-black text-slate-400 uppercase">M</span>
            </div>
            <div className="w-7 flex justify-center">
                <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-3 w-3 text-slate-400" />
                </div>
            </div>
            <div className="w-14 flex justify-end">
                <span className={cn(
                    'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md',
                    isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                )}>
                    {isDone ? 'Done' : 'To Do'}
                </span>
            </div>
            <div className="w-5 flex justify-center">
                <button
                    type="button"
                    onClick={() => onRemove(String(item.id))}
                    className={cn(
                        'h-5 w-5 flex items-center justify-center rounded transition-all',
                        hovered ? 'opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50' : 'opacity-0'
                    )}
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        </div>
    )
}

// ── Alert status config (for alerts tab) ─────────────────────────────────────

const ALERT_STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
    triggered:          { label: 'Triggered',    color: 'text-amber-700 bg-amber-50 border border-amber-200',   dot: 'bg-amber-500'    },
    overdue:            { label: 'Overdue',      color: 'text-rose-700 bg-rose-50 border border-rose-200',      dot: 'bg-rose-500'     },
    acknowledged:       { label: 'Acknowledged', color: 'text-blue-700 bg-blue-50 border border-blue-200',      dot: 'bg-blue-500'     },
    snoozed:            { label: 'Snoozed',      color: 'text-slate-600 bg-slate-100 border border-slate-200',  dot: 'bg-slate-400'    },
    work_order_created: { label: 'Work Order',   color: 'text-indigo-700 bg-indigo-50 border border-indigo-200',dot: 'bg-indigo-500'   },
    closed:             { label: 'Closed',       color: 'text-emerald-700 bg-emerald-50 border border-emerald-200', dot: 'bg-emerald-500' },
}

// ── LogCard ───────────────────────────────────────────────────────────────────

function LogCard({ log, scheduleId, queryClient }: { log: any; scheduleId: string; queryClient: any }) {
    const [expanded, setExpanded]       = React.useState(false)
    const [cancelNote, setCancelNote]   = React.useState('')
    const [showCancel, setShowCancel]   = React.useState(false)
    const [progressVal, setProgressVal] = React.useState<number>(log.attributes?.progress ?? 0)
    const [showProgress, setShowProgress] = React.useState(false)
    const [partName, setPartName]       = React.useState('')
    const [partQty, setPartQty]         = React.useState(1)
    const [partPrice, setPartPrice]     = React.useState('')
    const [showAddPart, setShowAddPart] = React.useState(false)

    const status    = (log.attributes?.status ?? 'pending').toLowerCase()
    const logCfg    = LOG_STATUS_CONFIG[status] ?? LOG_STATUS_CONFIG.pending
    const ticketRef = log.attributes?.ticket_number ?? `LOG-${String(log.id).padStart(4, '0')}`
    const vendorName = log.relationships?.vendor?.attributes?.business_name
        ?? log.relationships?.vendor?.name
        ?? null

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['schedule-detail', scheduleId] })
    }

    const startMut    = useMutation({ mutationFn: () => startLog(log.id),    onSuccess: () => { toast.success('Log started');    invalidate() }, onError: () => toast.error('Failed to start log') })
    const completeMut = useMutation({ mutationFn: () => completeLog(log.id), onSuccess: () => { toast.success('Log completed'); invalidate() }, onError: () => toast.error('Failed to complete') })
    const verifyMut   = useMutation({ mutationFn: () => verifyLog(log.id),   onSuccess: () => { toast.success('Log verified');  invalidate() }, onError: () => toast.error('Failed to verify') })
    const cancelMut   = useMutation({
        mutationFn: () => cancelLog(log.id, cancelNote || 'No reason provided'),
        onSuccess: () => { toast.success('Log cancelled'); setShowCancel(false); setCancelNote(''); invalidate() },
        onError: () => toast.error('Failed to cancel'),
    })
    const progressMut = useMutation({
        mutationFn: () => updateLogProgress(log.id, { progress: progressVal }),
        onSuccess: () => { toast.success('Progress updated'); setShowProgress(false); invalidate() },
        onError: () => toast.error('Failed to update progress'),
    })

    // Parts
    const partsQ = useQuery({ queryKey: ['log-parts', log.id], queryFn: () => getLogParts(log.id), enabled: expanded })
    const parts: any[] = (partsQ.data as any)?.data?.parts ?? []
    const totalKobo = parts.reduce((s: number, p: any) => s + p.attributes.quantity * p.attributes.unit_price_kobo, 0)

    const addPartMut = useMutation({
        mutationFn: () => addLogPart(log.id, {
            name: partName, quantity: partQty,
            unit_price_kobo: Math.round(parseFloat(partPrice || '0') * 100),
        }),
        onSuccess: () => {
            toast.success('Part added')
            setPartName(''); setPartQty(1); setPartPrice(''); setShowAddPart(false)
            queryClient.invalidateQueries({ queryKey: ['log-parts', log.id] })
        },
        onError: () => toast.error('Failed to add part'),
    })
    const delPartMut = useMutation({
        mutationFn: (partId: string | number) => deleteLogPart(log.id, partId),
        onSuccess: () => { toast.success('Part removed'); queryClient.invalidateQueries({ queryKey: ['log-parts', log.id] }) },
        onError: () => toast.error('Failed to remove part'),
    })

    // Attachments
    const attachRef = React.useRef<HTMLInputElement>(null)
    const attachMut = useMutation({
        mutationFn: (file: File) => { const fd = new FormData(); fd.append('file', file); return uploadLogAttachment(log.id, fd) },
        onSuccess: () => { toast.success('Attachment uploaded'); invalidate() },
        onError: () => toast.error('Upload failed'),
    })
    const attachments: string[] = log.attributes?.attachments ?? []

    const isActing = startMut.isPending || completeMut.isPending || verifyMut.isPending || cancelMut.isPending

    return (
        <div className="rounded-xl border border-slate-100 overflow-hidden">
            {/* Log header row */}
            <div className="px-4 py-3 flex items-center gap-3 bg-white hover:bg-slate-50/60 transition-colors">
                <div className={cn('h-2 w-2 rounded-full shrink-0', logCfg.dot)} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 font-mono">{ticketRef}</span>
                        <span className={cn('text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md', logCfg.color)}>
                            {logCfg.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {vendorName && (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Building2 className="h-2.5 w-2.5" />{vendorName}
                            </span>
                        )}
                        {log.attributes?.due_date && (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                Due {format(new Date(log.attributes.due_date), 'dd MMM yyyy')}
                            </span>
                        )}
                        {log.attributes?.progress != null && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${log.attributes.progress}%` }} />
                                </div>
                                <span className="text-[9px] font-black text-slate-400">{log.attributes.progress}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {status === 'pending' && !vendorName && (
                        <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase tracking-widest px-2.5 border-slate-200">
                            <User className="mr-1 h-3 w-3" />Assign
                        </Button>
                    )}
                    {status === 'pending' && vendorName && (
                        <Button size="sm" variant="default" onClick={() => startMut.mutate()} disabled={isActing}
                            className="h-7 text-[9px] font-black uppercase tracking-widest px-2.5 bg-blue-600 hover:bg-blue-700">
                            {startMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}Start
                        </Button>
                    )}
                    {status === 'in_progress' && (
                        <>
                            <Button size="sm" variant="default" onClick={() => completeMut.mutate()} disabled={isActing}
                                className="h-7 text-[9px] font-black uppercase tracking-widest px-2.5 bg-emerald-600 hover:bg-emerald-700">
                                {completeMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowProgress(p => !p)} disabled={isActing}
                                className="h-7 text-[9px] font-black uppercase tracking-widest px-2.5 border-slate-200">
                                Progress
                            </Button>
                        </>
                    )}
                    {status === 'completed' && (
                        <Button size="sm" variant="default" onClick={() => verifyMut.mutate()} disabled={isActing}
                            className="h-7 text-[9px] font-black uppercase tracking-widest px-2.5 bg-violet-600 hover:bg-violet-700">
                            {verifyMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-1 h-3 w-3" />}Verify
                        </Button>
                    )}
                    {['in_progress', 'completed'].includes(status) && (
                        <Button size="sm" variant="ghost" onClick={() => setShowCancel(p => !p)} disabled={isActing}
                            className="h-7 text-[9px] font-black uppercase tracking-widest px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                <button onClick={() => setExpanded(p => !p)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors shrink-0">
                    {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                </button>
            </div>

            {/* Cancel inline */}
            {showCancel && (
                <div className="px-4 py-3 border-t border-rose-50 bg-rose-50/50 space-y-2">
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Cancellation reason</p>
                    <Textarea
                        value={cancelNote}
                        onChange={e => setCancelNote(e.target.value)}
                        placeholder="Why is this log being cancelled?"
                        className="resize-none h-16 text-xs border-rose-200 focus-visible:ring-rose-300"
                    />
                    <div className="flex gap-2">
                        <Button size="sm" variant="destructive" disabled={cancelMut.isPending || !cancelNote.trim()}
                            onClick={() => cancelMut.mutate()} className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                            {cancelMut.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}Confirm Cancel
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCancel(false)} className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                            Dismiss
                        </Button>
                    </div>
                </div>
            )}

            {/* Progress inline */}
            {showProgress && (
                <div className="px-4 py-3 border-t border-blue-50 bg-blue-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Update progress</p>
                        <span className="text-lg font-black text-slate-800">{progressVal}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={5} value={progressVal}
                        onChange={e => setProgressVal(Number(e.target.value))}
                        className="w-full accent-blue-600" />
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progressVal}%` }} />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="default" disabled={progressMut.isPending}
                            onClick={() => progressMut.mutate()} className="h-7 text-[9px] font-black uppercase tracking-widest px-3 bg-blue-600 hover:bg-blue-700">
                            {progressMut.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowProgress(false)} className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Expanded: parts + attachments */}
            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 space-y-5">

                    {/* ── Parts ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Parts Used</p>
                            {['pending', 'in_progress'].includes(status) && (
                                <Button size="sm" variant="outline" onClick={() => setShowAddPart(p => !p)}
                                    className="h-6 px-2 text-[9px] font-black uppercase tracking-widest border-slate-200">
                                    <Plus className="mr-1 h-2.5 w-2.5" />Add
                                </Button>
                            )}
                        </div>

                        {/* Add part form */}
                        {showAddPart && (
                            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                                <input
                                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="Part name *"
                                    value={partName}
                                    onChange={e => setPartName(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" min={1} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        placeholder="Qty" value={partQty} onChange={e => setPartQty(Number(e.target.value))} />
                                    <input type="number" min={0} step="0.01" className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        placeholder="Unit price (₦)" value={partPrice} onChange={e => setPartPrice(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="default" disabled={addPartMut.isPending || !partName.trim() || partQty < 1 || !partPrice}
                                        onClick={() => addPartMut.mutate()} className="h-6 px-3 text-[9px] font-black uppercase tracking-widest">
                                        {addPartMut.isPending ? <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" /> : null}Add
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowAddPart(false)} className="h-6 px-2 text-[9px] font-black uppercase tracking-widest">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {partsQ.isLoading ? (
                            <Skeleton className="h-12 rounded-xl" />
                        ) : parts.length > 0 ? (
                            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="text-left px-3 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Part</th>
                                            <th className="text-right px-3 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Qty</th>
                                            <th className="text-right px-3 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Unit ₦</th>
                                            <th className="text-right px-3 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Subtotal</th>
                                            {['pending', 'in_progress'].includes(status) && <th className="w-8" />}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {parts.map((p: any) => {
                                            const unit = p.attributes.unit_price_kobo / 100
                                            const sub  = p.attributes.quantity * unit
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-50/50">
                                                    <td className="px-3 py-2 font-bold text-slate-800">{p.attributes.name}</td>
                                                    <td className="px-3 py-2 text-right text-slate-500">{p.attributes.quantity}</td>
                                                    <td className="px-3 py-2 text-right text-slate-500">₦{unit.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-right font-black text-slate-900">₦{sub.toLocaleString()}</td>
                                                    {['pending', 'in_progress'].includes(status) && (
                                                        <td className="px-2 py-2 text-right">
                                                            <button onClick={() => delPartMut.mutate(p.id)}
                                                                className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-slate-200 bg-slate-50">
                                            <td colSpan={3} className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</td>
                                            <td className="px-3 py-2 text-right font-black text-slate-900">₦{(totalKobo / 100).toLocaleString()}</td>
                                            {['pending', 'in_progress'].includes(status) && <td />}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-3">
                                No parts recorded
                            </p>
                        )}
                    </div>

                    {/* ── Attachments ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attachments</p>
                            {['in_progress', 'completed'].includes(status) && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => attachRef.current?.click()} disabled={attachMut.isPending}
                                        className="h-6 px-2 text-[9px] font-black uppercase tracking-widest border-slate-200">
                                        {attachMut.isPending ? <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" /> : <Paperclip className="mr-1 h-2.5 w-2.5" />}Attach
                                    </Button>
                                    <input ref={attachRef} type="file" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) attachMut.mutate(f); e.target.value = '' }} />
                                </>
                            )}
                        </div>
                        {attachments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 font-bold transition-colors">
                                        <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                        File {i + 1}
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-3">
                                No attachments yet
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── AlertsTab ─────────────────────────────────────────────────────────────────

function AlertsTab({ vehicleId }: { vehicleId: string | null }) {
    const queryClient = useQueryClient()

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['vehicle-alerts', vehicleId],
        queryFn: () => getMaintenanceAlerts({ vehicle_id: vehicleId! }),
        enabled: !!vehicleId,
    })

    const alerts: any[] = (data as any)?.data?.alerts ?? (data as any)?.data ?? []

    const ackMut = useMutation({
        mutationFn: (id: string) => acknowledgeMaintenanceAlert(id),
        onSuccess: () => { toast.success('Alert acknowledged'); queryClient.invalidateQueries({ queryKey: ['vehicle-alerts', vehicleId] }) },
        onError: () => toast.error('Failed to acknowledge'),
    })
    const snoozeMut = useMutation({
        mutationFn: (id: string) => snoozeMaintenanceAlert(id, { snooze_days: 7 }),
        onSuccess: () => { toast.success('Snoozed for 7 days'); queryClient.invalidateQueries({ queryKey: ['vehicle-alerts', vehicleId] }) },
        onError: () => toast.error('Failed to snooze'),
    })
    const closeMut = useMutation({
        mutationFn: (id: string) => closeMaintenanceAlert(id),
        onSuccess: () => { toast.success('Alert closed'); queryClient.invalidateQueries({ queryKey: ['vehicle-alerts', vehicleId] }) },
        onError: () => toast.error('Failed to close'),
    })

    if (!vehicleId) {
        return (
            <div className="flex flex-col items-center py-12 gap-2">
                <BellOff className="h-7 w-7 text-slate-200" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No vehicle linked</p>
            </div>
        )
    }

    if (isLoading) {
        return <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
    }

    if (alerts.length === 0) {
        return (
            <div className="flex flex-col items-center py-12 gap-2">
                <Bell className="h-7 w-7 text-slate-200" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No alerts for this vehicle</p>
                <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-6 mt-1">
                    Refresh
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-2 p-4">
            {alerts.map((alert: any) => {
                const alertStatus = (alert.attributes?.status ?? 'triggered').toLowerCase()
                const alertCfg = ALERT_STATUS_CFG[alertStatus] ?? ALERT_STATUS_CFG.triggered
                const alertType = (alert.attributes?.alert_type ?? 'Maintenance Alert')
                    .replace(/_/g, ' ')
                const triggeredDate = alert.attributes?.triggered_at ?? alert.attributes?.created_at
                const isActionable = ['triggered', 'overdue'].includes(alertStatus)

                return (
                    <div key={alert.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/60 transition-colors">
                        <div className={cn('h-2 w-2 rounded-full shrink-0', alertCfg.dot)} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate capitalize">{alertType}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className={cn('text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md', alertCfg.color)}>
                                    {alertCfg.label}
                                </span>
                                {triggeredDate && (
                                    <span className="text-[9px] font-bold text-slate-400">
                                        {format(new Date(triggeredDate), 'dd MMM yyyy')}
                                    </span>
                                )}
                            </div>
                        </div>
                        {isActionable && (
                            <div className="flex items-center gap-1 shrink-0">
                                {alertStatus !== 'acknowledged' && (
                                    <Button size="sm" variant="outline" disabled={ackMut.isPending}
                                        onClick={() => ackMut.mutate(String(alert.id))}
                                        className="h-6 px-2 text-[8px] font-black uppercase tracking-widest border-slate-200">
                                        {ackMut.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Ack'}
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" disabled={snoozeMut.isPending}
                                    onClick={() => snoozeMut.mutate(String(alert.id))}
                                    className="h-6 px-2 text-[8px] font-black uppercase tracking-widest border-slate-200">
                                    {snoozeMut.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <EyeOff className="h-2.5 w-2.5" />}
                                </Button>
                                <Button size="sm" variant="ghost" disabled={closeMut.isPending}
                                    onClick={() => closeMut.mutate(String(alert.id))}
                                    className="h-6 px-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                                    {closeMut.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
                                </Button>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ── ActivityTabs ──────────────────────────────────────────────────────────────

function ActivityTabs({
    scheduleId, logs, vehicleId, queryClient,
}: {
    scheduleId: string
    logs: any[]
    vehicleId: string | null
    queryClient: any
}) {
    return (
        <div className="border-t border-slate-100 bg-white">
            <Tabs defaultValue="logs">
                {/* Tab bar */}
                <div className="px-6 border-b border-slate-100">
                    <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none">
                        {[
                            { value: 'logs',   label: 'Work Logs',    count: logs.length },
                            { value: 'alerts', label: 'Alerts',       count: null },
                        ].map(tab => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 text-slate-400 px-4 pb-3 pt-3 text-[10px] font-black uppercase tracking-widest bg-transparent shadow-none hover:text-slate-700 transition-colors"
                            >
                                {tab.label}
                                {tab.count != null && tab.count > 0 && (
                                    <span className="ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                        {tab.count}
                                    </span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {/* Work Logs tab */}
                <TabsContent value="logs" className="mt-0 p-4 space-y-3">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center py-12 gap-2">
                            <Wrench className="h-7 w-7 text-slate-200" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No work logs yet</p>
                        </div>
                    ) : (
                        logs.map((log: any) => (
                            <LogCard key={log.id} log={log} scheduleId={scheduleId} queryClient={queryClient} />
                        ))
                    )}
                </TabsContent>

                {/* Alerts tab */}
                <TabsContent value="alerts" className="mt-0">
                    <AlertsTab vehicleId={vehicleId} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScheduleDetailContentProps {
    scheduleId: string | null
    mode?: 'drawer' | 'page'
    isFullWidth?: boolean
    onExpandFull?: () => void
    onCollapse?: () => void
    onClose?: () => void
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScheduleDetailContent({
    scheduleId, mode = 'drawer',
    isFullWidth = false, onExpandFull, onCollapse,
}: ScheduleDetailContentProps) {
    const queryClient = useQueryClient()
    const [mileageOpen, setMileageOpen] = React.useState(false)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['schedule-detail', scheduleId],
        queryFn: () => getScheduleById(scheduleId!),
        enabled: !!scheduleId,
    })

    const { data: checklistsData } = useQuery({
        queryKey: ['schedule-checklists', scheduleId],
        queryFn: () => getScheduleChecklists(scheduleId!),
        enabled: !!scheduleId,
    })

    // Series siblings — only fetched when schedule is recurring and has a series_id
    const seriesId = (data as any)?.data?.schedule?.attributes?.series_id
        ?? (data as any)?.data?.attributes?.series_id
        ?? null
    const { data: seriesData } = useQuery({
        queryKey: ['schedule-series', seriesId],
        queryFn: () => getMaintenances({ series_id: seriesId!, per_page: 50 }),
        enabled: !!seriesId,
        staleTime: 30_000,
    })
    const seriesSiblings: any[] = (seriesData as any)?.data?.schedules ?? []

    const { mutate: toggleItem, isPending: isToggling } = useMutation({
        mutationFn: ({ pivotId, completed }: { pivotId: string; completed: boolean }) =>
            toggleChecklistItem(scheduleId!, pivotId, completed),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-checklists', scheduleId] })
            queryClient.invalidateQueries({ queryKey: ['schedule-detail', scheduleId] })
        },
    })

    // Vendor assignment
    const [vendorPopoverOpen, setVendorPopoverOpen] = React.useState(false)
    const [vendorSearch, setVendorSearch] = React.useState('')

    const { data: vendorsData } = useQuery({
        queryKey: ['vendors-lite'],
        queryFn: () => getVendors(),
        enabled: vendorPopoverOpen,
        staleTime: 60_000,
    })

    const { mutate: assignVendor, isPending: isAssigning } = useMutation({
        mutationFn: (vendorId: number | string) =>
            assignVendorToSchedule(scheduleId!, { vendor_id: Number(vendorId) }),
        onMutate: async (vendorId) => {
            await queryClient.cancelQueries({ queryKey: ['schedule-detail', scheduleId] })
            const prev = queryClient.getQueryData(['schedule-detail', scheduleId])
            const selectedVendor = (vendorsData?.data ?? []).find((v: any) => String(v.id) === String(vendorId))
            if (selectedVendor) {
                queryClient.setQueryData(['schedule-detail', scheduleId], (old: any) => {
                    if (!old) return old
                    const sched = old.data?.schedule ?? old.data
                    return {
                        ...old,
                        data: {
                            ...old.data,
                            schedule: {
                                ...sched,
                                relationships: {
                                    ...sched.relationships,
                                    vendor: {
                                        id: selectedVendor.id,
                                        name: selectedVendor.attributes.business_name,
                                        email: selectedVendor.relationships?.user?.email ?? (selectedVendor.attributes as any)?.email ?? null,
                                        phone: (selectedVendor.attributes as any)?.phone ?? null,
                                    },
                                },
                            },
                        },
                    }
                })
            }
            return { prev }
        },
        onSuccess: () => {
            toast.success('Vendor assigned successfully')
            setVendorPopoverOpen(false)
            setVendorSearch('')
        },
        onError: (err: unknown, _vars, context) => {
            if (context?.prev) queryClient.setQueryData(['schedule-detail', scheduleId], context.prev)
            toast.error(extractApiError(err, 'Failed to assign vendor'))
        },
    })

    // Inline edit state
    const [editingField, setEditingField] = React.useState<string | null>(null)
    const [editValue, setEditValue]       = React.useState<string>('')
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
    const [addingChecklist, setAddingChecklist]     = React.useState(false)
    const [newChecklistName, setNewChecklistName]   = React.useState('')

    const startEdit = (field: string, current: string) => {
        setEditingField(field)
        setEditValue(current)
    }
    const cancelEdit = () => { setEditingField(null); setEditValue('') }

    const patchScheduleCache = (patch: Record<string, unknown>) => {
        queryClient.setQueryData(['schedule-detail', scheduleId], (old: any) => {
            if (!old) return old
            const sched = old.data?.schedule ?? old.data
            return {
                ...old,
                data: {
                    ...old.data,
                    schedule: {
                        ...sched,
                        attributes: { ...sched.attributes, ...patch },
                    },
                },
            }
        })
    }

    const { mutate: saveField, isPending: isSavingField } = useMutation({
        mutationFn: (patch: Record<string, unknown>) => updateSchedule(scheduleId!, patch),
        onMutate: async (patch) => {
            await queryClient.cancelQueries({ queryKey: ['schedule-detail', scheduleId] })
            const prev = queryClient.getQueryData(['schedule-detail', scheduleId])
            patchScheduleCache(patch)
            return { prev }
        },
        onSuccess: (_data, patch) => {
            // Don't toast for silent toggle (notification)
            if (!('turn_on_notification' in patch)) toast.success('Saved')
            setEditingField(null)
            setEditValue('')
        },
        onError: (_err, _patch, context) => {
            if (context?.prev) queryClient.setQueryData(['schedule-detail', scheduleId], context.prev)
            toast.error('Failed to save')
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-detail', scheduleId] })
        },
    })

    const { mutate: cancelSchedule, isPending: isCancelling } = useMutation({
        mutationFn: () => updateSchedule(scheduleId!, { status: 'cancelled' }),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['schedule-detail', scheduleId] })
            const prev = queryClient.getQueryData(['schedule-detail', scheduleId])
            patchScheduleCache({ status: 'cancelled' })
            return { prev }
        },
        onSuccess: () => { toast.success('Schedule cancelled') },
        onError: (_err, _vars, context) => {
            if (context?.prev) queryClient.setQueryData(['schedule-detail', scheduleId], context.prev)
            toast.error('Failed to cancel schedule')
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-detail', scheduleId] })
        },
    })

    const { mutate: deleteScheduleMut, isPending: isDeleting } = useMutation({
        mutationFn: () => deleteSchedule(scheduleId!),
        onSuccess: () => toast.success('Schedule deleted'),
        onError: () => toast.error('Failed to delete schedule'),
    })

    const { mutate: addChecklistItem, isPending: isAddingChecklist } = useMutation({
        mutationFn: () => addChecklistItemToSchedule(scheduleId!, { name: newChecklistName.trim() }),
        onSuccess: () => {
            toast.success('Item added')
            setNewChecklistName('')
            setAddingChecklist(false)
            queryClient.invalidateQueries({ queryKey: ['schedule-checklists', scheduleId] })
        },
        onError: () => toast.error('Failed to add item'),
    })

    const { mutate: removeChecklistItem } = useMutation({
        mutationFn: (pivotId: string) => removeChecklistItemFromSchedule(scheduleId!, pivotId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule-checklists', scheduleId] }),
        onError: () => toast.error('Failed to remove item'),
    })

    // Normalise API shape — handles both { data: { schedule } } and { data: { id, attributes } }
    const rawData = (data as any)?.data
    const schedule: MaintenanceSchedule | null =
        rawData?.attributes       ? rawData          :
        rawData?.schedule?.attributes ? rawData.schedule :
        null

    const status = schedule?.attributes?.status ?? 'pending'
    const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
    const priority = schedule?.attributes?.priority ?? 'normal'
    const priorityCfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal

    // Checklists — prefer dedicated endpoint, fall back to main response
    const checklists: ScheduleChecklist[] = (
        checklistsData?.data?.checklists ??
        (schedule?.relationships?.checklists as ScheduleChecklist[]) ??
        []
    )
    const completedCount = checklists.filter(c => c.attributes.status === 'completed').length
    const pct = checklists.length > 0 ? Math.round((completedCount / checklists.length) * 100) : 0

    const logs: any[] = (schedule?.relationships?.logs as any[]) ?? []

    // Derived metadata
    const vehicle = schedule?.relationships?.vehicle as any
    const vendor = schedule?.relationships?.vendor as any
    const assignedBy = schedule?.relationships?.assigned_by as any
    const serviceType = schedule?.attributes?.service_type ?? ''
    const scheduleType = schedule?.attributes?.schedule_type ?? ''
    const mileage = schedule?.attributes?.mileage ?? null
    // A mileage schedule with no baseline, no target or a disputed baseline has no trustworthy odometer figures to show.
    const mileageActive = !mileage || mileage.state === 'active'
    const intervalValue = schedule?.attributes?.interval_value
    const intervalUnit = schedule?.attributes?.interval_unit
    const dueDate = schedule?.attributes?.due_date
    const nextDueDate = schedule?.attributes?.next_due_date
    const description = schedule?.attributes?.description
    const notes = schedule?.attributes?.notes
    const reference = schedule?.attributes?.reference

    const rawCost = schedule?.attributes?.estimated_cost
        ?? (schedule?.attributes?.estimated_cost_kobo ? schedule.attributes.estimated_cost_kobo / 100 : null)
    const formattedCost = rawCost != null ? `₦${Number(rawCost).toLocaleString()}` : null

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={cn('flex flex-col h-full', mode === 'page' && 'min-h-screen bg-white')}>
            {mileage && scheduleId != null && (
                <MileageConfigDialog
                    scheduleId={scheduleId}
                    mileage={mileage}
                    open={mileageOpen}
                    onOpenChange={setMileageOpen}
                />
            )}

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className={cn(
                'px-6 py-4 border-b border-slate-100 shrink-0 border-l-4',
                statusCfg.border
            )}>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 mb-2">
                    {reference && (
                        <>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {reference}
                            </span>
                            <ChevronRight className="h-3 w-3 text-slate-300" />
                        </>
                    )}
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                        Schedule Detail
                    </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                        {isLoading ? (
                            <>
                                <Skeleton className="h-6 w-64" />
                                <Skeleton className="h-3 w-40" />
                            </>
                        ) : (
                            <>
                                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-tight">
                                    {serviceType || 'Maintenance Schedule'}
                                </h2>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {vehicle?.make && (
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {vehicle.make} {vehicle.model} · {vehicle.registration_number}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Status badge */}
                    {!isLoading && (
                        <span className={cn(
                            'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                            statusCfg.color
                        )}>
                            {statusCfg.label}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {isLoading ? (
                    <LoadingSkeleton />
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <p className="text-sm font-bold text-rose-500">Failed to load schedule details.</p>
                        <Button size="sm" variant="outline" onClick={() => refetch()}
                            className="text-[10px] font-black uppercase tracking-widest">
                            Retry
                        </Button>
                    </div>
                ) : schedule ? (
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                        {/* ════════════ LEFT — independent scroll ══════ */}
                        <div className="flex-1 min-w-0 overflow-y-auto divide-y divide-slate-100">

                            {/* ── Description — inline editable ── */}
                            <div className="group px-6 py-5">
                                <div className="flex items-center justify-between mb-2">
                                    <SectionLabel className="mb-0">Description</SectionLabel>
                                    {editingField !== 'description' && (
                                        <button
                                            onClick={() => startEdit('description', description ?? '')}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                                {editingField === 'description' ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            autoFocus
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                                            className="resize-none text-sm min-h-[80px] border-slate-200 focus-visible:ring-blue-400"
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" disabled={isSavingField}
                                                onClick={() => saveField({ description: editValue })}
                                                className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                                                {isSavingField ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={cancelEdit}
                                                className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : description ? (
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap cursor-text"
                                        onClick={() => startEdit('description', description)}>
                                        {description}
                                    </p>
                                ) : (
                                    <button onClick={() => startEdit('description', '')}
                                        className="text-[10px] font-bold text-slate-300 hover:text-slate-500 transition-colors uppercase tracking-widest">
                                        + Add description
                                    </button>
                                )}
                            </div>

                            {/* ── Checklist — Jira subtask style ── */}
                            <div className="px-6 py-5">
                                <div className="flex items-center justify-between mb-3">
                                    <SectionLabel className="mb-0">
                                        <span className="flex items-center gap-1.5">
                                            <ListChecks className="h-3 w-3" />
                                            Checklist
                                        </span>
                                    </SectionLabel>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            {completedCount}/{checklists.length} done
                                        </span>
                                        <button
                                            onClick={() => setAddingChecklist(true)}
                                            className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline flex items-center gap-0.5"
                                        >
                                            <Plus className="h-2.5 w-2.5" />Add
                                        </button>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        {pct}% Done
                                    </span>
                                </div>

                                <div className="rounded-xl border border-slate-100 overflow-hidden">
                                    {checklists.length > 0 && (
                                        <>
                                            {/* Table header */}
                                            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] bg-slate-50 px-4 py-2 gap-3 border-b border-slate-100">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Task</span>
                                                <span className="w-8 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">Pri</span>
                                                <span className="w-7 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">As.</span>
                                                <span className="w-14 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Status</span>
                                                <span className="w-5" />
                                            </div>
                                            {checklists.map((item) => (
                                                <ChecklistRowWithDelete
                                                    key={item.id}
                                                    item={item}
                                                    onToggle={(pivotId, completed) => toggleItem({ pivotId, completed })}
                                                    onRemove={(pivotId) => removeChecklistItem(pivotId)}
                                                    isToggling={isToggling}
                                                />
                                            ))}
                                        </>
                                    )}
                                    {/* Add item inline form */}
                                    {addingChecklist ? (
                                        <div className="px-4 py-3 border-t border-slate-50 bg-blue-50/40 space-y-2">
                                            <input
                                                autoFocus
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                                placeholder="Checklist item name…"
                                                value={newChecklistName}
                                                onChange={e => setNewChecklistName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && newChecklistName.trim()) addChecklistItem()
                                                    if (e.key === 'Escape') { setAddingChecklist(false); setNewChecklistName('') }
                                                }}
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" disabled={isAddingChecklist || !newChecklistName.trim()}
                                                    onClick={() => addChecklistItem()}
                                                    className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                                                    {isAddingChecklist ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                                                </Button>
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => { setAddingChecklist(false); setNewChecklistName('') }}
                                                    className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : checklists.length === 0 ? (
                                        <div className="py-8 flex flex-col items-center gap-2">
                                            <ClipboardList className="h-6 w-6 text-slate-200" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No checklist items</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* ── Notes — inline editable ── */}
                            <div className="group px-6 py-5">
                                <div className="flex items-center justify-between mb-2">
                                    <SectionLabel className="mb-0">
                                        <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" />Notes</span>
                                    </SectionLabel>
                                    {editingField !== 'notes' && (
                                        <button onClick={() => startEdit('notes', notes ?? '')}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                                            Edit
                                        </button>
                                    )}
                                </div>
                                {editingField === 'notes' ? (
                                    <div className="space-y-2">
                                        <Textarea autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                                            className="resize-none text-sm min-h-[80px] border-slate-200 focus-visible:ring-blue-400" />
                                        <div className="flex gap-2">
                                            <Button size="sm" disabled={isSavingField}
                                                onClick={() => saveField({ notes: editValue })}
                                                className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                                                {isSavingField ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={cancelEdit}
                                                className="h-7 text-[9px] font-black uppercase tracking-widest px-3">Cancel</Button>
                                        </div>
                                    </div>
                                ) : notes ? (
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap cursor-text"
                                        onClick={() => startEdit('notes', notes)}>{notes}</p>
                                ) : (
                                    <button onClick={() => startEdit('notes', '')}
                                        className="text-[10px] font-bold text-slate-300 hover:text-slate-500 transition-colors uppercase tracking-widest">
                                        + Add notes
                                    </button>
                                )}
                            </div>

                        </div>

                        {/* ════════════ RIGHT — metadata sidebar ═══════ */}
                        <div className="lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/40 shrink-0 divide-y divide-slate-100 overflow-y-auto">

                            {/* Status section */}
                            <div className="px-5 py-4">
                                <SectionLabel>Status</SectionLabel>
                                <span className={cn(
                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                                    statusCfg.color
                                )}>
                                    {statusCfg.label}
                                </span>
                            </div>

                            {/* Schedule details */}
                            <div className="px-5 py-4 space-y-4">
                                <SectionLabel>Details</SectionLabel>

                                {/* Due date — inline editable */}
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Due Date</p>
                                    {editingField === 'due_date' ? (
                                        <div className="space-y-1.5 pt-0.5">
                                            <input
                                                type="date"
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                            />
                                            <div className="flex gap-1.5">
                                                <Button size="sm" disabled={isSavingField}
                                                    onClick={() => saveField({ due_date: editValue })}
                                                    className="h-6 text-[9px] font-black uppercase tracking-widest px-2.5">
                                                    {isSavingField ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Save'}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit}
                                                    className="h-6 text-[9px] font-black uppercase tracking-widest px-2">Cancel</Button>
                                            </div>
                                        </div>
                                    ) : dueDate ? (
                                        <button
                                            className="text-left group/duedate"
                                            onClick={() => startEdit('due_date', dueDate.slice(0, 10))}
                                        >
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-900 group-hover/duedate:text-blue-600 transition-colors">
                                                    {format(new Date(dueDate), 'dd MMM yyyy')}
                                                </p>
                                                <DueDateChip dueDate={dueDate} />
                                            </div>
                                        </button>
                                    ) : (
                                        <button onClick={() => startEdit('due_date', '')}
                                            className="text-[10px] font-bold text-slate-300 hover:text-blue-500 transition-colors uppercase tracking-widest">
                                            + Set due date
                                        </button>
                                    )}
                                </div>

                                {/* Vehicle */}
                                {vehicle?.registration_number && (
                                    <MetaItem label="Vehicle">
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                                                <Car className="h-3.5 w-3.5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 leading-tight">
                                                    {vehicle.make} {vehicle.model}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {vehicle.registration_number}
                                                </p>
                                            </div>
                                        </div>
                                    </MetaItem>
                                )}

                                {/* Priority — inline editable */}
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Priority</p>
                                    {editingField === 'priority' ? (
                                        <div className="space-y-1.5 pt-0.5">
                                            <select
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                            >
                                                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                                                    <option key={key} value={key}>{cfg.label}</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-1.5">
                                                <Button size="sm" disabled={isSavingField}
                                                    onClick={() => saveField({ priority: editValue })}
                                                    className="h-6 text-[9px] font-black uppercase tracking-widest px-2.5">
                                                    {isSavingField ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Save'}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit}
                                                    className="h-6 text-[9px] font-black uppercase tracking-widest px-2">Cancel</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => startEdit('priority', priority)}
                                            className="group/pri">
                                            <span className={cn(
                                                'inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-opacity group-hover/pri:opacity-70',
                                                priorityCfg.color
                                            )}>
                                                {priorityCfg.label}
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {/* Schedule type + interval */}
                                <MetaItem label="Schedule Type">
                                    <span className="capitalize">{scheduleType}</span>
                                    {intervalValue && intervalUnit && (
                                        <span className="text-[10px] text-slate-400 font-medium block">
                                            Every {intervalValue} {intervalUnit}
                                        </span>
                                    )}
                                </MetaItem>

                                {/* Estimated cost */}
                                {formattedCost && (
                                    <MetaItem label="Est. Cost">
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="h-3 w-3 text-slate-400" />
                                            {formattedCost}
                                        </span>
                                    </MetaItem>
                                )}

                                {/* Service duration */}
                                {schedule.attributes.service_duration && (
                                    <MetaItem label="Duration">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-slate-400" />
                                            {schedule.attributes.service_duration}h
                                        </span>
                                    </MetaItem>
                                )}

                                {/* Recurring */}
                                <MetaItem label="Recurring">
                                    <span className={cn(
                                        'inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest',
                                        schedule.attributes.is_recurring
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'bg-slate-100 text-slate-500'
                                    )}>
                                        {schedule.attributes.is_recurring ? 'Yes' : 'No'}
                                    </span>
                                </MetaItem>

                                {/* Next due */}
                                {nextDueDate && (
                                    <MetaItem label="Next Due">
                                        <span className="flex items-center gap-1">
                                            <Repeat2 className="h-3 w-3 text-slate-400" />
                                            {format(new Date(nextDueDate), 'dd MMM yyyy')}
                                        </span>
                                    </MetaItem>
                                )}

                                {/* Mileage trigger state and configuration */}
                                {mileage && (
                                    <MetaItem label="Mileage Trigger">
                                        <span className="flex flex-col items-start gap-1">
                                            {mileageStateLabel(mileage.state) ? (
                                                <MileageStateBadge mileage={mileage} />
                                            ) : (
                                                <span>
                                                    Every {mileageIntervalText(mileage) ?? '—'}
                                                    {mileage.next_due_km != null && mileage.next_due_km !== undefined && (
                                                        <span className="block text-[10px] font-medium text-slate-400">
                                                            Next due at {formatDistance(mileage.interval_display?.unit === 'mi' ? kmToUnit(mileage.next_due_km, 'mi') : mileage.next_due_km, mileage.interval_display?.unit ?? 'km')}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                            {mileage.state !== 'inactive_no_baseline' && (
                                                <button
                                                    type="button"
                                                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                                                    onClick={() => setMileageOpen(true)}
                                                >
                                                    {mileage.state === 'target_required' ? 'Set mileage target' : 'Change'}
                                                </button>
                                            )}
                                        </span>
                                    </MetaItem>
                                )}

                                {/* Current odometer */}
                                {vehicle?.current_odometer != null && mileageActive && (
                                    <MetaItem label="Current Odometer">
                                        <span className="flex items-center gap-1">
                                            <Gauge className="h-3 w-3 text-slate-400" />
                                            {Number(vehicle.current_odometer).toLocaleString()} km
                                        </span>
                                    </MetaItem>
                                )}

                                {/* Target odometer (mileage-based schedules) */}
                                {schedule.attributes.expected_odometer != null && mileageActive && (
                                    <MetaItem label="Service Target">
                                        <span className="flex items-center gap-1">
                                            <Gauge className="h-3 w-3 text-slate-400" />
                                            {Number(schedule.attributes.expected_odometer).toLocaleString()} km
                                        </span>
                                    </MetaItem>
                                )}
                            </div>

                            {/* Vendor — assigned or assign button */}
                            <div className="px-5 py-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <SectionLabel className="mb-0">Vendor</SectionLabel>
                                    {/* Change / assign trigger */}
                                    <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                {vendor?.name ? (
                                                    <>Change <ChevronsUpDown className="ml-1 h-2.5 w-2.5" /></>
                                                ) : (
                                                    <><Plus className="mr-1 h-2.5 w-2.5" /> Assign</>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            side="left"
                                            align="start"
                                            className="w-72 p-0 rounded-xl shadow-xl"
                                        >
                                            <Command>
                                                <CommandInput
                                                    placeholder="Search vendor…"
                                                    value={vendorSearch}
                                                    onValueChange={setVendorSearch}
                                                    className="text-xs"
                                                />
                                                <CommandList className="max-h-56">
                                                    <CommandEmpty>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest py-3 text-center">
                                                            No vendors found
                                                        </p>
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {(vendorsData?.data ?? [])
                                                            .filter((v: any) =>
                                                                v.attributes.business_name
                                                                    .toLowerCase()
                                                                    .includes(vendorSearch.toLowerCase())
                                                            )
                                                            .map((v: any) => (
                                                                <CommandItem
                                                                    key={v.id}
                                                                    value={v.attributes.business_name}
                                                                    disabled={isAssigning}
                                                                    onSelect={() => assignVendor(v.id)}
                                                                    className="font-bold uppercase text-[10px] tracking-tight py-3 px-4 cursor-pointer"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 h-3 w-3 shrink-0',
                                                                            vendor?.id === v.id ? 'opacity-100 text-emerald-500' : 'opacity-0',
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="truncate">{v.attributes.business_name}</span>
                                                                        {v.relationships?.user?.email && (
                                                                            <span className="text-[9px] font-normal text-slate-400 truncate normal-case tracking-normal">
                                                                                {v.relationships.user.email}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {vendor?.name ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                                            </div>
                                            <p className="text-xs font-black text-slate-900 truncate">{vendor.name}</p>
                                        </div>
                                        {vendor.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-slate-300 shrink-0" />
                                                <p className="text-[10px] font-bold text-slate-600 truncate">{vendor.email}</p>
                                            </div>
                                        )}
                                        {vendor.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-slate-300 shrink-0" />
                                                <p className="text-[10px] font-bold text-slate-600">{vendor.phone}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 py-4 flex flex-col items-center gap-1.5">
                                        <Building2 className="h-5 w-5 text-slate-200" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            No vendor assigned
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Assigned by */}
                            {assignedBy?.f_name && (
                                <div className="px-5 py-4">
                                    <SectionLabel>Assigned By</SectionLabel>
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                            <User className="h-3 w-3 text-slate-400" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-900">
                                            {assignedBy.f_name} {assignedBy.l_name ?? ''}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Linked alerts */}
                            {vehicle?.id && (
                                <div className="px-5 py-4">
                                    <SectionLabel>Alerts</SectionLabel>
                                    <Link
                                        href={`/maintenance/alerts?vehicle_id=${vehicle.id}`}
                                        className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                    >
                                        <Bell className="h-3 w-3" />
                                        View vehicle alerts →
                                    </Link>
                                </div>
                            )}

                            {/* Series panel — recurring schedules only */}
                            {schedule.attributes.is_recurring && seriesId && (
                                <div className="px-5 py-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <SectionLabel className="mb-0">
                                            <span className="flex items-center gap-1.5">
                                                <GitBranch className="h-3 w-3" />
                                                Series
                                            </span>
                                        </SectionLabel>
                                        {seriesSiblings.length > 0 && (
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {seriesSiblings.length} runs
                                            </span>
                                        )}
                                    </div>

                                    {seriesSiblings.length === 0 ? (
                                        <div className="flex flex-col items-center py-4 gap-1.5">
                                            <Repeat2 className="h-5 w-5 text-slate-200" />
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loading series…</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {seriesSiblings
                                                .sort((a: any, b: any) =>
                                                    (a.attributes?.occurrence_number ?? 0) - (b.attributes?.occurrence_number ?? 0)
                                                )
                                                .map((sibling: any) => {
                                                    const sa = sibling.attributes ?? {}
                                                    const sibStatus = STATUS_CONFIG[sa.status] ?? STATUS_CONFIG.pending
                                                    const isCurrentSchedule = String(sibling.id) === String(scheduleId)
                                                    return (
                                                        <Link
                                                            key={sibling.id}
                                                            href={`/maintenance/schedules/${sibling.id}`}
                                                            className={cn(
                                                                'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors group/sibling',
                                                                isCurrentSchedule
                                                                    ? 'bg-slate-900 text-white'
                                                                    : 'hover:bg-slate-100'
                                                            )}
                                                        >
                                                            {/* Occurrence number bubble */}
                                                            <span className={cn(
                                                                'text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                                                                isCurrentSchedule
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-slate-100 text-slate-500'
                                                            )}>
                                                                {sa.occurrence_number ?? '—'}
                                                            </span>
                                                            {/* Due date */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={cn(
                                                                    'text-[10px] font-bold truncate',
                                                                    isCurrentSchedule ? 'text-white' : 'text-slate-700'
                                                                )}>
                                                                    {sa.due_date
                                                                        ? format(new Date(sa.due_date), 'dd MMM yyyy')
                                                                        : 'No date'}
                                                                </p>
                                                            </div>
                                                            {/* Status dot */}
                                                            <span className={cn(
                                                                'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0',
                                                                isCurrentSchedule
                                                                    ? 'bg-white/20 text-white'
                                                                    : sibStatus.color
                                                            )}>
                                                                {sibStatus.label}
                                                            </span>
                                                        </Link>
                                                    )
                                                })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notification toggle */}
                            <div className="px-5 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <SectionLabel className="mb-0.5">Notifications</SectionLabel>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            {schedule.attributes.turn_on_notification ? 'Enabled' : 'Disabled'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => saveField({ turn_on_notification: !schedule.attributes.turn_on_notification })}
                                        disabled={isSavingField}
                                        className={cn(
                                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50',
                                            schedule.attributes.turn_on_notification ? 'bg-blue-600' : 'bg-slate-200'
                                        )}
                                    >
                                        <span className={cn(
                                            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                                            schedule.attributes.turn_on_notification ? 'translate-x-4' : 'translate-x-0'
                                        )} />
                                    </button>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="px-5 py-4 space-y-3">
                                <SectionLabel>Dates</SectionLabel>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Created</p>
                                        <p className="text-[10px] font-bold text-slate-700">
                                            {format(new Date(schedule.attributes.created_at), 'dd MMM yyyy')}
                                        </p>
                                    </div>
                                    {schedule.attributes.updated_at && (
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Updated</p>
                                            <p className="text-[10px] font-bold text-slate-700">
                                                {format(new Date(schedule.attributes.updated_at), 'dd MMM yyyy')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cancel / Delete actions */}
                            <div className="px-5 py-4 space-y-2">
                                <SectionLabel>Actions</SectionLabel>
                                {status !== 'cancelled' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isCancelling}
                                        onClick={() => cancelSchedule()}
                                        className="w-full h-8 text-[9px] font-black uppercase tracking-widest border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                                    >
                                        {isCancelling ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                                        Cancel Schedule
                                    </Button>
                                )}
                                {!showDeleteConfirm ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full h-8 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 className="mr-1.5 h-3 w-3" />Delete Schedule
                                    </Button>
                                ) : (
                                    <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 space-y-2">
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">
                                            Confirm deletion?
                                        </p>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="destructive" disabled={isDeleting}
                                                onClick={() => deleteScheduleMut()}
                                                className="h-7 text-[9px] font-black uppercase tracking-widest px-3 flex-1">
                                                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
                                            </Button>
                                            <Button size="sm" variant="ghost"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                                                No
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* ── Footer: expand / collapse (drawer only) ── */}
                {mode === 'drawer' && !isLoading && schedule && (
                    <div className="border-t border-slate-100 px-6 py-4 shrink-0 flex items-center justify-between gap-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {isFullWidth ? 'Full-screen view' : 'Summary view'}
                        </p>
                        {isFullWidth ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onCollapse}
                                className="text-[10px] font-black uppercase tracking-widest border-slate-200 h-8"
                            >
                                <Minimize2 className="mr-1.5 h-3 w-3" />
                                Collapse
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onExpandFull}
                                className="text-[10px] font-black uppercase tracking-widest border-slate-200 h-8"
                            >
                                Open Full Screen
                                <Maximize2 className="ml-1.5 h-3 w-3" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
