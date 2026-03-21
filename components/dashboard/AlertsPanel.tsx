'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, Bell, MapPin, CheckCircle2, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface AlertItem {
    id: string
    severity: AlertSeverity
    title: string
    description: string
    timestamp: string
    location?: string
    actions?: Array<{ label: string; onClick: () => void; variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' }>
}

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: any; color: string; bg: string; border: string; label: string }> = {
    critical: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', label: 'CRITICAL' },
    warning: { icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'WARNING' },
    info: { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: 'INFORMATIONAL' },
}

export function AlertsPanel({ alerts = [] }: { alerts?: AlertItem[] }) {
    const critical = alerts.filter(a => a.severity === 'critical')
    const warning = alerts.filter(a => a.severity === 'warning')
    const info = alerts.filter(a => a.severity === 'info')

    const renderAlertGroup = (items: AlertItem[], severity: AlertSeverity) => {
        if (items.length === 0) return null
        const config = SEVERITY_CONFIG[severity]

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded", config.bg, config.color)}>
                        {config.label} ({items.length})
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="space-y-3">
                    {items.map((alert) => (
                        <div key={alert.id} className={cn("p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md group", config.border)}>
                            <div className="flex gap-4">
                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", config.bg)}>
                                    <config.icon className={cn("h-5 w-5", config.color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{alert.title}</h4>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{alert.description}</p>
                                        </div>
                                        <time className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-4">
                                            {alert.timestamp}
                                        </time>
                                    </div>

                                    {alert.location && (
                                        <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-400">
                                            <MapPin className="h-3 w-3" />
                                            <span>{alert.location}</span>
                                        </div>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {alert.actions?.map((action, idx) => (
                                            <Button
                                                key={idx}
                                                size="sm"
                                                variant={action.variant as any || 'secondary'}
                                                onClick={action.onClick}
                                                className="h-7 text-[10px] font-bold uppercase tracking-wider px-3"
                                            >
                                                {action.label}
                                            </Button>
                                        )) || (
                                                <Button size="sm" variant="secondary" className="h-7 text-[10px] font-bold uppercase tracking-wider px-3">
                                                    Acknowledge
                                                </Button>
                                            )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                        Alerts & Pending Actions
                    </CardTitle>
                    <CardDescription className="text-[10px]">Real-time operations monitor</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-400 hover:text-slate-600">
                    CLEAR ALL
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-slate-50/30">
                <div className="space-y-8">
                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                            <CheckCircle2 className="h-12 w-12 text-slate-200 mb-4" />
                            <p className="text-sm font-bold text-slate-400">All clear! No pending actions.</p>
                        </div>
                    ) : (
                        <>
                            {renderAlertGroup(critical, 'critical')}
                            {renderAlertGroup(warning, 'warning')}
                            {renderAlertGroup(info, 'info')}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
