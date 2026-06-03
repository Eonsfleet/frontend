'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import {
    ChevronLeft, ChevronDown, ChevronUp, RefreshCw, Copy, Check,
    Loader2, AlertTriangle, CheckCircle2, Clock, Calendar, Wrench,
    Bell, BellOff, Gauge, ListChecks, Car, User, Store,
    Play, ShieldCheck, X, Plus, Trash2, Paperclip,
    Settings2, BarChart2, ExternalLink, ArrowRight, Activity,
    ClipboardList, Hash, FileText,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/hooks/usePermission'
import {
    getScheduleById, getScheduleChecklists, getLogsBySchedule,
    getLogParts, assignVendorToSchedule, assignLog, startLog,
    completeLog, verifyLog, cancelLog, updateLogProgress,
    addLogPart, deleteLogPart, uploadLogAttachment,
    type ChecklistItem,
} from '@/lib/api/maintenance'
import { getVendors } from '@/lib/api/vendors'
import type { MaintenanceLog, MaintenancePart } from '@/types'

// ─── Status / priority configs ────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; pill: string; bar: string; dot: string }> = {
    pending:     { label: 'Pending',     pill: 'bg-blue-50 text-blue-700 border-blue-100',    bar: 'bg-blue-500',    dot: 'bg-blue-500' },
    in_progress: { label: 'In Progress', pill: 'bg-amber-50 text-amber-700 border-amber-100', bar: 'bg-amber-400',   dot: 'bg-amber-500' },
    completed:   { label: 'Completed',   pill: 'bg-emerald-50 text-emerald-700 border-emerald-100', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    verified:    { label: 'Verified',    pill: 'bg-violet-50 text-violet-700 border-violet-100', bar: 'bg-violet-500', dot: 'bg-violet-500' },
    cancelled:   { label: 'Cancelled',   pill: 'bg-slate-100 text-slate-500 border-slate-200', bar: 'bg-slate-300',   dot: 'bg-slate-400' },
    overdue:     { label: 'Overdue',     pill: 'bg-rose-50 text-rose-700 border-rose-100',    bar: 'bg-rose-500',    dot: 'bg-rose-500' },
    active:      { label: 'Active',      pill: 'bg-emerald-50 text-emerald-700 border-emerald-100', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    upcoming:    { label: 'Upcoming',    pill: 'bg-blue-50 text-blue-700 border-blue-100',    bar: 'bg-blue-500',    dot: 'bg-blue-400' },
}

const PRIORITY_CFG: Record<string, { label: string; pill: string }> = {
    low:      { label: 'Low',      pill: 'bg-slate-50 text-slate-600 border-slate-200' },
    medium:   { label: 'Medium',   pill: 'bg-amber-50 text-amber-700 border-amber-100' },
    high:     { label: 'High',     pill: 'bg-orange-50 text-orange-700 border-orange-100' },
    critical: { label: 'Critical', pill: 'bg-rose-50 text-rose-700 border-rose-100' },
}

function resolveScheduleStatus(status: string, dueDate?: string) {
    const isOverdue = dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate)) && status !== 'completed'
    return STATUS_CFG[isOverdue ? 'overdue' : status.toLowerCase()] ?? STATUS_CFG.pending
}

// ─── Tiny shared helpers ──────────────────────────────────────────────────────

function KV({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-6 py-2.5 border-b border-slate-50 last:border-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 pt-px">{label}</span>
            <span className={cn('text-[13px] font-semibold text-slate-800 text-right', mono && 'font-mono text-xs')}>
                {value ?? <span className="text-slate-300">—</span>}
            </span>
        </div>
    )
}

