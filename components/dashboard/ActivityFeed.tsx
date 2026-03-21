'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, Wrench, FileText, LucideIcon, CheckCircle2, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export type ActivityType = 'incident' | 'maintenance' | 'document' | 'system'

export interface ActivityItem {
    id: string
    title: string
    description: string
    timestamp: string
    type: ActivityType
    status?: 'pending' | 'in_progress' | 'resolved' | 'completed'
    location?: string
    actions?: Array<{ label: string; onClick: () => void }>
}

const TYPE_CONFIG: Record<ActivityType, { icon: LucideIcon; color: string; bg: string }> = {
    incident: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    maintenance: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
    document: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    system: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

export function ActivityFeed({ activities = [] }: { activities?: ActivityItem[] }) {
    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Activity & Events
                    </CardTitle>
                    <CardDescription className="text-[10px]">Fleet operational log</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">
                        Filter
                    </button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-slate-50/30">
                <div className="space-y-6">
                    {activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                            <CheckCircle2 className="h-12 w-12 text-slate-200 mb-4" />
                            <p className="text-sm font-bold text-slate-400">No recent activity to display.</p>
                        </div>
                    ) : (
                        activities.map((activity) => {
                            const config = TYPE_CONFIG[activity.type]
                            const Icon = config.icon

                            return (
                                <div key={activity.id} className="relative pl-8 pb-6 last:pb-0 group">
                                    {/* Timeline connector */}
                                    <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-slate-100 group-last:hidden" />

                                    {/* Icon */}
                                    <div className={cn(
                                        "absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10",
                                        config.bg
                                    )}>
                                        <Icon className={cn("w-4 h-4", config.color)} />
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{activity.title}</p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <time className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                                    </time>
                                                    {activity.location && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                                            <MapPin className="h-3 w-3" />
                                                            <span>{activity.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {activity.status && (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                                    activity.status === 'resolved' || activity.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                                        activity.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                                                )}>
                                                    {activity.status.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{activity.description}</p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {activity.actions?.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={action.onClick}
                                                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 rounded-md hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
                                                >
                                                    {action.label}
                                                </button>
                                            )) || (
                                                    <button className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 rounded-md hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm">
                                                        View Details
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
