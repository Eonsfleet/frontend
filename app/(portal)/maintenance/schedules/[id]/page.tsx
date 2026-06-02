'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getScheduleById } from '@/lib/api/maintenance'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import {
    ChevronLeft,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Calendar,
    Wrench,
    RefreshCw,
    Bell,
    BellOff,
    Gauge,
    Hash,
    Layers,
    Info,
    ListChecks,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ── helpers ───────────────────────────────────────────────────────────────────

const getStatusConfig = (status: string, dueDate?: string) => {
    const overdue = dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate)) && status !== 'completed'
    if (overdue) return { label: 'Overdue', icon: AlertTriangle, pill: 'bg-rose-50 text-rose-600 border-rose-100', bar: 'bg-rose-500' }
    switch (status.toLowerCase()) {
        case 'pending':
        case 'upcoming':
            return { label: 'Pending', icon: Clock, pill: 'bg-blue-50 text-blue-600 border-blue-100', bar: 'bg-blue-500' }
        case 'completed':
            return { label: 'Completed', icon: CheckCircle2, pill: 'bg-emerald-50 text-emerald-600 border-emerald-100', bar: 'bg-emerald-500' }
        case 'cancelled':
            return { label: 'Cancelled', icon: AlertTriangle, pill: 'bg-slate-50 text-slate-500 border-slate-100', bar: 'bg-slate-400' }
        default:
            return { label: status, icon: Calendar, pill: 'bg-slate-50 text-slate-600 border-slate-100', bar: 'bg-slate-400' }
    }
}

const getDueBadge = (dueDate?: string) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    const diff = differenceInDays(date, new Date())
    if (isPast(date) && !isToday(date)) return <span className="text-rose-600 font-black text-[10px] uppercase tracking-widest">Overdue by {Math.abs(diff)}d</span>
    if (isToday(date)) return <span className="text-amber-600 font-black text-[10px] uppercase tracking-widest">Due Today</span>
    if (diff <= 7) return <span className="text-blue-600 font-black text-[10px] uppercase tracking-widest">Due in {diff}d</span>
    return <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">In {diff} days</span>
}

// ── detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 pt-0.5">{label}</span>
            <span className={cn('text-xs font-bold text-slate-800 text-right', mono && 'font-mono')}>{value ?? <span className="text-slate-300">—</span>}</span>
        </div>
    )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function MaintenanceScheduleDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['maintenance-schedule', id],
        queryFn: () => getScheduleById(id),
        enabled: !!id,
    })

    if (isLoading) {
        return (
            <div className="flex h-full min-h-[60vh] items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0055FF]" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Schedule</p>
                </div>
            </div>
        )
    }

    if (isError || !data?.data?.schedule) {
        return (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
                <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-6 py-4 text-rose-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm font-black uppercase tracking-widest">Failed to load schedule</span>
                </div>
                <button
                    onClick={() => router.back()}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors"
                >
                    ← Go Back
                </button>
            </div>
        )
    }

    const schedule = data.data.schedule
    const attrs = schedule.attributes
    const vehicle = schedule.relationships?.vehicle
    const checklists: any[] = (schedule.relationships as any)?.checklists ?? []
    const statusCfg = getStatusConfig(attrs.status, attrs.due_date)
    const StatusIcon = statusCfg.icon

    const intervalLabel = attrs.schedule_type === 'mileage'
        ? `${(attrs.interval_value ?? 0).toLocaleString()} ${(attrs.interval_unit ?? 'miles').toUpperCase()}`
        : `${attrs.interval_value ?? 0} ${(attrs.interval_unit ?? 'months').toUpperCase()}`

    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-full">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="h-10 w-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-slate-600" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
                                Schedule <span className="text-[#0055FF]">#{schedule.id}</span>
                            </h1>
                            <Badge
                                variant="outline"
                                className={cn('text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border flex items-center gap-1.5', statusCfg.pill)}
                            >
                                <StatusIcon className="h-3 w-3" />
                                {statusCfg.label}
                            </Badge>
                        </div>
                        <p className="text-slate-400 mt-1.5 font-bold italic text-[11px] uppercase tracking-widest flex items-center gap-2">
                            <span className="h-1 w-8 bg-[#0055FF] rounded-full" />
                            {(attrs.service_type ?? 'Maintenance').replace(/_/g, ' ')} · {attrs.schedule_type?.toUpperCase()} Schedule
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-5 h-10 rounded-xl border border-slate-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
            </div>

            {/* ── Status bar ── */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={cn('h-full w-2/3 rounded-full transition-all duration-700', statusCfg.bar)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── Left: core details ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Due date hero */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[28px]">
                        <div className={cn('h-1.5 w-full', statusCfg.bar)} />
                        <CardContent className="p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</p>
                                    <p className="text-4xl font-black tracking-tighter text-slate-900">
                                        {attrs.due_date ? format(new Date(attrs.due_date), 'dd MMM yyyy') : '—'}
                                    </p>
                                    <div className="mt-1">{getDueBadge(attrs.due_date)}</div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="text-center space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interval</p>
                                        <p className="text-xl font-black text-slate-900 tracking-tight">{intervalLabel}</p>
                                    </div>
                                    {attrs.expected_odometer != null && (
                                        <div className="text-center space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target ODO</p>
                                            <p className="text-xl font-black text-slate-900 tracking-tight">{attrs.expected_odometer.toLocaleString()} KM</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Schedule details */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[28px]">
                        <CardHeader className="border-b border-slate-50 px-8 py-6">
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                <div className="h-5 w-1.5 bg-[#0055FF] rounded-full" />
                                Schedule Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 py-2">
                            <DetailRow label="Service Type" value={(attrs.service_type ?? '—').replace(/_/g, ' ').toUpperCase()} />
                            <DetailRow label="Schedule Type" value={attrs.schedule_type?.toUpperCase()} />
                            <DetailRow label="Interval" value={intervalLabel} />
                            <DetailRow label="Interval Unit" value={attrs.interval_unit?.toUpperCase()} />
                            <DetailRow label="Schedule Date" value={attrs.schedule_date ? format(new Date(attrs.schedule_date), 'dd MMM yyyy, HH:mm') : null} />
                            <DetailRow label="Last Scheduled" value={attrs.last_scheduled_at ? format(new Date(attrs.last_scheduled_at), 'dd MMM yyyy') : null} />
                            <DetailRow label="Description" value={attrs.description || <span className="text-slate-300">No description provided</span>} />
                        </CardContent>
                    </Card>

                    {/* Recurrence */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[28px]">
                        <CardHeader className="border-b border-slate-50 px-8 py-6">
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                <div className="h-5 w-1.5 bg-indigo-500 rounded-full" />
                                Recurrence
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 py-2">
                            <DetailRow
                                label="Recurring"
                                value={
                                    <span className={cn('font-black uppercase text-[10px] tracking-widest', attrs.is_recurring ? 'text-emerald-600' : 'text-slate-400')}>
                                        {attrs.is_recurring ? 'Yes' : 'No'}
                                    </span>
                                }
                            />
                            <DetailRow label="Occurrence #" value={attrs.occurrence_number ?? null} />
                            <DetailRow label="Occurrence Count" value={attrs.occurrence_count ?? null} />
                            <DetailRow label="Master Schedule" value={attrs.is_master_schedule ? 'Yes' : 'No'} />
                            <DetailRow label="Parent Schedule ID" value={attrs.parent_schedule_id ?? null} mono />
                            <DetailRow label="Series ID" value={attrs.series_id ?? null} mono />
                            <DetailRow label="End Date" value={attrs.end_date ? format(new Date(attrs.end_date), 'dd MMM yyyy') : null} />
                        </CardContent>
                    </Card>

                    {/* Checklists */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[28px]">
                        <CardHeader className="border-b border-slate-50 px-8 py-6">
                            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                <div className="h-5 w-1.5 bg-amber-500 rounded-full" />
                                Checklists
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 py-6">
                            {checklists.length > 0 ? (
                                <ul className="space-y-2">
                                    {checklists.map((item: any, i: number) => (
                                        <li key={item.id ?? i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="h-6 w-6 rounded-lg bg-[#0055FF]/10 flex items-center justify-center shrink-0">
                                                <ListChecks className="h-3.5 w-3.5 text-[#0055FF]" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{item.name ?? `Item ${i + 1}`}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 gap-2">
                                    <ListChecks className="h-8 w-8 text-slate-200" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No checklists attached</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right: meta sidebar ── */}
                <div className="space-y-6">

                    {/* Vehicle */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[28px]">
                        <CardHeader className="border-b border-slate-50 px-6 py-5">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Wrench className="h-3.5 w-3.5" /> Asset
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 py-5">
                            {vehicle ? (
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shrink-0">
                                        <Wrench className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{vehicle.registration_number ?? '—'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{vehicle.make} {vehicle.model}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No vehicle linked</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notification */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[28px]">
                        <CardHeader className="border-b border-slate-50 px-6 py-5">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Bell className="h-3.5 w-3.5" /> Notifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 py-5">
                            <div className={cn(
                                'flex items-center gap-3 p-3 rounded-xl border',
                                attrs.turn_on_notification
                                    ? 'bg-emerald-50 border-emerald-100'
                                    : 'bg-slate-50 border-slate-100'
                            )}>
                                {attrs.turn_on_notification
                                    ? <Bell className="h-4 w-4 text-emerald-600 shrink-0" />
                                    : <BellOff className="h-4 w-4 text-slate-400 shrink-0" />
                                }
                                <span className={cn(
                                    'text-[10px] font-black uppercase tracking-widest',
                                    attrs.turn_on_notification ? 'text-emerald-700' : 'text-slate-400'
                                )}>
                                    {attrs.turn_on_notification ? 'Notifications On' : 'Notifications Off'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cost */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[28px]">
                        <CardHeader className="border-b border-slate-50 px-6 py-5">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Gauge className="h-3.5 w-3.5" /> Cost Estimate
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 py-5">
                            {attrs.estimated_cost != null ? (
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                    ₦{Number(attrs.estimated_cost).toLocaleString()}
                                </p>
                            ) : (
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Not estimated</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timestamps */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[28px]">
                        <CardHeader className="border-b border-slate-50 px-6 py-5">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Info className="h-3.5 w-3.5" /> Record Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 py-2">
                            <DetailRow label="Schedule ID" value={String(schedule.id)} mono />
                            <DetailRow
                                label="Created"
                                value={attrs.created_at ? format(new Date(attrs.created_at), 'dd MMM yyyy, HH:mm') : null}
                            />
                            <DetailRow
                                label="Updated"
                                value={attrs.updated_at ? format(new Date(attrs.updated_at), 'dd MMM yyyy, HH:mm') : null}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
