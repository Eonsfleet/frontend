'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, Wrench, FileText, LucideIcon, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export type ActivityType = 'incident' | 'maintenance' | 'document' | 'system'

export interface ActivityItem {
    id: string
    title: string
    description: string
    timestamp: string
    type: ActivityType
    status?: 'pending' | 'in_progress' | 'resolved' | 'completed'
}

const TYPE_CONFIG: Record<ActivityType, { icon: LucideIcon; color: string; bg: string }> = {
    incident: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    maintenance: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
    document: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    system: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

export function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
    return (
        <Card className="col-span-1 lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Recent Activity</CardTitle>
                <CardDescription>Latest alerts, maintenance updates, and documents.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 mt-2">
                    {activities.length === 0 ? (
                        <div className="text-center py-6 text-sm text-slate-500">
                            No recent activity to display.
                        </div>
                    ) : (
                        activities.map((activity) => {
                            const config = TYPE_CONFIG[activity.type]
                            const Icon = config.icon

                            return (
                                <div key={activity.id} className="flex gap-4">
                                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                                            <time className="text-xs text-slate-500">
                                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                            </time>
                                        </div>
                                        <p className="text-sm text-slate-600 line-clamp-2">{activity.description}</p>
                                        {activity.status && (
                                            <div className="mt-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                          ${activity.status === 'resolved' || activity.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                        activity.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-slate-100 text-slate-800'
                                                    }`}>
                                                    {activity.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        )}
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
