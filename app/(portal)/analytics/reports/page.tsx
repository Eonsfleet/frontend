'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Clock, Settings, Download, Plus, Mail } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const mockSchedules = [
    { id: 1, name: 'Weekly Fleet Utilization', frequency: 'Every Monday at 08:00', recipients: ['cto@eonsfleet.com'], format: 'PDF', status: 'active', last_run: '2026-03-02T08:00:00Z' },
    { id: 2, name: 'Monthly Fuel Anomalies', frequency: '1st of every month', recipients: ['finance@eonsfleet.com'], format: 'CSV', status: 'active', last_run: '2026-03-01T08:00:00Z' },
    { id: 3, name: 'Daily Incident Digest', frequency: 'Daily at 18:00', recipients: ['operations@eonsfleet.com', 'safety@eonsfleet.com'], format: 'PDF', status: 'paused', last_run: '2026-02-28T18:00:00Z' },
]

export default function ScheduledReportsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)

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
                                {mockSchedules.map((schedule) => (
                                    <TableRow key={schedule.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">{schedule.name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">Format: {schedule.format}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                {schedule.frequency}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex -space-x-2">
                                                {schedule.recipients.map((email, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-semibold text-slate-600" title={email}>
                                                        {email.charAt(0).toUpperCase()}
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'} className={schedule.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                                                {schedule.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"><Settings className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
                            <Label>Cron Expression (UTC)</Label>
                            <Input placeholder="0 0 * * 1 (Every Monday at midnight)" />
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
