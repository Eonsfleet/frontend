'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Clock, Settings, Download, Plus, Mail, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { getCustomReports } from '@/lib/api/reports'
import { format } from 'date-fns'

export default function ScheduledReportsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [page, setPage] = useState(1)

    const { data: reportsData, isLoading } = useQuery({
        queryKey: ['custom-reports', page],
        queryFn: () => getCustomReports({ page, per_page: 10 })
    })

    const reports = reportsData?.data?.data || []

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-center break-words gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Scheduled Reports</h1>
                    <p className="text-slate-500 mt-1">Configure automated multi-document dispatches to your team.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="hidden sm:flex" disabled><Download className="w-4 h-4 mr-2" /> One-off Export</Button>
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> New Schedule</Button>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base font-semibold text-slate-900">Active Schedules</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Report Name</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead>Recipients</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                            No scheduled reports found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reports.map((schedule: any) => (
                                        <TableRow key={schedule.id} className="hover:bg-slate-50/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 text-sm">{schedule.name}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">Format: {schedule.format?.toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    {schedule.frequency?.charAt(0).toUpperCase() + schedule.frequency?.slice(1)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex -space-x-2">
                                                    {schedule.recipients?.slice(0, 3).map((email: string, i: number) => (
                                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-semibold text-slate-600" title={email}>
                                                            {email.charAt(0).toUpperCase()}
                                                        </div>
                                                    ))}
                                                    {schedule.recipients?.length > 3 && (
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-slate-400">
                                                            +{schedule.recipients.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={schedule.is_active ? 'default' : 'secondary'} className={schedule.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                                                    {schedule.is_active ? 'active' : 'paused'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"><Settings className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Report Schedule</DialogTitle>
                        <DialogDescription>Automate the generation and delivery of fleet intelligence.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Schedule Name</Label>
                            <Input placeholder="e.g. Weekly Utilization Digest..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Recipients (Comma separated)</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input className="pl-9" placeholder="finance@eonsfleet.com, safety@..." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Frequency</Label>
                            <select className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm">
                                <option>Daily</option>
                                <option>Weekly</option>
                                <option>Monthly</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600" onClick={() => setIsCreateOpen(false)}>Save Schedule</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
