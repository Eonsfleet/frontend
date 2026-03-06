'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { format } from 'date-fns'

interface MaintenanceTask {
    id: string
    vehicle: string
    service: string
    dueDate: string
    priority: 'high' | 'medium' | 'low'
}

export function UpcomingMaintenanceTable({ tasks }: { tasks: MaintenanceTask[] }) {
    return (
        <Card className="col-span-1 lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Upcoming Maintenance</CardTitle>
                <CardDescription>Scheduled services for the next 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium">Vehicle</th>
                                <th className="px-4 py-3 font-medium">Service</th>
                                <th className="px-4 py-3 font-medium">Due Date</th>
                                <th className="px-4 py-3 font-medium">Priority</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                        No upcoming maintenance tasks.
                                    </td>
                                </tr>
                            ) : (
                                tasks.map((task) => (
                                    <tr key={task.id} className="border-b last:border-0 hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{task.vehicle}</td>
                                        <td className="px-4 py-3">{task.service}</td>
                                        <td className="px-4 py-3">{format(new Date(task.dueDate), 'MMM d, yyyy')}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                        ${task.priority === 'high' ? 'bg-rose-100 text-rose-800' :
                                                    task.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                {task.priority}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
