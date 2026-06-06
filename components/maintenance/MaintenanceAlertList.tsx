'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MaintenanceAlert } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { acknowledgeMaintenanceAlert, closeMaintenanceAlert } from '@/lib/api/maintenance'
import { toast } from 'sonner'
import {
    AlertTriangle, BellRing, Eye, Clock, Wrench, CheckCircle2, ChevronRight, Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SnoozeAlertDialog } from './SnoozeAlertDialog'
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog'

const ALERT_STATUS_STYLES = {
    triggered:          { badge: 'bg-amber-50 text-amber-600',     accent: 'border-l-amber-400',   label: 'Triggered'       },
    overdue:            { badge: 'bg-rose-50 text-rose-600',       accent: 'border-l-rose-500',    label: 'Overdue'         },
    acknowledged:       { badge: 'bg-blue-50 text-blue-600',       accent: 'border-l-blue-400',    label: 'Acknowledged'    },
    snoozed:            { badge: 'bg-slate-100 text-slate-500',    accent: 'border-l-slate-300',   label: 'Snoozed'         },
    work_order_created: { badge: 'bg-indigo-50 text-indigo-600',   accent: 'border-l-indigo-400',  label: 'Work Order Open' },
    closed:             { badge: 'bg-emerald-50 text-emerald-600', accent: 'border-l-emerald-400', label: 'Closed'          },
} as const

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'overdue':            return <AlertTriangle className="h-4 w-4" />
        case 'triggered':          return <BellRing className="h-4 w-4" />
        case 'acknowledged':       return <Eye className="h-4 w-4" />
        case 'snoozed':            return <Clock className="h-4 w-4" />
        case 'work_order_created': return <Wrench className="h-4 w-4" />
        case 'closed':             return <CheckCircle2 className="h-4 w-4" />
        default:                   return <BellRing className="h-4 w-4" />
    }
}

interface MaintenanceAlertListProps {
    alerts: MaintenanceAlert[]
    isLoading?: boolean
}

export function MaintenanceAlertList({ alerts, isLoading }: MaintenanceAlertListProps) {
    const queryClient = useQueryClient()
    const [snoozeAlert, setSnoozeAlert] = useState<MaintenanceAlert | null>(null)
    const [workOrderAlert, setWorkOrderAlert] = useState<MaintenanceAlert | null>(null)

    const { mutate: handleAcknowledge, isPending: isAcknowledging, variables: acknowledgingId } = useMutation({
        mutationFn: (id: string) => acknowledgeMaintenanceAlert(id),
        onSuccess: () => {
            toast.success('Alert acknowledged')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
        },
        onError: () => toast.error('Failed to acknowledge alert'),
    })

    const { mutate: handleClose, isPending: isClosing, variables: closingId } = useMutation({
        mutationFn: (id: string) => closeMaintenanceAlert(id),
        onSuccess: () => {
            toast.success('Alert closed')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
        },
        onError: () => toast.error('Failed to close alert'),
    })

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
            </div>
        )
    }

    if (!alerts?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <BellRing className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">No active alerts</p>
                <p className="text-[10px] text-slate-400 mt-1">All vehicles are within maintenance thresholds.</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-3">
                {alerts.map((alert) => {
                    const status = alert.attributes.status
                    const styles = ALERT_STATUS_STYLES[status as keyof typeof ALERT_STATUS_STYLES] ?? ALERT_STATUS_STYLES.triggered
                    const isOverdue = status === 'overdue'
                    const isClosed = status === 'closed'

                    const vehicleReg = alert.relationships?.vehicle?.registration_number ?? 'Unknown'
                    const vehicleMake = alert.relationships?.vehicle?.make ?? ''
                    const serviceType = alert.relationships?.schedule?.service_type
                        ?? alert.attributes.threshold_type?.replace(/_/g, ' ')
                        ?? 'Maintenance'
                    const triggeredAt = alert.attributes.triggered_at ?? alert.attributes.created_at
                    const jobId = (alert.relationships?.maintenance_job as any)?.id ?? null

                    return (
                        <div
                            key={alert.id}
                            className={cn(
                                "relative overflow-hidden p-4 rounded-2xl border-l-4 bg-white border border-slate-100 transition-all hover:shadow-md",
                                styles.accent
                            )}
                        >
                            {isOverdue && (
                                <span className="absolute top-3 right-3 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                </span>
                            )}

                            <div className="flex items-start gap-3">
                                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", styles.badge)}>
                                    <StatusIcon status={status} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            {vehicleMake} {vehicleReg}
                                        </span>
                                        <Badge className={cn("font-black uppercase text-[8px] h-4 tracking-tighter border-0 shadow-none", styles.badge)}>
                                            {styles.label}
                                        </Badge>
                                        <Badge className={cn(
                                            "font-black uppercase text-[8px] h-4 tracking-tighter border-0 shadow-none",
                                            alert.attributes.alert_type === 'due'
                                                ? 'bg-rose-50 text-rose-600'
                                                : 'bg-amber-50 text-amber-600'
                                        )}>
                                            {alert.attributes.alert_type}
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
                                        {serviceType}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <Clock className="h-3 w-3 text-slate-300 shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            {triggeredAt
                                                ? formatDistanceToNow(new Date(triggeredAt), { addSuffix: true })
                                                : 'Just now'}
                                        </span>
                                        {alert.attributes.snooze_count ? (
                                            <span className="text-[9px] text-slate-400">
                                                · Snoozed {alert.attributes.snooze_count}×
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                {(status === 'triggered' || status === 'overdue') && (
                                    <Button
                                        size="sm"
                                        className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white px-3 hover:bg-slate-700"
                                        disabled={isAcknowledging && acknowledgingId === alert.id}
                                        onClick={() => handleAcknowledge(alert.id)}
                                    >
                                        {isAcknowledging && acknowledgingId === alert.id
                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                            : 'Acknowledge'
                                        }
                                    </Button>
                                )}
                                {status === 'acknowledged' && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200 px-3"
                                            onClick={() => setSnoozeAlert(alert)}
                                        >
                                            Snooze
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white px-3 hover:bg-slate-700"
                                            onClick={() => setWorkOrderAlert(alert)}
                                        >
                                            Create Work Order
                                        </Button>
                                    </>
                                )}
                                {status === 'snoozed' && alert.attributes.snooze_expires_at && (
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                        Re-triggers {formatDistanceToNow(new Date(alert.attributes.snooze_expires_at), { addSuffix: true })}
                                    </span>
                                )}
                                {status === 'work_order_created' && jobId && (
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
                                {status === 'work_order_created' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200 px-3"
                                        disabled={isClosing && closingId === alert.id}
                                        onClick={() => handleClose(alert.id)}
                                    >
                                        {isClosing && closingId === alert.id
                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                            : 'Close Alert'
                                        }
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="ml-auto h-7 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 px-2"
                                    asChild
                                >
                                    <Link href={`/maintenance/alerts/${alert.id}`}>
                                        {isClosed ? 'View Details' : 'Details'} <ChevronRight className="ml-0.5 h-3 w-3" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            <SnoozeAlertDialog
                alert={snoozeAlert}
                open={!!snoozeAlert}
                onOpenChange={(open) => { if (!open) setSnoozeAlert(null) }}
            />
            <CreateWorkOrderDialog
                alert={workOrderAlert}
                open={!!workOrderAlert}
                onOpenChange={(open) => { if (!open) setWorkOrderAlert(null) }}
            />
        </>
    )
}