function SectionHeader({ icon: Icon, children, color = 'bg-slate-100', iconColor = 'text-slate-600' }: {
    icon: React.ElementType; children: React.ReactNode; color?: string; iconColor?: string
}) {
    return (
        <div className="flex items-center gap-2.5 mb-5">
            <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', color)}>
                <Icon className={cn('h-3.5 w-3.5', iconColor)} />
            </div>
            <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">{children}</span>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaintenanceScheduleDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { role } = usePermission()
    const userRole = Array.isArray(role) ? role[0] : role

    const canAct    = ['administrator', 'fleet_manager', 'owner', 'mechanic'].includes(userRole ?? '')
    const canManage = ['administrator', 'fleet_manager', 'owner'].includes(userRole ?? '')

    const [copiedRef,        setCopiedRef]        = useState(false)
    const [configOpen,       setConfigOpen]       = useState(true)
    const [assignVendorOpen, setAssignVendorOpen] = useState(false)
    const [expandedLogs,     setExpandedLogs]     = useState<Set<string | number>>(new Set())
    const [workflowModal,    setWorkflowModal]    = useState<{
        logId: string | number; action: 'start' | 'complete' | 'verify' | 'cancel' | 'assign'
        title: string; description: string
    } | null>(null)
    const [progressModal, setProgressModal] = useState<{ logId: string | number } | null>(null)
    const [addPartModal,  setAddPartModal]  = useState<{ logId: string | number } | null>(null)

    // ── Queries ───────────────────────────────────────────────────────────────

    const schedQ = useQuery({ queryKey: ['maintenance-schedule', id], queryFn: () => getScheduleById(id), enabled: !!id })
    const checkQ = useQuery({ queryKey: ['maintenance-checklists', id], queryFn: () => getScheduleChecklists(id), enabled: !!id })
    const logsQ  = useQuery({ queryKey: ['maintenance-logs-schedule', id], queryFn: () => getLogsBySchedule(id), enabled: !!id })
    const vendQ  = useQuery({
        queryKey: ['vendors-list-maint'],
        queryFn: () => getVendors(),
        enabled: assignVendorOpen || workflowModal?.action === 'assign',
    })

    const assignVendorMut = useMutation({
        mutationFn: (vid: string | number) => assignVendorToSchedule(id, { vendor_id: vid }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-schedule', id] })
            toast.success('Vendor assigned')
            setAssignVendorOpen(false)
        },
        onError: () => toast.error('Failed to assign vendor'),
    })

    // ── Loading / error states ────────────────────────────────────────────────

    if (schedQ.isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-xs text-slate-400 font-medium">Loading schedule…</p>
                </div>
            </div>
        )
    }

    if (schedQ.isError || !schedQ.data?.data?.schedule) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <div className="h-14 w-14 bg-rose-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-7 w-7 text-rose-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Could not load this schedule</p>
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ChevronLeft className="mr-1 h-4 w-4" />Go Back
                </Button>
            </div>
        )
    }

    // ── Derived data ──────────────────────────────────────────────────────────

    const schedule  = schedQ.data.data.schedule
    const attrs     = schedule.attributes
    const vehicle   = schedule.relationships?.vehicle
    const vendor    = schedule.relationships?.vendor
    const assignedBy = (schedule.relationships as any)?.assigned_by
    const checklists: ChecklistItem[] = checkQ.data?.data?.checklists ?? []
    const logs: MaintenanceLog[]      = logsQ.data?.data?.logs ?? []

    const statusCfg  = resolveScheduleStatus(attrs.status, attrs.due_date)
    const priorityCfg = PRIORITY_CFG[attrs.priority ?? 'low'] ?? PRIORITY_CFG.low
    const reference  = (attrs as any).reference ?? `MS-${String(schedule.id).padStart(4, '0')}`
    const dueDate    = attrs.due_date ? new Date(attrs.due_date) : null
    const daysLeft   = dueDate ? differenceInDays(dueDate, new Date()) : null

    const openLogs      = logs.filter(l => !['completed', 'verified', 'cancelled'].includes(l.attributes.status))
    const completedLogs = logs.filter(l => ['completed', 'verified'].includes(l.attributes.status))

    const intervalLabel = attrs.schedule_type === 'mileage'
        ? `Every ${(attrs.interval_value ?? 0).toLocaleString()} ${(attrs.interval_unit ?? 'km').toUpperCase()}`
        : `Every ${attrs.interval_value ?? 0} ${attrs.interval_unit ?? 'months'}`

    const copyRef = () => {
        navigator.clipboard.writeText(reference)
        setCopiedRef(true)
        setTimeout(() => setCopiedRef(false), 2000)
    }

    const vendorList = vendQ.data?.data ?? []
    const toggleLog  = (lid: string | number) =>
        setExpandedLogs(p => { const n = new Set(p); n.has(lid) ? n.delete(lid) : n.add(lid); return n })

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-full bg-slate-50">

            {/* ── Sticky top bar ── */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <button onClick={copyRef} className="flex items-center gap-1.5 font-mono text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors shrink-0">
                        {reference}
                        {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
                    </button>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', statusCfg.pill)}>
                            <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full inline-block', statusCfg.dot)} />
                            {statusCfg.label}
                        </Badge>
                        {attrs.priority && (
                            <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', priorityCfg.pill)}>
                                {priorityCfg.label}
                            </Badge>
                        )}
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => schedQ.refetch()} className="text-xs shrink-0">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh
                </Button>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

                {/* ── Hero card ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className={cn('h-1 w-full', statusCfg.bar)} />
                    <div className="p-6 lg:p-8">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                            <div className="space-y-3 flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        {(attrs.service_type ?? 'Maintenance').replace(/_/g, ' ')}
                                    </h1>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-sm text-slate-400 capitalize font-medium">
                                        {attrs.schedule_type?.replace(/_/g, ' ')} schedule
                                    </span>
                                </div>

                                {vehicle && (
                                    <Link
                                        href={`/vehicles/${vehicle.id}`}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group w-fit"
                                    >
                                        <Car className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700">
                                            {vehicle.registration_number} — {vehicle.make} {vehicle.model}
                                        </span>
                                        <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-blue-400" />
                                    </Link>
                                )}

                                {attrs.description && (
                                    <p className="text-sm text-slate-500 leading-relaxed max-w-xl">{attrs.description}</p>
                                )}

                                <p className="text-[11px] text-slate-400 font-medium">
                                    Created {attrs.created_at ? format(new Date(attrs.created_at), 'dd MMM yyyy') : '—'}
                                </p>
                            </div>

                            {/* Due date block */}
                            <div className="shrink-0 bg-slate-50 rounded-xl border border-slate-100 px-5 py-4 text-right min-w-[160px]">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                                <p className={cn('text-3xl font-black tracking-tight leading-none',
                                    dueDate && isPast(dueDate) && attrs.status !== 'completed' ? 'text-rose-600' : 'text-slate-900'
                                )}>
                                    {dueDate ? format(dueDate, 'dd MMM') : '—'}
                                </p>
                                {dueDate && <p className="text-sm text-slate-400 mt-0.5">{format(dueDate, 'yyyy')}</p>}
                                {daysLeft !== null && (
                                    <p className={cn('text-xs font-bold mt-2',
                                        daysLeft < 0 ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-slate-400'
                                    )}>
                                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stats bar ── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {([
                        { label: 'Total Logs',   value: logs.length,          icon: ClipboardList, color: 'text-slate-600' },
                        { label: 'Open',         value: openLogs.length,      icon: Activity,      color: 'text-amber-600' },
                        { label: 'Completed',    value: completedLogs.length, icon: CheckCircle2,  color: 'text-emerald-600' },
                        { label: 'Est. Cost',    value: attrs.estimated_cost != null ? `₦${Number(attrs.estimated_cost).toLocaleString()}` : '—', icon: Gauge, color: 'text-blue-600' },
                        { label: daysLeft !== null && daysLeft < 0 ? 'Overdue' : 'Days to Due', value: daysLeft !== null ? `${Math.abs(daysLeft)}d` : '—', icon: Calendar, color: daysLeft !== null && daysLeft < 0 ? 'text-rose-600' : 'text-slate-600' },
                    ] as const).map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
                            <Icon className={cn('h-5 w-5 shrink-0', color)} />
                            <div>
                                <p className="text-lg font-black text-slate-900 leading-none">{value}</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Two-column main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left (2/3) ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Schedule Configuration — collapsible */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <button
                                onClick={() => setConfigOpen(p => !p)}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="h-7 w-7 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <Settings2 className="h-3.5 w-3.5 text-blue-600" />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Schedule Configuration</span>
                                </div>
                                {configOpen
                                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                                    : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                            {configOpen && (
                                <CardContent className="px-6 pt-1 pb-5 border-t border-slate-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                                        <div>
                                            <KV label="Schedule Type"  value={attrs.schedule_type?.toUpperCase()} />
                                            <KV label="Recurring"      value={
                                                <span className={attrs.is_recurring ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                                                    {attrs.is_recurring ? 'Yes' : 'No'}
                                                </span>
                                            } />
                                            <KV label="Interval"       value={intervalLabel} />
                                            <KV label="End Date"       value={attrs.end_date ? format(new Date(attrs.end_date), 'dd MMM yyyy') : null} />
                                            <KV label="Occurrence #"   value={attrs.occurrence_number ?? null} />
                                        </div>
                                        <div>
                                            <KV label="Occurrence Limit"  value={attrs.occurrence_count ?? null} />
                                            <KV label="Est. Cost"         value={attrs.estimated_cost != null ? `₦${Number(attrs.estimated_cost).toLocaleString()}` : null} />
                                            <KV label="Target Odometer"   value={attrs.expected_odometer != null ? `${attrs.expected_odometer.toLocaleString()} KM` : null} />
                                            <KV label="Last Scheduled"    value={attrs.last_scheduled_at ? format(new Date(attrs.last_scheduled_at), 'dd MMM yyyy') : null} />
                                            <KV label="Notifications" value={
                                                <span className={cn('flex items-center gap-1.5', attrs.turn_on_notification ? 'text-emerald-600' : 'text-slate-400')}>
                                                    {attrs.turn_on_notification ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                                                    {attrs.turn_on_notification ? 'On' : 'Off'}
                                                </span>
                                            } />
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        {/* Assignment & Vendor */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-6">
                                <SectionHeader icon={Store} color="bg-indigo-50" iconColor="text-indigo-600">
                                    Assignment &amp; Vendor
                                </SectionHeader>

                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                            <Store className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Vendor</p>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {vendor?.name ?? <span className="text-slate-400 font-normal italic">Not assigned</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <Button size="sm" variant={vendor ? 'ghost' : 'outline'} onClick={() => setAssignVendorOpen(true)} className="text-xs">
                                            {vendor ? 'Reassign' : <><Plus className="mr-1 h-3.5 w-3.5" />Assign Vendor</>}
                                        </Button>
                                    )}
                                </div>

                                {assignedBy && (
                                    <>
                                        <Separator className="my-3" />
                                        <div className="flex items-center gap-3 py-1">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                                <User className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned By</p>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {`${assignedBy.f_name ?? ''} ${assignedBy.l_name ?? ''}`.trim() || '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Checklists */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-7 w-7 bg-amber-50 rounded-lg flex items-center justify-center">
                                            <ListChecks className="h-3.5 w-3.5 text-amber-600" />
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Checklist</span>
                                    </div>
                                    {checklists.length > 0 && (
                                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {checklists.length} items
                                        </span>
                                    )}
                                </div>

                                {checkQ.isLoading ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                                    </div>
                                ) : checklists.length > 0 ? (
                                    <ul className="space-y-2">
                                        {checklists.map((item, i) => (
                                            <li key={item.id ?? i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="h-4 w-4 rounded border-2 border-slate-300 bg-white shrink-0" />
                                                <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="flex flex-col items-center py-8 gap-2">
                                        <ListChecks className="h-8 w-8 text-slate-200" />
                                        <p className="text-sm text-slate-400">No checklist items attached</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Work Logs Timeline */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 bg-slate-900 rounded-lg flex items-center justify-center">
                                    <Activity className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Work Logs</span>
                                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
                                    {logs.length}
                                </span>
                            </div>

                            {logsQ.isLoading ? (
                                <div className="bg-white rounded-2xl border border-slate-200 flex justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                                    <div className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Wrench className="h-7 w-7 text-slate-200" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 mb-1">No work logs yet</p>
                                    <p className="text-xs text-slate-400">
                                        {vendor ? 'Work logs will appear here once created.' : 'Assign a vendor to this schedule first.'}
                                    </p>
                                </div>
                            ) : (
                                logs.map(log => (
                                    <WorkLogCard
                                        key={log.id}
                                        log={log}
                                        expanded={expandedLogs.has(log.id)}
                                        onToggle={() => toggleLog(log.id)}
                                        canAct={canAct}
                                        canManage={canManage}
                                        onWorkflowAction={(action, title, description) =>
                                            setWorkflowModal({ logId: log.id, action, title, description })
                                        }
                                        onUpdateProgress={() => setProgressModal({ logId: log.id })}
                                        onAddPart={() => setAddPartModal({ logId: log.id })}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Right (1/3) ── */}
                    <div className="space-y-5">

                        {/* Vehicle */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-5">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Vehicle</p>
                                {vehicle ? (
                                    <Link
                                        href={`/vehicles/${vehicle.id}`}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                                    >
                                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                                            <Car className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 truncate">{vehicle.registration_number}</p>
                                            <p className="text-[11px] text-slate-400 font-medium">{vehicle.make} {vehicle.model}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 shrink-0" />
                                    </Link>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No vehicle linked</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Series info */}
                        {(attrs.is_recurring || attrs.series_id) && (
                            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                <CardContent className="p-5">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Recurrence Series</p>
                                    <KV label="Occurrence" value={`${attrs.occurrence_number ?? '—'} of ${attrs.occurrence_count ?? '∞'}`} />
                                    {attrs.series_id && <KV label="Series ID" value={attrs.series_id} mono />}
                                    {attrs.is_master_schedule && (
                                        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                                            <Hash className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                            <span className="text-[11px] font-semibold text-blue-700">Master schedule</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Notifications */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-5">
                                <div className={cn(
                                    'flex items-center gap-3 p-3.5 rounded-xl border',
                                    attrs.turn_on_notification
                                        ? 'bg-emerald-50 border-emerald-100'
                                        : 'bg-slate-50 border-slate-100'
                                )}>
                                    {attrs.turn_on_notification
                                        ? <Bell className="h-4 w-4 text-emerald-600 shrink-0" />
                                        : <BellOff className="h-4 w-4 text-slate-400 shrink-0" />
                                    }
                                    <div>
                                        <p className={cn('text-sm font-semibold', attrs.turn_on_notification ? 'text-emerald-700' : 'text-slate-500')}>
                                            {attrs.turn_on_notification ? 'Notifications on' : 'Notifications off'}
                                        </p>
                                        <p className="text-[11px] text-slate-400">Reminder alerts</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Record info */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-5">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Record Info</p>
                                <KV label="Reference" value={reference} mono />
                                <KV label="Priority" value={
                                    attrs.priority
                                        ? <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-semibold', PRIORITY_CFG[attrs.priority]?.pill ?? '')}>{priorityCfg.label}</Badge>
                                        : null
                                } />
                                <KV label="Created"  value={attrs.created_at ? format(new Date(attrs.created_at), 'dd MMM yyyy') : null} />
                                <KV label="Updated"  value={attrs.updated_at ? format(new Date(attrs.updated_at), 'dd MMM yyyy') : null} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}

            <AssignVendorModal
                open={assignVendorOpen}
                onClose={() => setAssignVendorOpen(false)}
                vendors={vendorList}
                isPending={assignVendorMut.isPending}
                onAssign={(vid) => assignVendorMut.mutate(vid)}
            />

            {workflowModal && (
                <WorkflowActionModal
                    open
                    title={workflowModal.title}
                    description={workflowModal.description}
                    action={workflowModal.action}
                    logId={workflowModal.logId}
                    vendors={workflowModal.action === 'assign' ? vendorList : []}
                    onClose={() => setWorkflowModal(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['maintenance-logs-schedule', id] })
                        setWorkflowModal(null)
                    }}
                />
            )}

            {progressModal && (
                <UpdateProgressModal
                    open
                    logId={progressModal.logId}
                    onClose={() => setProgressModal(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['maintenance-logs-schedule', id] })
                        setProgressModal(null)
                    }}
                />
            )}

            {addPartModal && (
                <AddPartModal
                    open
                    logId={addPartModal.logId}
                    onClose={() => setAddPartModal(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['log-parts', addPartModal.logId] })
                        setAddPartModal(null)
                    }}
                />
            )}
        </div>
    )
}

// ─── WorkLogCard ──────────────────────────────────────────────────────────────

function WorkLogCard({
    log, expanded, onToggle, canAct, canManage, onWorkflowAction, onUpdateProgress, onAddPart,
}: {
    log: MaintenanceLog
    expanded: boolean
    onToggle: () => void
    canAct: boolean
    canManage: boolean
    onWorkflowAction: (action: 'start' | 'complete' | 'verify' | 'cancel' | 'assign', title: string, desc: string) => void
    onUpdateProgress: () => void
    onAddPart: () => void
}) {
    const queryClient = useQueryClient()
    const { status } = log.attributes
    const vendor     = log.relationships.vendor
    const tech       = log.relationships.technician
    const techName   = tech ? `${tech.f_name ?? ''} ${tech.l_name ?? ''}`.trim() : null
    const logRef     = (log.attributes as any).reference ?? `WL-${String(log.id).padStart(4, '0')}`
    const statusCfg  = STATUS_CFG[status] ?? STATUS_CFG.pending
    const progress   = log.attributes.progress_percent ?? 0

    const partsQ = useQuery({
        queryKey: ['log-parts', log.id],
        queryFn: () => getLogParts(log.id),
        enabled: expanded,
    })

    const delPartMut = useMutation({
        mutationFn: (partId: string | number) => deleteLogPart(log.id, partId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['log-parts', log.id] }); toast.success('Part removed') },
        onError: () => toast.error('Failed to remove part'),
    })

    const parts: MaintenancePart[]  = partsQ.data?.data?.parts ?? []
    const totalKobo = parts.reduce((s, p) => s + p.attributes.quantity * p.attributes.unit_price_kobo, 0)

    const actions: { key: string; label: string; variant: 'default' | 'outline'; icon: React.ElementType; fn: () => void }[] = []
    if (canManage && status === 'pending' && !vendor)
        actions.push({ key: 'assign', label: 'Assign', variant: 'default', icon: User, fn: () => onWorkflowAction('assign', 'Assign Log', 'Assign a vendor and/or technician to this work log.') })
    if (canAct && status === 'pending' && vendor)
        actions.push({ key: 'start', label: 'Start', variant: 'default', icon: Play, fn: () => onWorkflowAction('start', 'Start Work Log', 'Mark this log as in progress?') })
    if (canAct && status === 'in_progress') {
        actions.push({ key: 'complete', label: 'Complete', variant: 'default',  icon: CheckCircle2, fn: () => onWorkflowAction('complete', 'Complete Work Log', 'Mark this log as completed?') })
        actions.push({ key: 'progress', label: 'Progress',  variant: 'outline', icon: BarChart2,    fn: onUpdateProgress })
        actions.push({ key: 'cancel',   label: 'Cancel',    variant: 'outline', icon: X,            fn: () => onWorkflowAction('cancel', 'Cancel Work Log', 'Provide a reason for cancellation.') })
    }
    if (canManage && status === 'completed') {
        actions.push({ key: 'verify', label: 'Verify', variant: 'default', icon: ShieldCheck, fn: () => onWorkflowAction('verify', 'Verify Work Log', 'Verify and close this work log?') })
        actions.push({ key: 'cancel', label: 'Cancel', variant: 'outline', icon: X,           fn: () => onWorkflowAction('cancel', 'Cancel Work Log', 'Provide a reason for cancellation.') })
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', statusCfg.dot)} />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[13px] font-bold text-slate-900">{logRef}</span>
                                <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0', statusCfg.pill)}>
                                    {statusCfg.label}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {vendor && (
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <Store className="h-3 w-3 shrink-0" />{vendor.name}
                                    </span>
                                )}
                                {techName && (
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <User className="h-3 w-3 shrink-0" />{techName}
                                    </span>
                                )}
                                <span className="text-[11px] text-slate-400">
                                    {format(new Date(log.attributes.created_at), 'dd MMM yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {actions.slice(0, 2).map(({ key, label, variant, icon: Icon, fn }) => (
                            <Button key={key} size="sm" variant={variant} onClick={fn} className="text-xs h-8">
                                <Icon className="mr-1 h-3.5 w-3.5" />{label}
                            </Button>
                        ))}
                        {actions.slice(2).map(({ key, label, icon: Icon, fn }) => (
                            <Button key={key} size="sm" variant="ghost" onClick={fn} className="text-xs h-8 text-slate-500 hover:text-slate-700">
                                <Icon className="mr-1 h-3.5 w-3.5" />{label}
                            </Button>
                        ))}
                        <button onClick={onToggle} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                            {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>
                    </div>
                </div>

                {status === 'in_progress' && (
                    <div className="mt-3 space-y-1">
                        <div className="flex justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">Progress</span>
                            <span className="text-[11px] font-bold text-slate-600">{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
            </div>

            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5 space-y-6">

                    {/* Progress detail */}
                    {['in_progress', 'completed', 'verified'].includes(status) && (
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Progress Tracker</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={cn('h-full rounded-full transition-all',
                                            status === 'verified' ? 'bg-violet-500' :
                                            status === 'completed' ? 'bg-emerald-500' : 'bg-amber-400'
                                        )}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-sm font-black text-slate-700 shrink-0 w-10 text-right">{progress}%</span>
                            </div>
                            {log.attributes.notes && (
                                <p className="text-xs text-slate-500 mt-2 bg-white rounded-lg px-3 py-2 border border-slate-100 italic">
                                    {log.attributes.notes}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Parts */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Parts Used</p>
                            {canAct && status === 'in_progress' && (
                                <Button size="sm" variant="outline" onClick={onAddPart} className="text-xs h-7">
                                    <Plus className="mr-1 h-3 w-3" />Add Part
                                </Button>
                            )}
                        </div>

                        {partsQ.isLoading ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-slate-300" /></div>
                        ) : parts.length > 0 ? (
                            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                                <table className="w-full text-[12px]">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/80">
                                            <th className="text-left px-3 py-2 font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Part</th>
                                            <th className="text-right px-3 py-2 font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Qty</th>
                                            <th className="text-right px-3 py-2 font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Unit (₦)</th>
                                            <th className="text-right px-3 py-2 font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Subtotal</th>
                                            {canAct && status === 'in_progress' && <th className="w-10" />}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {parts.map(part => {
                                            const unit    = part.attributes.unit_price_kobo / 100
                                            const subtotal = part.attributes.quantity * unit
                                            return (
                                                <tr key={part.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-3 py-2.5 font-medium text-slate-800">{part.attributes.name}</td>
                                                    <td className="px-3 py-2.5 text-right text-slate-500">{part.attributes.quantity}</td>
                                                    <td className="px-3 py-2.5 text-right text-slate-500">₦{unit.toLocaleString()}</td>
                                                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">₦{subtotal.toLocaleString()}</td>
                                                    {canAct && status === 'in_progress' && (
                                                        <td className="px-2 py-2.5 text-right">
                                                            <button
                                                                onClick={() => delPartMut.mutate(part.id)}
                                                                className="h-6 w-6 rounded flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors mx-auto"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-slate-200 bg-slate-50">
                                            <td colSpan={canAct && status === 'in_progress' ? 3 : 3}
                                                className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                Total Cost
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-black text-slate-900">
                                                ₦{(totalKobo / 100).toLocaleString()}
                                            </td>
                                            {canAct && status === 'in_progress' && <td />}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 py-3 text-slate-400">
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="text-xs italic">No parts recorded yet</span>
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attachments</p>
                            {canAct && ['in_progress', 'completed'].includes(status) && (
                                <AttachmentUploadBtn logId={log.id} />
                            )}
                        </div>
                        <div className="flex items-center gap-2 py-2 text-slate-400">
                            <Paperclip className="h-4 w-4 shrink-0" />
                            <span className="text-xs italic">No attachments yet</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Attachment upload button ─────────────────────────────────────────────────

function AttachmentUploadBtn({ logId }: { logId: string | number }) {
    const ref = React.useRef<HTMLInputElement>(null)
    const { mutate, isPending } = useMutation({
        mutationFn: (file: File) => { const fd = new FormData(); fd.append('file', file); return uploadLogAttachment(logId, fd) },
        onSuccess: () => toast.success('Attachment uploaded'),
        onError: () => toast.error('Upload failed'),
    })
    return (
        <>
            <Button size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={isPending} className="text-xs h-7">
                {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Paperclip className="mr-1 h-3 w-3" />}
                Attach
            </Button>
            <input ref={ref} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) mutate(f); e.target.value = '' }} />
        </>
    )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function WorkflowActionModal({
    open, title, description, action, logId, vendors, onClose, onSuccess,
}: {
    open: boolean; title: string; description: string
    action: string; logId: string | number; vendors: any[]
    onClose: () => void; onSuccess: () => void
}) {
    const [note,        setNote]        = useState('')
    const [vendorId,    setVendorId]    = useState('')
    const [techId,      setTechId]      = useState('')

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            if (action === 'start')    return startLog(logId)
            if (action === 'complete') return completeLog(logId)
            if (action === 'verify')   return verifyLog(logId)
            if (action === 'cancel')   return cancelLog(logId, note || 'No reason provided')
            if (action === 'assign')   return assignLog(logId, {
                ...(vendorId ? { vendor_id: Number(vendorId) } : {}),
                ...(techId   ? { technician_id: Number(techId) } : {}),
            })
        },
        onSuccess: () => {
            toast.success(`${title} successful`)
            setNote(''); setVendorId(''); setTechId('')
            onSuccess()
        },
        onError: () => toast.error(`${title} failed`),
    })

    return (
        <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {action === 'assign' && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Vendor</Label>
                                <Select value={vendorId} onValueChange={setVendorId}>
                                    <SelectTrigger><SelectValue placeholder="Select vendor…" /></SelectTrigger>
                                    <SelectContent>
                                        {vendors.map((v: any) => (
                                            <SelectItem key={v.id} value={String(v.id)}>
                                                {v.attributes?.business_name ?? `Vendor ${v.id}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Technician ID (optional)</Label>
                                <Input placeholder="e.g. 42" value={techId} onChange={e => setTechId(e.target.value)} />
                            </div>
                        </>
                    )}
                    {action === 'cancel' && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Reason <span className="text-rose-500">*</span></Label>
                            <Textarea
                                placeholder="Provide a reason for cancellation…"
                                value={note} onChange={e => setNote(e.target.value)}
                                className="resize-none h-24"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button
                        onClick={() => mutate()}
                        disabled={isPending || (action === 'cancel' && !note.trim())}
                        variant={action === 'cancel' ? 'destructive' : 'default'}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AssignVendorModal({
    open, onClose, vendors, isPending, onAssign,
}: {
    open: boolean; onClose: () => void; vendors: any[]
    isPending: boolean; onAssign: (vid: string | number) => void
}) {
    const [vendorId, setVendorId] = useState('')
    return (
        <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Vendor</DialogTitle>
                    <DialogDescription>Select a vendor for this maintenance schedule.</DialogDescription>
                </DialogHeader>
                <div className="py-3">
                    <Select value={vendorId} onValueChange={setVendorId}>
                        <SelectTrigger><SelectValue placeholder="Select vendor…" /></SelectTrigger>
                        <SelectContent>
                            {vendors.map((v: any) => (
                                <SelectItem key={v.id} value={String(v.id)}>
                                    {v.attributes?.business_name ?? `Vendor ${v.id}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button onClick={() => vendorId && onAssign(vendorId)} disabled={!vendorId || isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function UpdateProgressModal({ open, logId, onClose, onSuccess }: {
    open: boolean; logId: string | number; onClose: () => void; onSuccess: () => void
}) {
    const [pct,  setPct]  = useState(0)
    const [note, setNote] = useState('')

    const { mutate, isPending } = useMutation({
        mutationFn: () => updateLogProgress(logId, { progress: pct, note: note || undefined }),
        onSuccess: () => { toast.success('Progress updated'); onSuccess() },
        onError: () => toast.error('Failed to update progress'),
    })

    return (
        <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Progress</DialogTitle>
                    <DialogDescription>Set the current completion percentage for this work log.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Completion</Label>
                            <span className="text-lg font-black text-slate-800">{pct}%</span>
                        </div>
                        <input
                            type="range" min={0} max={100} step={5} value={pct}
                            onChange={e => setPct(Number(e.target.value))}
                            className="w-full accent-blue-600"
                        />
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Notes (optional)</Label>
                        <Textarea
                            placeholder="What was done so far…"
                            value={note} onChange={e => setNote(e.target.value)}
                            className="resize-none h-20"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button onClick={() => mutate()} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AddPartModal({ open, logId, onClose, onSuccess }: {
    open: boolean; logId: string | number; onClose: () => void; onSuccess: () => void
}) {
    const [name,       setName]       = useState('')
    const [qty,        setQty]        = useState(1)
    const [priceNaira, setPriceNaira] = useState('')
    const [supplier,   setSupplier]   = useState('')

    const { mutate, isPending } = useMutation({
        mutationFn: () => addLogPart(logId, {
            name, quantity: qty,
            unit_price_kobo: Math.round(parseFloat(priceNaira || '0') * 100),
            supplier: supplier || undefined,
        }),
        onSuccess: () => {
            toast.success('Part added')
            setName(''); setQty(1); setPriceNaira(''); setSupplier('')
            onSuccess()
        },
        onError: () => toast.error('Failed to add part'),
    })

    const price   = parseFloat(priceNaira || '0')
    const canSave = name.trim() && qty > 0 && price > 0

    return (
        <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Part</DialogTitle>
                    <DialogDescription>Record a part or material used in this work log.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Part Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="e.g. Oil Filter" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Quantity <span className="text-rose-500">*</span></Label>
                            <Input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Unit Price (₦) <span className="text-rose-500">*</span></Label>
                            <Input type="number" min={0} step="0.01" placeholder="0.00" value={priceNaira} onChange={e => setPriceNaira(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Supplier (optional)</Label>
                        <Input placeholder="Supplier name" value={supplier} onChange={e => setSupplier(e.target.value)} />
                    </div>
                    {canSave && (
                        <div className="flex justify-between items-center text-sm bg-blue-50 rounded-xl px-4 py-2.5 border border-blue-100">
                            <span className="text-slate-500 font-medium">Subtotal</span>
                            <span className="font-black text-slate-900">₦{(qty * price).toLocaleString()}</span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button onClick={() => mutate()} disabled={!canSave || isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Part
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
