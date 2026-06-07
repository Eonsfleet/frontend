'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
    getMaintenanceAlertById,
    acknowledgeMaintenanceAlert,
    closeMaintenanceAlert,
    getAlertHistory,
    getAlertConversation,
    postAlertMessage,
} from '@/lib/api/maintenance'
import { SnoozeAlertDialog } from './SnoozeAlertDialog'
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog'
import { WorkflowTimeline } from '@/components/shared/WorkflowTimeline'
import {
    AlertTriangle, BellRing, Eye, Clock, Wrench, CheckCircle2,
    Loader2, Car, Calendar, Send, MessageSquare, ChevronRight,
    Zap, Activity,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { MaintenanceAlert } from '@/types'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; Icon: React.ComponentType<{ className?: string }> }> = {
    triggered:          { label: 'Triggered',       color: 'text-amber-600 bg-amber-50',    border: 'border-l-amber-400',   Icon: BellRing      },
    overdue:            { label: 'Overdue',          color: 'text-rose-600 bg-rose-50',      border: 'border-l-rose-500',    Icon: AlertTriangle  },
    acknowledged:       { label: 'Acknowledged',     color: 'text-blue-600 bg-blue-50',      border: 'border-l-blue-400',    Icon: Eye            },
    snoozed:            { label: 'Snoozed',          color: 'text-slate-500 bg-slate-100',   border: 'border-l-slate-300',   Icon: Clock          },
    work_order_created: { label: 'Work Order Open',  color: 'text-indigo-600 bg-indigo-50',  border: 'border-l-indigo-400',  Icon: Wrench         },
    closed:             { label: 'Closed',           color: 'text-emerald-600 bg-emerald-50',border: 'border-l-emerald-400', Icon: CheckCircle2   },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.triggered
    return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest', cfg.color)}>
            <cfg.Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    )
}

// ── Label / value helpers ─────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <div className="text-xs font-bold text-slate-900">{value}</div>
        </div>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">{children}</p>
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
    alertId: string | null
    onClose: () => void
}

