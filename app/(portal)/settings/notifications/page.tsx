'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Settings, ScrollText, PlayCircle, Loader2, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const mockRules = [
    { id: '1', event: 'incident.created', condition: 'severity == "critical"', action: 'dispatch_to_group', target: 'Safety Officers', is_active: true },
    { id: '2', event: 'vehicle.maintenance_due', condition: 'days_remaining <= 7', action: 'send_email', target: 'Fleet Manager', is_active: true },
    { id: '3', event: 'trip.delayed', condition: 'delay_minutes > 60', action: 'dispatch_to_group', target: 'Logistics Team', is_active: false },
]

export default function NotificationRulesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = () => {
        setIsSaving(true)
        setTimeout(() => {
            setIsSaving(false)
            setIsCreateOpen(false)
        }, 1000)
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center break-words gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notification Routing Rules</h1>
                    <p className="text-slate-500 mt-1">Configure automated routing conditions for critical system events.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> Add Rule
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-slate-500" />
                        Active Routing Rules
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead>Event Trigger</TableHead>
                                    <TableHead>Condition</TableHead>
                                    <TableHead>Action / Target</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockRules.map((rule) => (
                                    <TableRow key={rule.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">{rule.event}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-indigo-600 font-medium">
                                            {rule.condition}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <span className="text-slate-400">{actionLabel(rule.action)}</span>
                                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                                <span className="font-semibold">{rule.target}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="default" className={rule.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700'}>
                                                {rule.is_active ? 'Active' : 'Disabled'}
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
                        <DialogTitle>Create Routing Rule</DialogTitle>
                        <DialogDescription>Define what happens when a specific event occurs.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>When this event occurs:</Label>
                            <Select>
                                <SelectTrigger><SelectValue placeholder="Select Event Trigger" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="incident.created">incident.created</SelectItem>
                                    <SelectItem value="vehicle.offline">vehicle.offline</SelectItem>
                                    <SelectItem value="trip.delayed">trip.delayed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>And condition matches:</Label>
                            <Select>
                                <SelectTrigger><SelectValue placeholder="Select Condition" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="severity == critical">Severity equals Critical</SelectItem>
                                    <SelectItem value="any">Always (No Condition)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Then target notification to:</Label>
                            <Select>
                                <SelectTrigger><SelectValue placeholder="Select Target Group" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="group.safety">Safety Officers (Group)</SelectItem>
                                    <SelectItem value="group.logistics">Logistics Team (Group)</SelectItem>
                                    <SelectItem value="role.manager">All Fleet Managers</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600" disabled={isSaving} onClick={handleSave}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Rule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function actionLabel(action: string) {
    if (action === 'dispatch_to_group') return 'Dispatch to Group'
    if (action === 'send_email') return 'Email User'
    return action
}
