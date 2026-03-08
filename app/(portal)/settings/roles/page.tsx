'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Key, Eye, Edit3, Trash2, Loader2, Plus, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { Permission } from '@/types'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function RolesConfigurationsPage() {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [roleName, setRoleName] = useState('')
    const [selectedPerms, setSelectedPerms] = useState<string[]>([])

    const { data: rolesData, isLoading } = useQuery({
        queryKey: ['settings-roles'],
        queryFn: api.getRoles
    })

    const { data: permsData } = useQuery({
        queryKey: ['settings-permissions'],
        queryFn: () => api.getPermissions({ per_page: 100 }),
        enabled: isCreateOpen
    })

    const createMutation = useMutation({
        mutationFn: (data: { name: string; permissions: string[] }) => api.createRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-roles'] })
            toast.success('Custom security role established')
            setIsCreateOpen(false)
            setRoleName('')
            setSelectedPerms([])
        },
        onError: () => toast.error('Failed to provision new role')
    })

    const handleTogglePerm = (perm: string) => {
        setSelectedPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
    }

    const roles = rolesData?.data?.roles || []

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Role Configurations</h1>
                    <p className="text-slate-500 mt-1">Review the predefined access control matrices ensuring organizational security.</p>
                </div>
                <UpgradeGate
                    module="custom_roles"
                    featureName="Custom Security Roles"
                    description="Design sophisticated access control lists tailored to your organizational hierarchy."
                >
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-slate-900 hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" /> Add Role
                    </Button>
                </UpgradeGate>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                ) : roles.map(role => {
                    const permissions = Object.values(role.relationships.permissions || {})
                    const displayPermissions = permissions.slice(0, 5)
                    const remainingCount = permissions.length - 5

                    return (
                        <Card key={role.id} className="shadow-sm border-slate-200 flex flex-col hover:border-indigo-200 transition-colors">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <Badge variant="outline" className="text-slate-500 bg-white shadow-sm border-slate-200 capitalize">
                                        {role.attributes.name} Account
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg font-bold text-slate-900 capitalize">{role.attributes.name.replace(/_/g, ' ')}</CardTitle>
                                <CardDescription className="text-[13px] leading-relaxed mt-1.5 h-10">
                                    Official system role mapped from backend matrix.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 p-5 bg-white">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5" /> Core Permissions
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {displayPermissions.map((perm: any) => {
                                        const action = perm.split('_')[0] || ''
                                        const isWrite = ['create', 'add', 'update', 'edit', 'delete', 'assign', 'change', 'mark', 'approve', 'reset'].includes(action)
                                        return (
                                            <Badge key={perm} variant="secondary" className={`${isWrite ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'} font-mono text-[10px]`}>
                                                {isWrite ? <Edit3 className="w-3 h-3 mr-1 inline" /> : <Eye className="w-3 h-3 mr-1 inline" />}
                                                {perm}
                                            </Badge>
                                        )
                                    })}
                                    {remainingCount > 0 && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-indigo-600 border-indigo-200 font-bold text-[10px]">
                                                    +{remainingCount} more
                                                </Badge>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0">
                                                <DialogHeader className="p-6 border-b border-slate-100">
                                                    <DialogTitle className="flex items-center gap-2">
                                                        <Shield className="w-5 h-5 text-indigo-600" />
                                                        {role.attributes.name.replace(/_/g, ' ')} Permissions
                                                    </DialogTitle>
                                                    <DialogDescription>Full list of granular permissions for this role.</DialogDescription>
                                                </DialogHeader>
                                                <div className="p-6 overflow-y-auto space-y-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {permissions.map((perm: any) => {
                                                            const action = perm.split('_')[0] || ''
                                                            const isWrite = ['create', 'add', 'update', 'edit', 'delete', 'assign', 'change', 'mark', 'approve', 'reset'].includes(action)
                                                            return (
                                                                <Badge key={perm} variant="secondary" className={`${isWrite ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'} font-mono text-[11px] py-1`}>
                                                                    {isWrite ? <Edit3 className="w-3.5 h-3.5 mr-1.5 inline" /> : <Eye className="w-3.5 h-3.5 mr-1.5 inline" />}
                                                                    {perm}
                                                                </Badge>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                                                    <Button variant="outline" onClick={(e) => (e.target as any).closest('dialog')?.close()}>Close</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                            </CardContent>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 text-sm font-medium text-slate-600 flex justify-between items-center rounded-b-xl">
                                <span>Active Members</span>
                                <span className="bg-white px-2.5 py-1 rounded shadow-sm border border-slate-200 font-bold text-slate-900">{role.attributes.summary.total_users}</span>
                            </div>
                        </Card>
                    )
                })}
            </div>

            <Card className="shadow-sm border-slate-200 bg-indigo-50/50">
                <CardContent className="p-6 flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full shrink-0">
                        <Key className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Custom Role Based Access Control (RBAC)</h3>
                        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                            The precise matrix of permissions listed above are hardcoded for Starter and Growth tiers. Fully custom granular RBAC configurations are exclusively available to <strong className="text-indigo-700">Enterprise</strong> customers.
                        </p>
                    </div>
                </CardContent>
            </Card>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 border-b border-slate-100">
                        <DialogTitle>Provision Custom Role</DialogTitle>
                        <DialogDescription>
                            Define a new permission matrix and assign it to specific organizational workflows.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 flex-1 overflow-hidden space-y-6">
                        <div className="space-y-2">
                            <Label>Role Identifier name <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g. Regional Supervisor"
                                value={roleName}
                                onChange={e => setRoleName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="flex justify-between items-center">
                                <span>Select Granular Permissions</span>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{selectedPerms.length} Selected</span>
                            </Label>
                            <ScrollArea className="h-[280px] w-full rounded-md border border-slate-200 bg-slate-50/30 p-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {(permsData?.data?.permissions || []).map((perm: Permission) => {
                                        const permName = perm.attributes.name
                                        const isSelected = selectedPerms.includes(permName)
                                        return (
                                            <div
                                                key={perm.id}
                                                className={`flex items-center space-x-2 p-2 rounded-lg border transition-all cursor-pointer hover:bg-white
                                                    ${isSelected ? 'border-indigo-200 bg-indigo-50/50 shadow-sm' : 'border-transparent text-slate-600'}
                                                `}
                                                onClick={() => handleTogglePerm(permName)}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                                    ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}
                                                `}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-[11px] font-mono leading-none truncate">{permName}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">Discard</Button>
                        <Button
                            disabled={createMutation.isPending || !roleName || selectedPerms.length === 0}
                            onClick={() => createMutation.mutate({ name: roleName, permissions: selectedPerms })}
                            className="flex-1 bg-slate-900 hover:bg-slate-800"
                        >
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Create Custom Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
