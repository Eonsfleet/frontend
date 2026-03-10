'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MaintenanceAlert } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { acknowledgeMaintenanceAlert } from '@/lib/api/maintenance'
import { toast } from 'sonner'
import { AlertCircle, AlertTriangle, CheckCircle2, Wrench, Clock, ChevronRight, BellRing } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface MaintenanceAlertListProps {
    alerts: MaintenanceAlert[]
    isLoading?: boolean
}

export function MaintenanceAlertList({ alerts, isLoading }: MaintenanceAlertListProps) {
    const queryClient = useQueryClient()

    const { mutate: handleAcknowledge, variables: acknowledgingId } = useMutation({
        mutationFn: (id: string) => acknowledgeMaintenanceAlert(id),
        onSuccess: () => {
            toast.success('Alert acknowledged')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] })
        },
        onError: () => toast.error('Failed to acknowledge alert')
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

    return (
        <div className="space-y-4">
            {alerts.slice(0, 5).map((alert) => {
                const isOverdue = alert.attributes.alert_type === 'overdue'
                const isHighPriority = isOverdue
                const Icon = isOverdue ? AlertCircle : BellRing

                const vehicleReg = alert.relationships?.vehicle?.registration_number
                    ?? (alert.relationships?.vehicle as any)?.data?.id
                    ?? 'Unknown'

                const triggeredAt = alert.attributes.triggered_at ?? alert.attributes.created_at

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
                        {isHighPriority && (
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
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Asset {vehicleReg}
                                    </span>
                                    {isHighPriority && (
                                        <Badge className="bg-rose-500 text-white font-black uppercase text-[8px] h-4 tracking-tighter shadow-sm">
                                            Critical
                                        </Badge>
                                    )}
                                </div>
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                    {alert.attributes.alert_type?.replace(/_/g, ' ')} — {alert.attributes.threshold_type?.replace(/_/g, ' ')}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Clock className="h-3 w-3 text-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                        {triggeredAt ? formatDistanceToNow(new Date(triggeredAt), { addSuffix: true }) : 'Just now'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={acknowledgingId === alert.id}
                                className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 hover:bg-slate-100 text-slate-600"
                                onClick={() => handleAcknowledge(alert.id)}
                            >
                                Silence
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 shadow-lg group/btn"
                                asChild
                            >
                                <Link href={`/maintenance/alerts/${alert.id}`}>
                                    Resolve <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                )
            })}

            {alerts.length > 5 && (
                <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 py-6" asChild>
                    <Link href="/maintenance/alerts">
                        Show {alerts.length - 5} More Critical Events
                    </Link>
                </Button>
            )}
        </div>
    )
}
