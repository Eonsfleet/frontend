'use client'

import { useQuery } from '@tanstack/react-query'
import { differenceInDays, format } from 'date-fns'
import {
    CalendarDays,
    CheckCircle2,
    Circle,
    Car,
    Wrench,
    Clock,
    RefreshCw,
    User,
    Building2,
    Phone,
    Mail,
    Gauge,
    ChevronRight,
    ClipboardList,
} from 'lucide-react'
import Link from 'next/link'

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

import { getScheduleById } from '@/lib/api/maintenance'
import type { MaintenanceSchedule, MaintenanceLog, ScheduleChecklist } from '@/types'
import { cn } from '@/lib/utils'

// ── Status styles ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
    upcoming:  { badge: 'text-blue-600 bg-blue-50',       label: 'Upcoming'  },
    pending:   { badge: 'text-amber-600 bg-amber-50',     label: 'Pending'   },
    active:    { badge: 'text-indigo-600 bg-indigo-50',   label: 'Active'    },
    overdue:   { badge: 'text-rose-600 bg-rose-50',       label: 'Overdue'   },
    completed: { badge: 'text-emerald-600 bg-emerald-50', label: 'Completed' },
    cancelled: { badge: 'text-slate-500 bg-slate-100',    label: 'Cancelled' },
}

const PRIORITY_STYLES: Record<string, { badge: string; label: string }> = {
    critical: { badge: 'text-rose-700 bg-rose-50',     label: 'Critical' },
    high:     { badge: 'text-orange-600 bg-orange-50', label: 'High'     },
    medium:   { badge: 'text-amber-600 bg-amber-50',   label: 'Medium'   },
    normal:   { badge: 'text-slate-500 bg-slate-100',  label: 'Normal'   },
    low:      { badge: 'text-slate-500 bg-slate-100',  label: 'Low'      },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusStyle(status: string) {
    return STATUS_STYLES[status] ?? { badge: 'text-slate-500 bg-slate-100', label: status }
}

function getPriorityStyle(priority: string) {
    return PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.normal
}

function DueDateDisplay({ dueDate, status }: { dueDate: string; status: string }) {
    const days = differenceInDays(new Date(dueDate), new Date())
    const isOverdue = status === 'overdue' || days < 0
    const isUrgent = !isOverdue && days <= 1

    if (isOverdue) {
        return (
            <span className="text-sm font-black text-rose-600">
                {Math.abs(days)} days overdue
            </span>
        )
    }
    if (isUrgent) {
        return (
            <span className="text-sm font-black text-amber-600">
                {days === 0 ? 'Due today' : 'Due tomorrow'}
            </span>
        )
    }
    return (
        <span className="text-sm font-bold text-slate-900">
            {days} days remaining
        </span>
    )
}

function formatCost(schedule: MaintenanceSchedule['attributes']): string | null {
    const raw = schedule.estimated_cost
    const kobo = schedule.estimated_cost_kobo

    if (raw != null) {
        return `₦${raw.toLocaleString()}`
    }
    if (kobo != null) {
        return `₦${(kobo / 100).toLocaleString()}`
    }
    return null
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {children}
        </p>
    )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-0.5">
            <SectionLabel>{label}</SectionLabel>
            <div className="text-sm font-bold text-slate-900">{children}</div>
        </div>
    )
}

