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
    Loader2, Car, Calendar, Activity, ChevronRight, Send, MessageSquare,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const ALERT_STATUS_STYLES = {
    triggered:          { badge: 'bg-amber-50 text-amber-600',     accent: 'border-l-amber-400',   label: 'Triggered'       },
    overdue:            { badge: 'bg-rose-50 text-rose-600',       accent: 'border-l-rose-500',    label: 'Overdue'         },
    acknowledged:       { badge: 'bg-blue-50 text-blue-600',       accent: 'border-l-blue-400',    label: 'Acknowledged'    },
    snoozed:            { badge: 'bg-slate-100 text-slate-500',    accent: 'border-l-slate-300',   label: 'Snoozed'         },
    work_order_created: { badge: 'bg-indigo-50 text-indigo-600',   accent: 'border-l-indigo-400',  label: 'Work Order Open' },
    closed:             { badge: 'bg-emerald-50 text-emerald-600', accent: 'border-l-emerald-400', label: 'Closed'          },
} as const

function StatusIcon({ status, className }: { status: string; className?: string }) {
    const cls = cn('h-4 w-4', className)
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

interface Props {
    alertId: string | null
    onClose: () => void
}

export function MaintenanceAlertDrawer({ alertId, onClose }: Props) {
    const queryClient = useQueryClient()
    const [snoozeOpen, setSnoozeOpen] = useState(false)
    const [workOrderOpen, setWorkOrderOpen] = useState(false)
    const [messageText, setMessageText] = useState('')

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

    const { mutate: handleAcknowledge, isPending: isAcknowledging } = useMutation({
        mutationFn: () => acknowledgeMaintenanceAlert(alertId!),
        onSuccess: () => {
            toast.success('Alert acknowledged')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
            queryClient.invalidateQueries({ queryKey: ['maintenance-alert-detail', alertId] })
        },
        onError: () => toast.error('Failed to acknowledge'),
    })

    const { mutate: handleClose, isPending: isClosing } = useMutation({
        mutationFn: () => closeMaintenanceAlert(alertId!),
        onSuccess: () => {
            toast.success('Alert closed')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
            queryClient.invalidateQueries({ queryKey: ['maintenance-alert-detail', alertId] })
        },
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

    const rawAlertData = detailData?.data as any
    const alert = rawAlertData?.attributes ? (rawAlertData as import('@/types').MaintenanceAlert) : null
    const status = alert?.attributes?.status ?? ''
    const styles = ALERT_STATUS_STYLES[status as keyof typeof ALERT_STATUS_STYLES] ?? ALERT_STATUS_STYLES.triggered
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
    const history = historyData?.data?.history ?? []
    const messages = conversationData?.data?.conversation?.messages ?? []

    return (
        <>
            <Sheet open={!!alertId} onOpenChange={(open) => { if (!open) onClose() }}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-[560px] p-0 flex flex-col gap-0"
                >
                    {/* Header */}
                    <SheetHeader className="px-6 py-5 border-b border-slate-100 shrink-0">
                        {/* SheetTitle must always be rendered for Radix a11y */}
                        <SheetTitle className={cn(
                            'text-base font-black uppercase tracking-tight leading-tight',
                            isLoading ? 'sr-only' : isError ? 'text-rose-600 text-sm' : 'text-slate-900'
                        )}>
                            {isLoading ? 'Maintenance Alert' : isError ? 'Failed to load alert' : serviceType}
                        </SheetTitle>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-6 w-64" />
                            </div>
                        ) : alert ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={cn('font-black uppercase text-[8px] h-4 tracking-tighter border-0 shadow-none', styles.badge)}>
                                        <StatusIcon status={status} className="mr-1 h-3 w-3" />
                                        {styles.label}
                                    </Badge>
                                    <Badge className={cn(
                                        'font-black uppercase text-[8px] h-4 tracking-tighter border-0 shadow-none',
                                        alert.attributes.alert_type === 'due'
                                            ? 'bg-rose-50 text-rose-600'
                                            : 'bg-amber-50 text-amber-600'
                                    )}>
                                        {alert.attributes.alert_type}
                                    </Badge>
                                    {isOverdue && (
                                        <span className="flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {vehicleMake} {vehicleModel} · {vehicleReg}
                                </p>
                            </div>
                        ) : null}
                    </SheetHeader>

                    {/* Action buttons */}
                    {!isLoading && !isError && alert && (
                        <div className={cn(
                            'px-6 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap shrink-0',
                            `border-l-4 ${styles.accent}`
                        )}>
                            {(status === 'triggered' || status === 'overdue') && (
                                <Button
                                    size="sm"
                                    className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white px-3 hover:bg-slate-700"
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
                                        className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200 px-3"
                                        onClick={() => setSnoozeOpen(true)}
                                    >
                                        Snooze
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white px-3 hover:bg-slate-700"
                                        onClick={() => setWorkOrderOpen(true)}
                                    >
                                        Create Work Order
                                    </Button>
                                </>
                            )}
                            {status === 'snoozed' && alert.attributes.snooze_expires_at && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    Re-triggers {formatDistanceToNow(new Date(alert.attributes.snooze_expires_at), { addSuffix: true })}
                                </span>
                            )}
                            {status === 'work_order_created' && (
                                <>
                                    {jobId && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest border-indigo-200 text-indigo-600 px-3"
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
                                        className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200 px-3"
                                        onClick={() => handleClose()}
                                        disabled={isClosing}
                                    >
                                        {isClosing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Close Alert'}
                                    </Button>
                                </>
                            )}
                            {isClosed && (
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                                </span>
                            )}
                        </div>
                    )}

                    {/* Tabs */}
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="shrink-0 w-full justify-start rounded-none border-b border-slate-100 bg-white px-6 h-10 gap-0">
                            <TabsTrigger
                                value="overview"
                                className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3"
                            >
                                History
                            </TabsTrigger>
                            <TabsTrigger
                                value="conversation"
                                className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3"
                            >
                                Conversation
                            </TabsTrigger>
                        </TabsList>

                        {/* Overview */}
                        <TabsContent value="overview" className="flex-1 overflow-y-auto m-0">
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
                                <div className="p-6 space-y-4">
                                    {/* Vehicle */}
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Car className="h-3 w-3" /> Vehicle
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
                                                <Car className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                                    {vehicleMake} {vehicleModel}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {vehicleReg}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Alert details */}
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Activity className="h-3 w-3" /> Alert Details
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Service Type
                                                </p>
                                                <p className="text-xs font-black text-slate-900 uppercase">
                                                    {serviceType}
                                                </p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Alert Type
                                                </p>
                                                <p className="text-xs font-black text-slate-900 uppercase">
                                                    {alert.attributes.alert_type}
                                                </p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Triggered
                                                </p>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {triggeredAt
                                                        ? format(new Date(triggeredAt), 'dd MMM yyyy, HH:mm')
                                                        : 'Unknown'}
                                                </p>
                                            </div>
                                            {alert.attributes.snooze_count ? (
                                                <div className="space-y-0.5">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        Snoozed
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {alert.attributes.snooze_count}× total
                                                    </p>
                                                </div>
                                            ) : null}
                                            {alert.attributes.snooze_expires_at && (
                                                <div className="space-y-0.5 col-span-2">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        Snooze Expires
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {format(new Date(alert.attributes.snooze_expires_at), 'dd MMM yyyy')}
                                                        {' '}
                                                        <span className="text-slate-400">
                                                            ({formatDistanceToNow(new Date(alert.attributes.snooze_expires_at), { addSuffix: true })})
                                                        </span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Threshold */}
                                    {alert.relationships?.schedule?.due_date && (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" /> Maintenance Target
                                            </p>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</p>
                                                <p className="text-xs font-black text-slate-900">
                                                    {format(new Date(alert.relationships.schedule.due_date), 'dd MMM yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </TabsContent>

                        {/* History */}
                        <TabsContent value="history" className="flex-1 overflow-y-auto m-0">
                            {isHistoryLoading ? (
                                <div className="p-6 space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-12 rounded-xl" />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6">
                                    {history.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                No history yet
                                            </p>
                                        </div>
                                    ) : (
                                        <WorkflowTimeline history={history.map((e) => ({
                                            status: e.to_status,
                                            actor: e.actor_name ?? e.actor_role ?? 'System',
                                            timestamp: e.created_at,
                                            reason: e.reason,
                                        }))} />
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Conversation */}
                        <TabsContent value="conversation" className="flex-1 flex flex-col m-0 min-h-0">
                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {isConvLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-16 rounded-xl" />
                                    ))
                                ) : messages.length === 0 ? (
                                    <div className="text-center py-12">
                                        <MessageSquare className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            No messages yet
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <div key={msg.id ?? i} className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                    {(msg as any).author ?? 'System'}
                                                </span>
                                                {(msg as any).created_at && (
                                                    <span className="text-[9px] text-slate-300">
                                                        {formatDistanceToNow(new Date((msg as any).created_at), { addSuffix: true })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                                    {msg.body}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Separator />
                            <div className="p-4 flex gap-2 shrink-0">
                                <Textarea
                                    placeholder="Write a note or update..."
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    className="resize-none text-sm h-16 flex-1"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && messageText.trim()) {
                                            sendMessage()
                                        }
                                    }}
                                />
                                <Button
                                    size="sm"
                                    className="self-end h-9 w-9 p-0 bg-slate-900 hover:bg-slate-700 rounded-xl"
                                    disabled={!messageText.trim() || isSending}
                                    onClick={() => sendMessage()}
                                >
                                    {isSending
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Send className="h-3.5 w-3.5" />
                                    }
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>

            {alert && (
                <>
                    <SnoozeAlertDialog
                        alert={alert}
                        open={snoozeOpen}
                        onOpenChange={(open) => {
                            setSnoozeOpen(open)
                            if (!open) {
                                queryClient.invalidateQueries({ queryKey: ['maintenance-alert-detail', alertId] })
                            }
                        }}
                    />
                    <CreateWorkOrderDialog
                        alert={alert}
                        open={workOrderOpen}
                        onOpenChange={(open) => {
                            setWorkOrderOpen(open)
                            if (!open) {
                                queryClient.invalidateQueries({ queryKey: ['maintenance-alert-detail', alertId] })
                            }
                        }}
                    />
                </>
            )}
        </>
    )
}
