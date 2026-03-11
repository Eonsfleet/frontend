'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
    FileText, Clock, Settings, Download, Plus, Mail, Loader2, 
    Calendar, Filter, ChevronRight, FileSpreadsheet, FileJson, Trash2
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import * as reportsApi from '@/lib/api/reports'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function ReportsCentralPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [page, setPage] = useState(1)

    const { data: reportsData, isLoading } = useQuery({
        queryKey: ['scheduled-reports', page],
        queryFn: () => reportsApi.getScheduledReports({ page, per_page: 10 })
    })

    const reports = reportsData?.data?.data || []

    const getFormatIcon = (format: string) => {
        switch (format?.toLowerCase()) {
            case 'pdf': return <FileText className="w-4 h-4 text-rose-500" />
            case 'csv': return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            case 'json': return <FileJson className="w-4 h-4 text-amber-500" />
            default: return <FileText className="w-4 h-4 text-slate-500" />
        }
    }

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        Reports <span className="text-blue-600">Central</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Automated Intelligence • Custom Export • Compliance Storage
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm">
                        <Download className="h-4 w-4" />
                        One-off Export
                    </button>
                    <button 
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                    >
                        <Plus className="h-4 w-4" />
                        New Schedule
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Schedules</p>
                            <h3 className="text-2xl font-black text-slate-900">{reportsData?.data?.total || 0}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reports Delivered</p>
                            <h3 className="text-2xl font-black text-slate-900">1,240</h3>
                        </div>
                    </div>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <Mail className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Recipients</p>
                            <h3 className="text-2xl font-black text-slate-900">42</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                <CardHeader className="p-8 pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Report Schedules</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-1">Configured automated dispatches to your stakeholders</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                            <Filter className="h-3 w-3 text-slate-400" />
                            <span className="text-[9px] font-black text-slate-600 uppercase">Filter</span>
                        </div>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Detail</TableHead>
                                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Frequency</TableHead>
                                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipients</TableHead>
                                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</TableHead>
                                <TableHead className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-50">
                            {reports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase">No Schedules Found</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Start by creating your first automated report</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reports.map((schedule: any) => (
                                    <TableRow key={schedule.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                    {getFormatIcon(schedule.format)}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{schedule.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{schedule.report_type?.replace('_', ' ')} • {schedule.format?.toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-8 py-5 text-center">
                                            <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                                                {schedule.frequency}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-8 py-5">
                                            <div className="flex -space-x-2">
                                                {schedule.recipients?.slice(0, 3).map((email: string, i: number) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-600 uppercase" title={email}>
                                                        {email.charAt(0)}
                                                    </div>
                                                ))}
                                                {schedule.recipients?.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-blue-600">
                                                        +{schedule.recipients.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-8 py-5 text-center">
                                            <Badge className={cn(
                                                "text-[8px] font-black uppercase border-none px-2 py-0.5",
                                                schedule.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {schedule.is_active ? 'active' : 'paused'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center">
                                                    <Settings className="h-3.5 w-3.5" />
                                                </button>
                                                <button className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all flex items-center justify-center">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-8 bg-slate-900 text-white">
                        <DialogTitle className="text-xl font-black uppercase italic">Create <span className="text-blue-400">Schedule</span></DialogTitle>
                        <DialogDescription className="text-blue-100/60 font-medium uppercase text-[10px] tracking-widest mt-1">
                            Automate the generation and delivery of fleet intelligence
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-6 bg-white">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Schedule Name</Label>
                            <Input className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-black text-slate-900 placeholder:text-slate-300 uppercase italic tracking-tight" placeholder="e.g. Weekly Fuel Utilization Digest..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Report Type</Label>
                                <select className="w-full h-12 px-4 rounded-2xl border border-slate-100 bg-slate-50 text-[11px] font-black uppercase italic tracking-tight appearance-none">
                                    <option>Fleet Utilization</option>
                                    <option>Fuel Consumption</option>
                                    <option>Maintenance Compliance</option>
                                    <option>Safety Incidents</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Format</Label>
                                <select className="w-full h-12 px-4 rounded-2xl border border-slate-100 bg-slate-50 text-[11px] font-black uppercase italic tracking-tight appearance-none">
                                    <option>PDF Document</option>
                                    <option>Excel Worksheet (CSV)</option>
                                    <option>JSON Data Feed</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recipients (Comma separated)</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
                                <Input className="h-12 pl-12 rounded-2xl border-slate-100 bg-slate-50 font-bold text-slate-900 placeholder:text-slate-300" placeholder="finance@eonsfleet.com, safety@..." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Delivery Frequency</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Daily', 'Weekly', 'Monthly'].map((f) => (
                                    <button key={f} className="h-10 rounded-xl border border-slate-100 font-black uppercase text-[10px] tracking-widest text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all">
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-8 bg-slate-50 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest px-8 shadow-md" onClick={() => setIsCreateOpen(false)}>Save Schedule</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
