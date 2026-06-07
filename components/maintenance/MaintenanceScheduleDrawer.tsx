'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import {
    AlertTriangle, Bell, CheckCircle2, Clock, Wrench,
    XCircle, Calendar, Activity,
} from 'lucide-react'
import { getLogsBySchedule, getMaintenanceAlerts } from '@/lib/api/maintenance'
import { ScheduleDetailContent } from './ScheduleDetailContent'
import type { MaintenanceLog, MaintenanceAlert } from '@/types'

// ── Log status config ─────────────────────────────────────────────────────────

const LOG_STATUS: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending:     { label: 'Pending',     className: 'bg-blue-50 text-blue-600 border-blue-100',     icon: Clock        },
    in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-600 border-amber-100',  icon: Activity     },
    completed:   { label: 'Completed',   className: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 },
    verified:    { label: 'Verified',    className: 'bg-teal-50 text-teal-600 border-teal-100',     icon: CheckCircle2 },
    cancelled:   { label: 'Cancelled',   className: 'bg-slate-50 text-slate-500 border-slate-100',  icon: XCircle      },
}

const ALERT_STATUS: Record<string, { label: string; className: string }> = {
    triggered:          { label: 'Triggered',         className: 'bg-amber-50 text-amber-600 border-amber-100'   },
    acknowledged:       { label: 'Acknowledged',      className: 'bg-blue-50 text-blue-600 border-blue-100'      },
    snoozed:            { label: 'Snoozed',           className: 'bg-slate-50 text-slate-500 border-slate-100'   },
    overdue:            { label: 'Overdue',           className: 'bg-rose-50 text-rose-600 border-rose-100'      },
    work_order_created: { label: 'Work Order',        className: 'bg-purple-50 text-purple-600 border-purple-100'},
    closed:             { label: 'Closed',            className: 'bg-slate-50 text-slate-400 border-slate-100'   },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LogItem({ log }: { log: MaintenanceLog }) {
    const a = log.attributes
    const cfg = LOG_STATUS[a.status] ?? { label: a.status, className: 'bg-slate-50 text-slate-500 border-slate-100', icon: Clock }
    const Icon = cfg.icon

    return (
        <div className="px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Wrench className="h-3 w-3 text-slate-300 shrink-0" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
                        {a.ticket_number ?? `Log #${log.id}`}
                    </span>
                </div>
                <Badge
                    variant="outline"
                    className={cn('text-[9px] font-black uppercase tracking-widest px-1.5 py-0 h-5 shrink-0 flex items-center gap-1', cfg.className)}
                >
                    <Icon className="h-2.5 w-2.5" />
                    {cfg.label}
                </Badge>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400">
                {a.due_date && (
                    <div className="flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>Due {format(new Date(a.due_date), 'dd MMM yyyy')}</span>
                    </div>
                )}
                {a.perform_date && (
                    <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                        <span>{format(new Date(a.perform_date), 'dd MMM yyyy')}</span>
                    </div>
                )}
            </div>
            {a.description && (
                <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed line-clamp-2">{a.description}</p>
            )}
        </div>
    )
}

function AlertItem({ alert }: { alert: MaintenanceAlert }) {
    const a = alert.attributes
    const cfg = ALERT_STATUS[a.status] ?? { label: a.status, className: 'bg-slate-50 text-slate-500 border-slate-100' }

    return (
        <div className="px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Bell className="h-3 w-3 text-slate-300 shrink-0" />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest truncate">
                        {a.alert_type === 'due' ? 'Due Now' : 'Approaching'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                        · {a.threshold_type}
                    </span>
                </div>
                <Badge
                    variant="outline"
                    className={cn('text-[9px] font-black uppercase tracking-widest px-1.5 py-0 h-5 shrink-0', cfg.className)}
                >
                    {cfg.label}
                </Badge>
            </div>
            {a.triggered_at && (
                <p className="text-[9px] font-bold text-slate-400">
                    Triggered {formatDistanceToNow(new Date(a.triggered_at), { addSuffix: true })}
                </p>
            )}
            {a.snooze_expires_at && a.status === 'snoozed' && (
                <p className="mt-1 text-[9px] font-bold text-amber-500">
                    Resumes {formatDistanceToNow(new Date(a.snooze_expires_at), { addSuffix: true })}
                </p>
            )}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
    scheduleId: string | null
    onClose: () => void
}

export function MaintenanceScheduleDrawer({ scheduleId, onClose }: Props) {
    const [isFullWidth, setIsFullWidth] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        if (!scheduleId) setIsFullWidth(false)
    }, [scheduleId])

    const handleExpand = () => {
        setIsFullWidth(true)
        window.history.pushState({}, '', `/maintenance/schedules/${scheduleId}?width=full`)
    }

    const handleCollapse = () => {
        setIsFullWidth(false)
        window.history.replaceState({}, '', pathname)
    }

    const handleClose = () => {
        window.history.replaceState({}, '', pathname)
        setIsFullWidth(false)
        onClose()
    }

    const { data: logsData, isLoading: logsLoading } = useQuery({
        queryKey: ['schedule-logs', scheduleId],
        queryFn: () => getLogsBySchedule(scheduleId!),
        enabled: !!scheduleId,
    })

    const { data: alertsData, isLoading: alertsLoading } = useQuery({
        queryKey: ['schedule-alerts', scheduleId],
        queryFn: () => getMaintenanceAlerts({ schedule_id: scheduleId! }),
        enabled: !!scheduleId,
    })

    const logs: MaintenanceLog[] = logsData?.data?.logs ?? []
    const alerts: MaintenanceAlert[] = alertsData?.data?.alerts ?? []

    return (
        <Sheet open={!!scheduleId} onOpenChange={(open) => { if (!open) handleClose() }}>
            <SheetContent
                side="right"
                className={cn(
                    'p-0 flex flex-col gap-0 overflow-hidden transition-[max-width] duration-300 ease-in-out',
                    isFullWidth ? 'w-screen !max-w-full' : 'w-full sm:max-w-[1180px] xl:max-w-[1280px]',
                )}
            >
                <SheetTitle className="sr-only">Maintenance Schedule Detail</SheetTitle>

                <div className="flex-1 flex flex-row overflow-hidden min-h-0">
                    {/* ── LEFT PANEL — work logs + alerts ──────────────── */}
                    <section className="w-full lg:w-[360px] xl:w-[400px] shrink-0 border-r border-slate-100 flex flex-col min-h-0 bg-slate-50/40">
                        <Tabs defaultValue="logs" className="flex-1 flex flex-col min-h-0">
                            <TabsList className="shrink-0 w-full justify-start rounded-none border-b border-slate-100 bg-white px-4 h-11 gap-0">
                                <TabsTrigger
                                    value="logs"
                                    className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3 gap-1.5"
                                >
                                    <Wrench className="h-3 w-3" />
                                    Work Logs
                                    {logs.length > 0 && (
                                        <span className="ml-1 text-[8px] font-black bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                                            {logs.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="alerts"
                                    className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3 gap-1.5"
                                >
                                    <Bell className="h-3 w-3" />
                                    Alerts
                                    {alerts.filter(a => !['closed'].includes(a.attributes.status)).length > 0 && (
                                        <span className="ml-1 text-[8px] font-black bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5">
                                            {alerts.filter(a => !['closed'].includes(a.attributes.status)).length}
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            {/* Work Logs tab */}
                            <TabsContent value="logs" className="flex-1 overflow-hidden m-0 min-h-0">
                                <ScrollArea className="h-full">
                                    {logsLoading ? (
                                        <div className="p-4 space-y-2">
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <Skeleton key={i} className="h-16 rounded-xl" />
                                            ))}
                                        </div>
                                    ) : logs.length === 0 ? (
                                        <div className="py-14 flex flex-col items-center gap-2">
                                            <Wrench className="h-6 w-6 text-slate-200" />
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                No work logs yet
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {logs.map((log) => (
                                                <LogItem key={log.id} log={log} />
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            {/* Alerts tab */}
                            <TabsContent value="alerts" className="flex-1 overflow-hidden m-0 min-h-0">
                                <ScrollArea className="h-full">
                                    {alertsLoading ? (
                                        <div className="p-4 space-y-2">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <Skeleton key={i} className="h-14 rounded-xl" />
                                            ))}
                                        </div>
                                    ) : alerts.length === 0 ? (
                                        <div className="py-14 flex flex-col items-center gap-2">
                                            <Bell className="h-6 w-6 text-slate-200" />
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                No alerts for this schedule
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {alerts.map((alert) => (
                                                <AlertItem key={alert.id} alert={alert} />
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </section>

                    {/* ── RIGHT — schedule detail ──────────────────────── */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <ScheduleDetailContent
                            scheduleId={scheduleId}
                            mode="drawer"
                            isFullWidth={isFullWidth}
                            onExpandFull={handleExpand}
                            onCollapse={handleCollapse}
                            onClose={handleClose}
                        />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