function ChecklistSection({ items }: { items: ScheduleChecklist[] }) {
    const MAX_VISIBLE = 6
    const completed = items.filter(i => i.attributes.status === 'completed').length
    const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0
    const visible = items.slice(0, MAX_VISIBLE)
    const overflow = items.length - MAX_VISIBLE

    return (
        <div className="space-y-3">
            {/* Progress */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <SectionLabel>Checklist Progress</SectionLabel>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {completed}/{items.length}
                    </span>
                </div>
                <Progress
                    value={pct}
                    className="h-1.5 bg-slate-100"
                    indicatorClassName={cn(
                        pct === 100 ? 'bg-emerald-500' : 'bg-slate-900'
                    )}
                />
            </div>

            {/* Items */}
            <ul className="space-y-1.5">
                {visible.map((item) => {
                    const done = item.attributes.status === 'completed'
                    return (
                        <li key={item.id} className="flex items-start gap-2">
                            {done ? (
                                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                            ) : (
                                <Circle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-300" />
                            )}
                            <div className="min-w-0">
                                <p className={cn(
                                    'text-xs font-bold leading-snug',
                                    done ? 'text-slate-400 line-through' : 'text-slate-700'
                                )}>
                                    {item.attributes.name}
                                </p>
                                {item.attributes.description && (
                                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                                        {item.attributes.description}
                                    </p>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>

            {overflow > 0 && (
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    +{overflow} more item{overflow !== 1 ? 's' : ''}
                </p>
            )}
        </div>
    )
}

function LogStatusDot({ status }: { status: string }) {
    const map: Record<string, string> = {
        completed:   'bg-emerald-500',
        in_progress: 'bg-indigo-500',
        pending:     'bg-amber-500',
        cancelled:   'bg-slate-300',
        verified:    'bg-blue-500',
    }
    return (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 mt-1.5', map[status] ?? 'bg-slate-300')} />
    )
}

function RecentLogsSection({ logs }: { logs: MaintenanceLog[] }) {
    if (logs.length === 0) {
        return (
            <div className="py-6 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    No work logs yet
                </p>
            </div>
        )
    }

    return (
        <ul className="space-y-2">
            {logs.map((log) => {
                const vendorName = log.relationships?.vendor?.attributes?.business_name
                    ?? log.relationships?.vendor?.name
                    ?? null
                const logDate = log.attributes.perform_date
                    ?? log.attributes.completed_date
                    ?? log.attributes.created_at
                return (
                    <li key={log.id} className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                        <LogStatusDot status={log.attributes.status} />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                                    {log.attributes.ticket_number ?? `Log #${log.id}`}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400">
                                    {format(new Date(logDate), 'dd MMM yyyy')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <Badge className={cn(
                                    'h-3.5 text-[8px] font-black uppercase tracking-tight border-0 shadow-none px-1.5',
                                    log.attributes.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                                    : log.attributes.status === 'in_progress' ? 'bg-indigo-50 text-indigo-600'
                                    : 'bg-slate-100 text-slate-500'
                                )}>
                                    {log.attributes.status.replace(/_/g, ' ')}
                                </Badge>
                                {vendorName && (
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {vendorName}
                                    </span>
                                )}
                            </div>
                            {log.attributes.description && (
                                <p className="text-[10px] text-slate-500 leading-snug mt-1 line-clamp-2">
                                    {log.attributes.description}
                                </p>
                            )}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DrawerSkeleton() {
    return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left pane */}
            <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-56 rounded-lg" />
                    <Skeleton className="h-4 w-40 rounded-lg" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-16 rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-2 rounded-full" />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 rounded-lg" />
                    ))}
                </div>
            </div>
            {/* Right pane */}
            <div className="w-56 shrink-0 border-l border-slate-100 px-4 py-5 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                        <Skeleton className="h-2.5 w-16 rounded" />
                        <Skeleton className="h-4 w-28 rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
    scheduleId: string | null
    onClose: () => void
}

export function MaintenanceScheduleDrawer({ scheduleId, onClose }: Props) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['schedule-detail', scheduleId],
        queryFn: () => getScheduleById(scheduleId!),
        enabled: !!scheduleId,
    })

    // Normalize: API might return { data: { schedule } } or { data: { id, attributes, ... } }
    const rawData = data?.data as any
    const schedule: MaintenanceSchedule | null =
        rawData?.schedule?.attributes
            ? rawData.schedule
            : rawData?.attributes
            ? rawData
            : null

    const attrs = schedule?.attributes
    const rels = schedule?.relationships

    const status = attrs?.status ?? ''
    const priority = attrs?.priority ?? 'normal'
    const statusStyle = getStatusStyle(status)
    const priorityStyle = getPriorityStyle(priority)

    const checklists: ScheduleChecklist[] = rels?.checklists ?? []
    const logs: MaintenanceLog[] = (rels?.logs ?? []).slice(0, 3)
    const vendor = rels?.vendor
    const vehicle = rels?.vehicle
    const assignedBy = rels?.assigned_by
    const cost = attrs ? formatCost(attrs) : null

    const dueDateFormatted = attrs?.due_date
        ? format(new Date(attrs.due_date), 'dd MMM yyyy')
        : null

    return (
        <Sheet open={!!scheduleId} onOpenChange={(open) => { if (!open) onClose() }}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[700px] p-0 flex flex-col gap-0"
            >
                {/* Header ─────────────────────────────────────────────────── */}
                <SheetHeader className="px-6 py-5 border-b border-slate-100 shrink-0">
                    <SheetTitle className={cn(
                        isLoading ? 'sr-only' : 'text-lg font-black uppercase tracking-tight text-slate-900'
                    )}>
                        {isLoading
                            ? 'Maintenance Schedule'
                            : isError
                            ? 'Failed to load schedule'
                            : attrs?.service_type ?? 'Maintenance Schedule'}
                    </SheetTitle>

                    {isLoading ? null : isError ? (
                        <p className="text-xs text-rose-500 font-medium">
                            Could not load schedule details. Please try again.
                        </p>
                    ) : attrs ? (
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                            {attrs.reference && (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    {attrs.reference}
                                </span>
                            )}
                            {vehicle && (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Car className="h-3 w-3" />
                                    {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                                    {vehicle.registration_number && ` · ${vehicle.registration_number}`}
                                </span>
                            )}
                        </div>
                    ) : null}
                </SheetHeader>

                {/* Body: two-pane layout ───────────────────────────────────── */}
                {isLoading ? (
                    <DrawerSkeleton />
                ) : isError ? (
                    <div className="flex-1 flex items-center justify-center p-10 text-center">
                        <p className="text-sm text-slate-400">
                            An error occurred while fetching schedule details.
                        </p>
                    </div>
                ) : !attrs ? null : (
                    <div className="flex flex-1 min-h-0 overflow-hidden">

                        {/* ── LEFT PANE ─────────────────────────────────────── */}
                        <div className="flex-1 overflow-y-auto">

                            {/* Description / Notes */}
                            {(attrs.description || attrs.notes) && (
                                <div className="px-6 py-5 border-b border-slate-100 space-y-3">
                                    {attrs.description && (
                                        <div className="space-y-1">
                                            <SectionLabel>Description</SectionLabel>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {attrs.description}
                                            </p>
                                        </div>
                                    )}
                                    {attrs.notes && (
                                        <div className="space-y-1">
                                            <SectionLabel>Notes</SectionLabel>
                                            <p className="text-sm text-slate-500 leading-relaxed">
                                                {attrs.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Checklist */}
                            {checklists.length > 0 && (
                                <div className="px-6 py-5 border-b border-slate-100 space-y-2">
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                                        <SectionLabel>Checklist</SectionLabel>
                                    </div>
                                    <ChecklistSection items={checklists} />
                                </div>
                            )}

                            {/* Recent work logs */}
                            <div className="px-6 py-5 space-y-3">
                                <div className="flex items-center gap-1.5">
                                    <Wrench className="h-3.5 w-3.5 text-slate-400" />
                                    <SectionLabel>Recent Work Logs</SectionLabel>
                                </div>
                                <RecentLogsSection logs={logs} />
                            </div>
                        </div>

                        {/* ── RIGHT PANE ────────────────────────────────────── */}
                        <div className="w-56 shrink-0 bg-slate-50/50 border-l border-slate-100 overflow-y-auto">

                            {/* Status + Priority */}
                            <div className="px-4 py-5 space-y-4 border-b border-slate-100">
                                <div className="space-y-1.5">
                                    <SectionLabel>Status</SectionLabel>
                                    <Badge className={cn(
                                        'font-black uppercase text-[8px] h-5 tracking-tight border-0 shadow-none px-2',
                                        statusStyle.badge
                                    )}>
                                        {statusStyle.label}
                                    </Badge>
                                </div>

                                {attrs.priority && (
                                    <div className="space-y-1.5">
                                        <SectionLabel>Priority</SectionLabel>
                                        <Badge className={cn(
                                            'font-black uppercase text-[8px] h-5 tracking-tight border-0 shadow-none px-2',
                                            priorityStyle.badge
                                        )}>
                                            {priorityStyle.label}
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Key details */}
                            <div className="px-4 py-5 space-y-4 border-b border-slate-100">
                                {/* Due date */}
                                {attrs.due_date && (
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <CalendarDays className="h-3 w-3 text-slate-400" />
                                            <SectionLabel>Due Date</SectionLabel>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{dueDateFormatted}</p>
                                        <DueDateDisplay dueDate={attrs.due_date} status={status} />
                                    </div>
                                )}

                                {/* Schedule type */}
                                <DetailRow label="Schedule Type">
                                    <span className="uppercase">{attrs.schedule_type}</span>
                                </DetailRow>

                                {/* Interval */}
                                {(attrs.interval_value != null || attrs.interval_unit) && (
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <Clock className="h-3 w-3 text-slate-400" />
                                            <SectionLabel>Interval</SectionLabel>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {[attrs.interval_value, attrs.interval_unit].filter(Boolean).join(' ')}
                                        </p>
                                    </div>
                                )}

                                {/* Estimated cost */}
                                {cost && (
                                    <DetailRow label="Est. Cost">
                                        {cost}
                                    </DetailRow>
                                )}

                                {/* Recurring */}
                                {attrs.is_recurring != null && (
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <RefreshCw className="h-3 w-3 text-slate-400" />
                                            <SectionLabel>Recurring</SectionLabel>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {attrs.is_recurring ? 'Yes' : 'No'}
                                        </p>
                                    </div>
                                )}

                                {/* Next due date */}
                                {attrs.next_due_date && (
                                    <DetailRow label="Next Due">
                                        {format(new Date(attrs.next_due_date), 'dd MMM yyyy')}
                                    </DetailRow>
                                )}

                                {/* Vehicle odometer */}
                                {vehicle?.current_odometer != null && (
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <Gauge className="h-3 w-3 text-slate-400" />
                                            <SectionLabel>Current Odometer</SectionLabel>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {vehicle.current_odometer.toLocaleString()} km
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Vendor */}
                            {vendor && (
                                <div className="px-4 py-5 space-y-3 border-b border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <Building2 className="h-3 w-3 text-slate-400" />
                                        <SectionLabel>Vendor</SectionLabel>
                                    </div>
                                    <div className="space-y-1.5">
                                        {vendor.name && (
                                            <p className="text-sm font-bold text-slate-900 leading-tight">
                                                {vendor.name}
                                            </p>
                                        )}
                                        {vendor.email && (
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                                <Mail className="h-2.5 w-2.5 shrink-0" />
                                                <span className="truncate">{vendor.email}</span>
                                            </p>
                                        )}
                                        {vendor.phone && (
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                                <Phone className="h-2.5 w-2.5 shrink-0" />
                                                {vendor.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Assigned by */}
                            {assignedBy && (
                                <div className="px-4 py-5 space-y-2 border-b border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <User className="h-3 w-3 text-slate-400" />
                                        <SectionLabel>Assigned By</SectionLabel>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900">
                                        {[assignedBy.f_name, assignedBy.l_name].filter(Boolean).join(' ')}
                                    </p>
                                </div>
                            )}

                            {/* Created at */}
                            {attrs.created_at && (
                                <div className="px-4 py-5 space-y-1">
                                    <SectionLabel>Created</SectionLabel>
                                    <p className="text-xs font-bold text-slate-500">
                                        {format(new Date(attrs.created_at), 'dd MMM yyyy')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer ─────────────────────────────────────────────────── */}
                {!isLoading && !isError && scheduleId && (
                    <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-white">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Full schedule details available on the schedule page
                        </p>
                        <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200 px-3 hover:bg-slate-50"
                        >
                            <Link href={`/maintenance/schedules/${scheduleId}`}>
                                Open Full Schedule
                                <ChevronRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
