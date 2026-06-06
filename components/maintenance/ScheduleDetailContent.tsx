'use client'

import { useQuery } from '@tanstack/react-query'
import { differenceInDays, format } from 'date-fns'
import Link from 'next/link'
import {
    Activity, Bell, Building2, Car, Check,
    ChevronRight, Clock, DollarSign, Gauge, Mail,
    Maximize2, Minimize2, Phone, Repeat2, User, Wrench,
    ClipboardList, FileText, ListChecks,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getScheduleById } from '@/lib/api/maintenance'
import { cn } from '@/lib/utils'
import type { MaintenanceSchedule, ScheduleChecklist } from '@/types'

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

// ── Checklist row ─────────────────────────────────────────────────────────────

function ChecklistRow({ item }: { item: ScheduleChecklist }) {
    const isDone = item.attributes.status === 'completed'
    return (
        <div className="grid grid-cols-[1fr_auto_auto_auto] px-4 py-2.5 gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors items-center">
            {/* Task name */}
            <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0',
                    isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                )}>
                    {isDone && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <span className={cn(
                    'text-xs font-bold truncate',
                    isDone ? 'line-through text-slate-400' : 'text-slate-900'
                )}>
                    {item.attributes.name}
                </span>
            </div>
            {/* Priority (static — M) */}
            <div className="w-8 flex justify-center">
                <span className="text-[9px] font-black text-slate-400 uppercase">M</span>
            </div>
            {/* Assignee (static avatar) */}
            <div className="w-7 flex justify-center">
                <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-3 w-3 text-slate-400" />
                </div>
            </div>
            {/* Status badge */}
            <div className="w-14 flex justify-end">
                <span className={cn(
                    'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md',
                    isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                )}>
                    {isDone ? 'Done' : 'To Do'}
                </span>
            </div>
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
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['schedule-detail', scheduleId],
        queryFn: () => getScheduleById(scheduleId!),
        enabled: !!scheduleId,
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

    // Checklist
    const checklists: ScheduleChecklist[] = (schedule?.relationships?.checklists ?? []) as ScheduleChecklist[]
    const completedCount = checklists.filter(c => c.attributes.status === 'completed').length
    const pct = checklists.length > 0 ? Math.round((completedCount / checklists.length) * 100) : 0

    // Work logs
    const logs: any[] = (schedule?.relationships?.logs ?? []) as any[]
    const displayedLogs = logs.slice(0, 5)

    // Derived metadata
    const vehicle = schedule?.relationships?.vehicle as any
    const vendor = schedule?.relationships?.vendor as any
    const assignedBy = schedule?.relationships?.assigned_by as any
    const serviceType = schedule?.attributes?.service_type ?? ''
    const scheduleType = schedule?.attributes?.schedule_type ?? ''
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
            <div className={cn(
                'flex-1 flex flex-col min-h-0',
                mode === 'drawer' ? 'overflow-y-auto' : ''
            )}>
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
                    <div className="flex flex-col lg:flex-row flex-1">

                        {/* ════════════ LEFT — main content ════════════ */}
                        <div className="flex-1 min-w-0 divide-y divide-slate-100">

                            {/* Description */}
                            {description && (
                                <div className="px-6 py-5">
                                    <SectionLabel>Description</SectionLabel>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                        {description}
                                    </p>
                                </div>
                            )}

                            {/* ── Checklist — Jira subtask style ── */}
                            <div className="px-6 py-5">
                                <div className="flex items-center justify-between mb-3">
                                    <SectionLabel className="mb-0">
                                        <span className="flex items-center gap-1.5">
                                            <ListChecks className="h-3 w-3" />
                                            Checklist
                                        </span>
                                    </SectionLabel>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {completedCount}/{checklists.length} done
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        {pct}% Done
                                    </span>
                                </div>

                                {checklists.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 py-8 flex flex-col items-center gap-2">
                                        <ClipboardList className="h-6 w-6 text-slate-200" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            No checklist items
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                                        {/* Table header */}
                                        <div className="grid grid-cols-[1fr_auto_auto_auto] bg-slate-50 px-4 py-2 gap-3 border-b border-slate-100">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                Task
                                            </span>
                                            <span className="w-8 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                Pri
                                            </span>
                                            <span className="w-7 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                As.
                                            </span>
                                            <span className="w-14 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                Status
                                            </span>
                                        </div>
                                        {checklists.map((item) => (
                                            <ChecklistRow key={item.id} item={item} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Work logs — linked work items ── */}
                            <div className="px-6 py-5">
                                <div className="flex items-center justify-between mb-3">
                                    <SectionLabel className="mb-0">
                                        <span className="flex items-center gap-1.5">
                                            <Activity className="h-3 w-3" />
                                            Work Logs
                                        </span>
                                    </SectionLabel>
                                    {logs.length > 0 && (
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            {logs.length} total
                                        </span>
                                    )}
                                </div>

                                {logs.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 py-8 flex flex-col items-center gap-2">
                                        <Wrench className="h-6 w-6 text-slate-200" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            No work logs yet
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                                        {displayedLogs.map((log: any, i: number) => {
                                            const logStatus = (log.attributes?.status ?? 'pending').toLowerCase()
                                            const logCfg = LOG_STATUS_CONFIG[logStatus] ?? LOG_STATUS_CONFIG.pending
                                            return (
                                                <div key={log.id ?? i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                                                    <div className={cn('h-2 w-2 rounded-full shrink-0', logCfg.dot)} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                            {log.attributes?.reference ?? log.attributes?.title ?? `Log #${log.id}`}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            {logStatus.replace(/_/g, ' ')}
                                                            {log.attributes?.completed_at
                                                                ? ` · ${format(new Date(log.attributes.completed_at), 'dd MMM')}`
                                                                : log.attributes?.started_at
                                                                ? ` · Started ${format(new Date(log.attributes.started_at), 'dd MMM')}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                    <span className={cn(
                                                        'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0',
                                                        logCfg.color
                                                    )}>
                                                        {logCfg.label}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                        {logs.length > 5 && (
                                            <div className="px-4 py-2.5 text-center">
                                                <Link
                                                    href={`/maintenance/schedules/${scheduleId}`}
                                                    className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                                                >
                                                    +{logs.length - 5} more logs →
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {notes && (
                                <div className="px-6 py-5">
                                    <SectionLabel>
                                        <span className="flex items-center gap-1.5">
                                            <FileText className="h-3 w-3" />
                                            Notes
                                        </span>
                                    </SectionLabel>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                        {notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ════════════ RIGHT — metadata sidebar ═══════ */}
                        <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/40 shrink-0 divide-y divide-slate-100">

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

                                {/* Due date */}
                                {dueDate && (
                                    <MetaItem label="Due Date">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-900">
                                                {format(new Date(dueDate), 'dd MMM yyyy')}
                                            </p>
                                            <DueDateChip dueDate={dueDate} />
                                        </div>
                                    </MetaItem>
                                )}

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

                                {/* Priority */}
                                <MetaItem label="Priority">
                                    <span className={cn(
                                        'inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest',
                                        priorityCfg.color
                                    )}>
                                        {priorityCfg.label}
                                    </span>
                                </MetaItem>

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

                                {/* Current odometer */}
                                {vehicle?.current_odometer != null && (
                                    <MetaItem label="Current Odometer">
                                        <span className="flex items-center gap-1">
                                            <Gauge className="h-3 w-3 text-slate-400" />
                                            {Number(vehicle.current_odometer).toLocaleString()} km
                                        </span>
                                    </MetaItem>
                                )}

                                {/* Target odometer (mileage-based schedules) */}
                                {schedule.attributes.expected_odometer != null && (
                                    <MetaItem label="Service Target">
                                        <span className="flex items-center gap-1">
                                            <Gauge className="h-3 w-3 text-slate-400" />
                                            {Number(schedule.attributes.expected_odometer).toLocaleString()} km
                                        </span>
                                    </MetaItem>
                                )}
                            </div>

                            {/* Vendor */}
                            {vendor?.name && (
                                <div className="px-5 py-4 space-y-3">
                                    <SectionLabel>Vendor</SectionLabel>
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                        </div>
                                        <p className="text-xs font-black text-slate-900">{vendor.name}</p>
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
                                </div>
                            )}

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
