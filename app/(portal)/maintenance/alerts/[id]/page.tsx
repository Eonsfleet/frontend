'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getMaintenanceAlertById,
    getAlertHistory,
    getAlertConversation,
    postAlertMessage,
    acknowledgeMaintenanceAlert,
    closeMaintenanceAlert,
} from '@/lib/api/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
    AlertTriangle,
    BellRing,
    Eye,
    Clock,
    Wrench,
    CheckCircle2,
    ChevronRight,
    Loader2,
    ArrowLeft,
    MessageSquare,
    History,
    Info,
} from 'lucide-react'
import Link from 'next/link'
import { WorkflowTimeline } from '@/components/shared/WorkflowTimeline'
import { QueryError } from '@/components/shared/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SnoozeAlertDialog } from '@/components/maintenance/SnoozeAlertDialog'
import { CreateWorkOrderDialog } from '@/components/maintenance/CreateWorkOrderDialog'
import { MaintenanceAlert } from '@/types'

const ALERT_STATUS_STYLES = {
    triggered:          { badge: 'bg-amber-50 text-amber-600',     label: 'Triggered'       },
    overdue:            { badge: 'bg-rose-50 text-rose-600',       label: 'Overdue'         },
    acknowledged:       { badge: 'bg-blue-50 text-blue-600',       label: 'Acknowledged'    },
    snoozed:            { badge: 'bg-slate-100 text-slate-500',    label: 'Snoozed'         },
    work_order_created: { badge: 'bg-indigo-50 text-indigo-600',   label: 'Work Order Open' },
    closed:             { badge: 'bg-emerald-50 text-emerald-600', label: 'Closed'          },
} as const

function StatusIcon({ status, className }: { status: string; className?: string }) {
    const cls = cn("h-4 w-4", className)
    switch (status) {
        case 'overdue':            return <AlertTriangle className={cls} />
        case 'triggered':          return <BellRing className={cls} />
        case 'acknowledged':       return <Eye className={cls} />
        case 'snoozed':            return <Clock className={cls} />
        case 'work_order_created': return <Wrench className={cls} />
        case 'closed':             return <CheckCircle2 className={cls} />
        default:                   return <BellRing className={cls} />
    }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 py-3 border-b border-slate-50 last:border-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="text-sm font-bold text-slate-900">{value}</div>
        </div>
    )
}

