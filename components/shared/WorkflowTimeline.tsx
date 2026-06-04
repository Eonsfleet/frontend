import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { CheckCircle2, Circle } from 'lucide-react'

export interface WorkflowEvent {
    status: string
    actor: string
    timestamp: string | null
    reason: string | null
}

interface WorkflowTimelineProps {
    history: WorkflowEvent[]
}

export function WorkflowTimeline({ history }: WorkflowTimelineProps) {
    if (!history?.length) {
        return <div className="p-4 text-center text-slate-500">No history available</div>
    }

    return (
        <div className="space-y-4">
            {history.map((event, index) => {
                const isLast = index === history.length - 1
                return (
                    <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="flex-shrink-0 z-10 bg-white rounded-full">
                                {isLast ? (
                                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                                ) : (
                                    <Circle className="h-5 w-5 text-slate-300 fill-slate-100" />
                                )}
                            </div>
                            {!isLast && (
                                <div className="w-px h-full bg-slate-200 mt-2 -mb-2" />
                            )}
                        </div>
                        <div className="pb-6 w-full">
                            <Card className="shadow-sm border-slate-200">
                                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-900">
                                            Status updated to <span className="font-bold uppercase tracking-wider text-xs border bg-slate-100 rounded px-1.5 py-0.5">{event.status.replace('_', ' ')}</span>
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            by <span className="font-medium text-slate-800">{event.actor}</span>
                                        </p>
                                        {event.reason && (
                                            <p className="text-sm text-slate-500 italic mt-2 border-l-2 border-slate-200 pl-2">
                                                "{event.reason}"
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 shrink-0">
                                        {event.timestamp
                                            ? (() => {
                                                const d = new Date(event.timestamp)
                                                return isNaN(d.getTime()) ? event.timestamp : format(d, 'MMM dd, yyyy HH:mm')
                                              })()
                                            : '—'
                                        }
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