export function MaintenanceAlertDrawer({ alertId, onClose }: Props) {
    const queryClient = useQueryClient()
    const [snoozeOpen, setSnoozeOpen] = useState(false)
    const [workOrderOpen, setWorkOrderOpen] = useState(false)
    const [messageText, setMessageText] = useState('')

    // ── Queries ──────────────────────────────────────────────────────────────
    const { data: detailData, isLoading, isError } = useQuery({
        queryKey: ['maintenance-alert-detail', alertId],
        queryFn: () => getMaintenanceAlertById(alertId!),
        enabled: !!alertId,
    })

    const { data: historyData, isLoading: isHistoryLoading } = useQuery({
        queryKey: ['maintenance-alert-history', alertId],
        queryFn: () => getAlertHistory(alertId!),
        enabled: !!alertId,
    })

    const { data: conversationData, isLoading: isConvLoading } = useQuery({
        queryKey: ['maintenance-alert-conversation', alertId],
        queryFn: () => getAlertConversation(alertId!),
        enabled: !!alertId,
    })

    // ── Mutations ────────────────────────────────────────────────────────────
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
        queryClient.invalidateQueries({ queryKey: ['maintenance-alert-detail', alertId] })
    }

    const { mutate: handleAcknowledge, isPending: isAcknowledging } = useMutation({
        mutationFn: () => acknowledgeMaintenanceAlert(alertId!),
        onSuccess: () => { toast.success('Alert acknowledged'); invalidate() },
        onError: () => toast.error('Failed to acknowledge'),
    })

    const { mutate: handleClose, isPending: isClosing } = useMutation({
        mutationFn: () => closeMaintenanceAlert(alertId!),
        onSuccess: () => { toast.success('Alert closed'); invalidate() },
        onError: () => toast.error('Failed to close alert'),
    })

    const { mutate: sendMessage, isPending: isSending } = useMutation({
        mutationFn: () => postAlertMessage(alertId!, { body: messageText }),
        onSuccess: () => {
            toast.success('Message sent')
            setMessageText('')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alert-conversation', alertId] })
        },
        onError: () => toast.error('Failed to send message'),
    })

    // ── Derived data ─────────────────────────────────────────────────────────
    // API may return data: MaintenanceAlert directly OR data: { alert: MaintenanceAlert }
    const rawData = detailData?.data as any
    const rawAlertData = rawData?.attributes ? rawData : (rawData?.alert ?? rawData)
    const alert: MaintenanceAlert | null = rawAlertData?.attributes ? rawAlertData : null

    const status = alert?.attributes?.status ?? ''
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.triggered
    const isClosed = status === 'closed'
    const isOverdue = status === 'overdue'

    const vehicleReg = alert?.relationships?.vehicle?.registration_number ?? 'Unknown'
    const vehicleMake = alert?.relationships?.vehicle?.make ?? ''
    const vehicleModel = alert?.relationships?.vehicle?.model ?? ''
    const serviceType = alert?.relationships?.schedule?.service_type
        ?? alert?.attributes?.threshold_type?.replace(/_/g, ' ')
        ?? 'Maintenance'
    const triggeredAt = alert?.attributes?.triggered_at ?? alert?.attributes?.created_at
    const jobId = (alert?.relationships?.maintenance_job as any)?.id ?? null
    const schedDueDate = alert?.relationships?.schedule?.due_date
    const history = historyData?.data?.history ?? []
    const messages = conversationData?.data?.conversation?.messages ?? []

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Sheet open={!!alertId} onOpenChange={(open) => { if (!open) onClose() }}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-[700px] p-0 flex flex-col gap-0 overflow-hidden"
                >
                    {/* ── Sticky header ─────────────────────────────────── */}
                    <SheetHeader className={cn(
                        'px-6 py-4 border-b border-slate-100 shrink-0 border-l-4',
                        cfg.border
                    )}>
                        <SheetTitle className={cn(
                            'text-base font-black uppercase tracking-tight leading-tight',
                            isLoading ? 'sr-only' : isError ? 'text-rose-600 text-sm' : 'text-slate-900'
                        )}>
                            {isLoading ? 'Maintenance Alert' : isError ? 'Failed to load alert' : serviceType}
                        </SheetTitle>

                        {isLoading ? (
                            <div className="space-y-2 pt-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-6 w-56" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        ) : alert ? (
                            <div className="flex items-start justify-between gap-3 pt-0.5">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {vehicleMake} {vehicleModel} · {vehicleReg}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <StatusBadge status={status} />
                                        <Badge className={cn(
                                            'text-[8px] font-black uppercase tracking-tighter h-4 border-0 shadow-none',
                                            alert.attributes.alert_type === 'due'
                                                ? 'bg-rose-50 text-rose-600'
                                                : 'bg-amber-50 text-amber-600'
                                        )}>
                                            {alert.attributes.alert_type}
                                        </Badge>
                                        {isOverdue && (
                                            <span className="flex h-2 w-2 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </SheetHeader>

                    {/* ── Scrollable body ───────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

                        {isLoading ? (
                            <div className="p-6 space-y-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-14 rounded-xl" />
                                ))}
                            </div>
                        ) : isError ? (
                            <div className="p-6 text-center text-sm text-rose-500">
                                Could not load alert details.
                            </div>
                        ) : alert ? (
                            <>
                                {/* ── Two-pane content ─────────────────── */}
                                <div className="flex flex-col sm:flex-row flex-1">

                                    {/* LEFT — main content */}
                                    <div className="flex-1 min-w-0 px-6 py-5 space-y-6">

                                        {/* Action buttons */}
                                        {!isClosed && (
                                            <div className="flex flex-wrap gap-2">
                                                {(status === 'triggered' || status === 'overdue') && (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-700"
                                                        onClick={() => handleAcknowledge()}
                                                        disabled={isAcknowledging}
                                                    >
                                                        {isAcknowledging ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Acknowledge'}
                                                    </Button>
                                                )}
                                                {status === 'acknowledged' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200"
                                                            onClick={() => setSnoozeOpen(true)}
                                                        >
                                                            Snooze
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-700"
                                                            onClick={() => setWorkOrderOpen(true)}
                                                        >
                                                            Create Work Order
                                                        </Button>
                                                    </>
                                                )}
                                                {status === 'work_order_created' && (
                                                    <>
                                                        {jobId && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border-indigo-200 text-indigo-600"
                                                                asChild
                                                            >
                                                                <Link href={`/maintenance/jobs/${jobId}`}>
                                                                    View Job <ChevronRight className="ml-1 h-3 w-3" />
                                                                </Link>
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200"
                                                            onClick={() => handleClose()}
                                                            disabled={isClosing}
                                                        >
                                                            {isClosing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Close Alert'}
                                                        </Button>
                                                    </>
                                                )}
                                                {status === 'snoozed' && alert.attributes.snooze_expires_at && (
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest self-center">
                                                        Re-triggers {formatDistanceToNow(new Date(alert.attributes.snooze_expires_at), { addSuffix: true })}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {isClosed && (
                                            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                                    This alert has been resolved and closed.
                                                </p>
                                            </div>
                                        )}

                                        {/* Alert overview grid */}
                                        <div>
                                            <SectionLabel>Alert Details</SectionLabel>
                                            <div className="grid grid-cols-2 gap-3">
                                                <MetaRow label="Alert Type" value={<span className="uppercase">{alert.attributes.alert_type}</span>} />
                                                <MetaRow label="Threshold" value={<span className="uppercase">{alert.attributes.threshold_type}</span>} />
                                                <MetaRow
                                                    label="Triggered"
                                                    value={triggeredAt
                                                        ? formatDistanceToNow(new Date(triggeredAt), { addSuffix: true })
                                                        : 'Unknown'}
                                                />
                                                {alert.attributes.snooze_count ? (
                                                    <MetaRow
                                                        label="Snoozed"
                                                        value={`${alert.attributes.snooze_count}× total`}
                                                    />
                                                ) : null}
                                                {alert.attributes.snooze_expires_at && (
                                                    <MetaRow
                                                        label="Snooze Expires"
                                                        value={format(new Date(alert.attributes.snooze_expires_at), 'dd MMM yyyy')}
                                                    />
                                                )}
                                                {schedDueDate && (
                                                    <MetaRow
                                                        label="Target Due"
                                                        value={format(new Date(schedDueDate), 'dd MMM yyyy')}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Schedule link */}
                                        {alert.relationships?.schedule?.id && (
                                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-slate-400 shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Linked Schedule</p>
                                                        <p className="text-xs font-bold text-slate-900">{serviceType}</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" asChild className="h-7 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 px-2">
                                                    <Link href={`/maintenance/schedules/${alert.relationships.schedule.id}`}>
                                                        View <ChevronRight className="ml-0.5 h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* RIGHT — metadata sidebar */}
                                    <div className="sm:w-52 border-t sm:border-t-0 sm:border-l border-slate-100 bg-slate-50/40 px-5 py-5 space-y-5 shrink-0">

                                        {/* Status */}
                                        <div className="space-y-1">
                                            <SectionLabel>Status</SectionLabel>
                                            <StatusBadge status={status} />
                                        </div>

                                        <Separator />

                                        {/* Vehicle */}
                                        <div className="space-y-2">
                                            <SectionLabel>Vehicle</SectionLabel>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                                                    <Car className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 uppercase">{vehicleMake} {vehicleModel}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{vehicleReg}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Timeline */}
                                        <div className="space-y-2">
                                            <SectionLabel>Timeline</SectionLabel>
                                            {triggeredAt && (
                                                <div className="flex items-center gap-2">
                                                    <Zap className="h-3 w-3 text-slate-300 shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Triggered</p>
                                                        <p className="text-[10px] font-bold text-slate-700">
                                                            {format(new Date(triggeredAt), 'dd MMM yyyy, HH:mm')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {schedDueDate && (
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</p>
                                                        <p className="text-[10px] font-bold text-slate-700">
                                                            {format(new Date(schedDueDate), 'dd MMM yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Activity tabs — full width ────────── */}
                                <div className="border-t border-slate-100 flex flex-col">
                                    <Tabs defaultValue="history" className="flex flex-col">
                                        <TabsList className="w-full justify-start rounded-none bg-white border-b border-slate-100 h-10 px-6 gap-0 shrink-0">
                                            {(['history', 'conversation'] as const).map((tab) => (
                                                <TabsTrigger
                                                    key={tab}
                                                    value={tab}
                                                    className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4"
                                                >
                                                    {tab === 'history' ? 'History' : 'Conversation'}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>

                                        <TabsContent value="history" className="m-0 px-6 py-5">
                                            {isHistoryLoading ? (
                                                <div className="space-y-3">
                                                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                                                </div>
                                            ) : history.length === 0 ? (
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-8">No history yet</p>
                                            ) : (
                                                <WorkflowTimeline history={history.map((e: any) => ({
                                                    status: e.to_status ?? e.status ?? '',
                                                    actor: e.actor_name ?? e.actor_role ?? 'System',
                                                    timestamp: e.created_at ?? null,
                                                    reason: e.reason ?? null,
                                                }))} />
                                            )}
                                        </TabsContent>

                                        <TabsContent value="conversation" className="m-0 flex flex-col">
                                            <div className="px-6 py-4 space-y-3 min-h-[120px]">
                                                {isConvLoading ? (
                                                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                                                ) : messages.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <MessageSquare className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No messages yet</p>
                                                    </div>
                                                ) : (
                                                    messages.map((msg: any, i: number) => (
                                                        <div key={msg.id ?? i} className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{msg.author ?? 'System'}</span>
                                                                {msg.created_at && (
                                                                    <span className="text-[9px] text-slate-300">
                                                                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="rounded-xl bg-white border border-slate-100 px-3 py-2">
                                                                <p className="text-xs font-medium text-slate-700 leading-relaxed">{msg.body}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="border-t border-slate-100 px-6 py-4 flex gap-2">
                                                <Textarea
                                                    placeholder="Write a note..."
                                                    value={messageText}
                                                    onChange={(e) => setMessageText(e.target.value)}
                                                    className="resize-none h-16 flex-1 text-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && messageText.trim()) sendMessage()
                                                    }}
                                                />
                                                <Button
                                                    size="sm"
                                                    className="self-end h-9 w-9 p-0 bg-slate-900 hover:bg-slate-700 rounded-xl shrink-0"
                                                    disabled={!messageText.trim() || isSending}
                                                    onClick={() => sendMessage()}
                                                >
                                                    {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </>
                        ) : null}
                    </div>
                </SheetContent>
            </Sheet>

            {alert && (
                <>
                    <SnoozeAlertDialog
                        alert={alert}
                        open={snoozeOpen}
                        onOpenChange={(open) => {
                            setSnoozeOpen(open)
                            if (!open) queryClient.invalidateQueries({ queryKey: ['maintenance-alert-detail', alertId] })
                        }}
                    />
                    <CreateWorkOrderDialog
                        alert={alert}
                        open={workOrderOpen}
                        onOpenChange={(open) => {
                            setWorkOrderOpen(open)
                            if (!open) queryClient.invalidateQueries({ queryKey: ['maintenance-alert-detail', alertId] })
                        }}
                    />
                </>
            )}
        </>
    )
}