export default function AlertDetailPage() {
    const params = useParams()
    const alertId = params.id as string
    const router = useRouter()
    const queryClient = useQueryClient()
    const [message, setMessage] = useState('')
    const [snoozeOpen, setSnoozeOpen] = useState(false)
    const [workOrderOpen, setWorkOrderOpen] = useState(false)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['maintenance-alert', alertId],
        queryFn: () => getMaintenanceAlertById(alertId),
        enabled: !!alertId,
    })

    const { data: historyData } = useQuery({
        queryKey: ['alert-history', alertId],
        queryFn: () => getAlertHistory(alertId),
        enabled: !!alertId,
    })

    const { data: convData } = useQuery({
        queryKey: ['alert-conversation', alertId],
        queryFn: () => getAlertConversation(alertId),
        enabled: !!alertId,
    })

    const { mutate: handleAcknowledge, isPending: isAcknowledging } = useMutation({
        mutationFn: () => acknowledgeMaintenanceAlert(alertId),
        onSuccess: () => {
            toast.success('Alert acknowledged')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alert', alertId] })
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
        },
        onError: () => toast.error('Failed to acknowledge alert'),
    })

    const { mutate: handleClose, isPending: isClosing } = useMutation({
        mutationFn: () => closeMaintenanceAlert(alertId),
        onSuccess: () => {
            toast.success('Alert closed')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alert', alertId] })
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
        },
        onError: () => toast.error('Failed to close alert'),
    })

    const { mutate: sendMessage, isPending: isSending } = useMutation({
        mutationFn: (body: string) => postAlertMessage(alertId, { body }),
        onSuccess: () => {
            toast.success('Message sent')
            setMessage('')
            queryClient.invalidateQueries({ queryKey: ['alert-conversation', alertId] })
        },
        onError: () => toast.error('Failed to send message'),
    })

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="p-8">
                <QueryError message="Failed to load alert." onRetry={refetch} />
            </div>
        )
    }

    const alert = data?.data as MaintenanceAlert | undefined
    if (!alert?.attributes) {
        return <div className="p-8 text-center text-rose-500">Alert not found</div>
    }

    const status = alert.attributes.status
    const styles = ALERT_STATUS_STYLES[status as keyof typeof ALERT_STATUS_STYLES] ?? ALERT_STATUS_STYLES.triggered
    const isOverdue = status === 'overdue'
    const isClosed = status === 'closed'

    const vehicleReg = alert.relationships?.vehicle?.registration_number ?? 'Unknown'
    const vehicleMake = alert.relationships?.vehicle?.make ?? ''
    const vehicleModel = alert.relationships?.vehicle?.model ?? ''
    const serviceType = alert.relationships?.schedule?.service_type
        ?? alert.attributes.threshold_type?.replace(/_/g, ' ')
        ?? 'Maintenance'
    const jobId = (alert.relationships?.maintenance_job as any)?.id ?? null
    const scheduleId = alert.relationships?.schedule?.id ?? null

    const history = (historyData?.data?.history ?? []).map((e: any) => ({
        status: e.to_status ?? e.status ?? '',
        actor: typeof e.actor === 'object' ? (e.actor?.name ?? 'System') : (e.actor_name ?? e.actor ?? 'System'),
        timestamp: e.created_at ?? e.timestamp ?? null,
        reason: e.reason ?? e.notes ?? null,
    }))

    const messages = convData?.data?.conversation?.messages ?? []

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Breadcrumb */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Link
                        href="/maintenance"
                        className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
                    >
                        Maintenance Command
                    </Link>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <Link
                        href="/maintenance/alerts"
                        className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
                    >
                        Alerts Inbox
                    </Link>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        Alert #{alertId}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-2">
                    <div className="flex items-start gap-3">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mt-1 shrink-0" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                                    {serviceType}
                                </h1>
                                <Badge className={cn("font-black uppercase text-[9px] h-5 tracking-tighter border-0 shadow-none", styles.badge)}>
                                    <StatusIcon status={status} className="h-3 w-3 mr-1" />
                                    {styles.label}
                                </Badge>
                                {isOverdue && (
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-bold text-slate-500 mt-0.5">
                                {vehicleMake} {vehicleReg} · triggered{' '}
                                {alert.attributes.triggered_at
                                    ? formatDistanceToNow(new Date(alert.attributes.triggered_at), { addSuffix: true })
                                    : 'recently'}
                            </p>
                        </div>
                    </div>

                    {/* Header CTA */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {(status === 'triggered' || status === 'overdue') && (
                            <Button
                                className="h-9 text-xs font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-700"
                                disabled={isAcknowledging}
                                onClick={() => handleAcknowledge()}
                            >
                                {isAcknowledging
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : 'Acknowledge'
                                }
                            </Button>
                        )}
                        {status === 'acknowledged' && (
                            <>
                                <Button
                                    variant="outline"
                                    className="h-9 text-xs font-black uppercase tracking-widest border-slate-200"
                                    onClick={() => setSnoozeOpen(true)}
                                >
                                    Snooze
                                </Button>
                                <Button
                                    className="h-9 text-xs font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-700"
                                    onClick={() => setWorkOrderOpen(true)}
                                >
                                    Create Work Order
                                </Button>
                            </>
                        )}
                        {status === 'work_order_created' && (
                            <Button
                                variant="outline"
                                className="h-9 text-xs font-black uppercase tracking-widest border-slate-200"
                                disabled={isClosing}
                                onClick={() => handleClose()}
                            >
                                {isClosing
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : 'Close Alert'
                                }
                            </Button>
                        )}
                        {isClosed && (
                            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                    This alert is closed
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
                <TabsList className="bg-slate-50 border border-slate-100 rounded-2xl p-1.5 h-auto gap-1">
                    <TabsTrigger
                        value="overview"
                        className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg px-5 py-2"
                    >
                        <Info className="h-3.5 w-3.5 mr-1.5" /> Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="history"
                        className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg px-5 py-2"
                    >
                        <History className="h-3.5 w-3.5 mr-1.5" /> History
                    </TabsTrigger>
                    <TabsTrigger
                        value="conversation"
                        className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg px-5 py-2"
                    >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Conversation
                    </TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="mt-6">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2">
                            <Card className="border-slate-200/60 shadow-sm bg-white">
                                <CardHeader className="border-b border-slate-100 bg-slate-50/30 px-6 py-4">
                                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Alert Info
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-6 py-0 divide-y divide-slate-50">
                                    <DetailRow
                                        label="Alert Type"
                                        value={
                                            <Badge className={cn(
                                                "font-black uppercase text-[9px] border-0",
                                                alert.attributes.alert_type === 'due'
                                                    ? 'bg-rose-50 text-rose-600'
                                                    : 'bg-amber-50 text-amber-600'
                                            )}>
                                                {alert.attributes.alert_type}
                                            </Badge>
                                        }
                                    />
                                    <DetailRow
                                        label="Threshold"
                                        value={alert.attributes.threshold_type?.replace(/_/g, ' ') ?? '—'}
                                    />
                                    <DetailRow
                                        label="Triggered At"
                                        value={alert.attributes.triggered_at
                                            ? format(new Date(alert.attributes.triggered_at), 'MMM d, yyyy HH:mm')
                                            : '—'}
                                    />
                                    {alert.attributes.acknowledged_at && (
                                        <DetailRow
                                            label="Acknowledged At"
                                            value={format(new Date(alert.attributes.acknowledged_at), 'MMM d, yyyy HH:mm')}
                                        />
                                    )}
                                    {status === 'snoozed' && alert.attributes.snooze_expires_at && (
                                        <DetailRow
                                            label="Snooze Expires"
                                            value={format(new Date(alert.attributes.snooze_expires_at), 'MMM d, yyyy HH:mm')}
                                        />
                                    )}
                                    {alert.attributes.snooze_count ? (
                                        <DetailRow label="Snooze Count" value={`${alert.attributes.snooze_count}×`} />
                                    ) : null}
                                    <DetailRow
                                        label="Schedule"
                                        value={
                                            <div className="flex items-center gap-2">
                                                <span>{serviceType}</span>
                                                {scheduleId && (
                                                    <Link
                                                        href={`/maintenance/${scheduleId}`}
                                                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-0.5"
                                                    >
                                                        View Schedule <ChevronRight className="h-3 w-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        }
                                    />
                                    <DetailRow
                                        label="Vehicle"
                                        value={
                                            <div className="flex items-center gap-2">
                                                <span>{vehicleMake} {vehicleModel} · {vehicleReg}</span>
                                                {alert.relationships?.vehicle?.id && (
                                                    <Link
                                                        href={`/vehicles/${alert.relationships.vehicle.id}`}
                                                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-0.5"
                                                    >
                                                        View Vehicle <ChevronRight className="h-3 w-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        }
                                    />
                                    {jobId && (
                                        <DetailRow
                                            label="Linked Work Order"
                                            value={
                                                <Link
                                                    href={`/maintenance/jobs/${jobId}`}
                                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-0.5"
                                                >
                                                    View Job <ChevronRight className="h-3 w-3" />
                                                </Link>
                                            }
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <Card className="border-slate-200/60 shadow-sm bg-slate-900 text-white">
                                <CardHeader className="border-b border-white/5 bg-white/5 py-4 px-6">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/50">
                                        Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", styles.badge)}>
                                            <StatusIcon status={status} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest">{styles.label}</p>
                                            <p className="text-[10px] text-white/40 mt-0.5">Current state</p>
                                        </div>
                                    </div>
                                    {status === 'snoozed' && alert.attributes.snooze_expires_at && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Re-triggers</p>
                                            <p className="text-xs font-bold">
                                                {formatDistanceToNow(new Date(alert.attributes.snooze_expires_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="mt-6">
                    <Card className="border-slate-200/60 shadow-sm bg-white">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30 px-6 py-4">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Workflow History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <WorkflowTimeline history={history} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Conversation */}
                <TabsContent value="conversation" className="mt-6">
                    <Card className="border-slate-200/60 shadow-sm bg-white">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30 px-6 py-4">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Conversation Thread
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {messages.length === 0 ? (
                                <div className="text-center py-8">
                                    <MessageSquare className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No messages yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((msg: any) => (
                                        <div key={msg.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    {msg.sender_name ?? 'User'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    {msg.created_at
                                                        ? format(new Date(msg.created_at), 'MMM d, HH:mm')
                                                        : '—'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 font-medium">{msg.body}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-3 border-t border-slate-100 pt-4">
                                <Textarea
                                    placeholder="Write a message..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="resize-none h-20 text-sm"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        className="text-xs font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-700 h-9"
                                        disabled={!message.trim() || isSending}
                                        onClick={() => sendMessage(message.trim())}
                                    >
                                        {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send Message'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <SnoozeAlertDialog
                alert={alert}
                open={snoozeOpen}
                onOpenChange={(open) => {
                    setSnoozeOpen(open)
                    if (!open) queryClient.invalidateQueries({ queryKey: ['maintenance-alert', alertId] })
                }}
            />
            <CreateWorkOrderDialog
                alert={alert}
                open={workOrderOpen}
                onOpenChange={(open) => {
                    setWorkOrderOpen(open)
                    if (!open) queryClient.invalidateQueries({ queryKey: ['maintenance-alert', alertId] })
                }}
            />
        </div>
    )
}
