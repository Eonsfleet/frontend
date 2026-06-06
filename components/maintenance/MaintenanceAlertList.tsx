'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MaintenanceAlert } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { acknowledgeMaintenanceAlert, snoozeMaintenanceAlert } from '@/lib/api/maintenance'
import { toast } from 'sonner'
import { AlertCircle, AlertTriangle, CheckCircle2, Wrench, Clock, ChevronRight, BellRing, BellOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface MaintenanceAlertListProps {
    alerts: MaintenanceAlert[]
    isLoading?: boolean
    showAll?: boolean
}

export function MaintenanceAlertList({ alerts, isLoading, showAll = false }: MaintenanceAlertListProps) {
    const queryClient = useQueryClient()

    const { mutate: handleAcknowledge, isPending: isAcknowledging } = useMutation({
        mutationFn: (id: string) => acknowledgeMaintenanceAlert(id),
        onSuccess: () => {
            toast.success('Alert acknowledged successfully')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
        },
        onError: () => toast.error('Failed to acknowledge alert')
    })

    const { mutate: handleSnooze, isPending: isSnoozing } = useMutation({
        mutationFn: (id: string) => snoozeMaintenanceAlert(id, { snooze_days: 7, reason: 'Snoozed from dashboard' }),
        onSuccess: () => {
            toast.success('Alert snoozed for 7 days')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
        },
        onError: () => toast.error('Failed to snooze alert')
    })

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4 items-center p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (!alerts?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50/50 rounded-2xl border-2 border-slate-100 border-dashed group">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-widest italic">All Assets Optimal</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">No pending maintenance alerts detected.</p>
            </div>
        )
    }

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'triggered': { label: 'Active', className: 'bg-blue-500 text-white' },
            'overdue': { label: 'Overdue', className: 'bg-rose-600 text-white animate-pulse' },
            'acknowledged': { label: 'Acknowledged', className: 'bg-emerald-500 text-white' },
            'snoozed': { label: 'Snoozed', className: 'bg-amber-500 text-white' },
            'work_order_created': { label: 'Work Order', className: 'bg-indigo-500 text-white' },
            'closed': { label: 'Closed', className: 'bg-slate-500 text-white' },
        }
        const statusInfo = statusMap[status] || { label: status, className: 'bg-slate-400 text-white' }
        return (
            <Badge className={cn(statusInfo.className, "font-black uppercase text-[8px] h-4 tracking-tighter shadow-sm")}>
                {statusInfo.label}
            </Badge>
        )
    }

    const getAlertTypeBadge = (alertType: string) => {
        const typeMap: Record<string, { label: string; className: string; icon: React.ElementType }> = {
            'approaching': { label: 'Approaching', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
            'due': { label: 'Due Now', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
        }
        const typeInfo = typeMap[alertType] || { label: alertType, className: 'bg-slate-50 text-slate-700 border-slate-200', icon: BellRing }
        const Icon = typeInfo.icon
        return (
            <Badge variant="outline" className={cn(typeInfo.className, "font-black uppercase text-[8px] h-4 tracking-tighter border")}>
                <Icon className="h-2.5 w-2.5 mr-1" />
                {typeInfo.label}
            </Badge>
        )
    }

    // Check if snooze is allowed based on status
    const canSnooze = (status: string) => {
        return status === 'acknowledged'
    }

    // Check if acknowledge is allowed
    const canAcknowledge = (status: string) => {
        return status === 'triggered' || status === 'overdue'
    }

    return (
        <div className="space-y-4">
            {(showAll ? alerts : alerts.slice(0, 5)).map((alert) => {
                const status = alert.attributes.status
                const alertType = alert.attributes.alert_type
                const isHighPriority = status === 'overdue' || alertType === 'due'
                const Icon = status === 'overdue' ? AlertCircle : alertType === 'due' ? AlertCircle : BellRing

                const vehicleReg = alert.relationships?.vehicle?.registration_number
                    ?? (alert.relationships?.vehicle as any)?.data?.id
                    ?? 'Unknown'

                const triggeredAt = alert.attributes.triggered_at ?? alert.attributes.created_at
                const snoozeExpiry = alert.attributes.snooze_expires_at
                const snoozeCount = alert.attributes.snooze_count || 0

                return (
                    <div
                        key={alert.id}
                        className={cn(
                            "relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 group hover:shadow-xl",
                            isHighPriority
                                ? "bg-white border-rose-100/50 ring-1 ring-rose-50 hover:border-rose-200"
                                : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                    >
                        {isHighPriority && status !== 'acknowledged' && (
                            <div className="absolute top-0 right-0 p-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                            </div>
                        )}

                        <div className="flex gap-4 items-start">
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-12",
                                isHighPriority ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                            )}>
                                <Icon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Asset {vehicleReg}
                                    </span>
                                    {getAlertTypeBadge(alertType)}
                                    {getStatusBadge(status)}
                                </div>
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                    {alert.attributes.threshold_type?.replace(/_/g, ' ')} Maintenance {alertType === 'due' ? 'Due' : 'Approaching'}
                                </h4>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3 text-slate-300" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            {triggeredAt ? formatDistanceToNow(new Date(triggeredAt), { addSuffix: true }) : 'Just now'}
                                        </span>
                                    </div>
                                    {status === 'snoozed' && snoozeExpiry && (
                                        <div className="flex items-center gap-1.5">
                                            <BellOff className="h-3 w-3 text-amber-400" />
                                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                                                Until {new Date(snoozeExpiry).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    {snoozeCount > 0 && (
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            Snoozed {snoozeCount}x
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            {canAcknowledge(status) && (
                                <Button
                                    size="sm"
                                    disabled={isAcknowledging}
                                    className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                                    onClick={() => handleAcknowledge(alert.id)}
                                >
                                    Acknowledge
                                </Button>
                            )}
                            {canSnooze(status) && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isSnoozing}
                                    className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                                    onClick={() => handleSnooze(alert.id)}
                                >
                                    <BellOff className="h-3 w-3 mr-1" />
                                    Snooze 7d
                                </Button>
                            )}
                            {status === 'acknowledged' && (
                                <Button
                                    size="sm"
                                    className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 shadow-lg"
                                    asChild
                                >
                                    <Link href={`/maintenance/alerts/${alert.id}`}>
                                        Create Work Order
                                        <ChevronRight className="ml-1 h-3 w-3" />
                                    </Link>
                                </Button>
                            )}
                            {(status === 'work_order_created' || status === 'closed' || status === 'snoozed') && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest"
                                    asChild
                                >
                                    <Link href={`/maintenance/alerts/${alert.id}`}>
                                        View Details
                                        <ChevronRight className="ml-1 h-3 w-3" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )
            })}

            {!showAll && alerts.length > 5 && (
                <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 py-6" asChild>
                    <Link href="/maintenance/alerts">
                        Show {alerts.length - 5} More Critical Events
                    </Link>
                </Button>
            )}
        </div>
    )
}
