'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Key, Eye, Edit3, Trash2, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'

export default function RolesConfigurationsPage() {
    const { data: rolesData, isLoading } = useQuery({
        queryKey: ['settings-roles'],
        queryFn: api.getRoles
    })

    const roles = rolesData?.data?.roles || []

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Role Configurations</h1>
                <p className="text-slate-500 mt-1">Review the predefined access control matrices ensuring organizational security.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                ) : roles.map(role => (
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
                                {Object.values(role.relationships.permissions || {}).map((perm: any) => {
                                    const action = perm.split('_')[0] || ''
                                    const isWrite = action === 'create' || action === 'add' || action === 'update' || action === 'edit' || action === 'delete' || action === 'assign' || action === 'change' || action === 'mark' || action === 'approve' || action === 'reset'
                                    return (
                                        <Badge key={perm} variant="secondary" className={`${isWrite ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'} font-mono text-[10px]`}>
                                            {isWrite && <Edit3 className="w-3 h-3 mr-1 inline" />}
                                            {!isWrite && <Eye className="w-3 h-3 mr-1 inline" />}
                                            {perm}
                                        </Badge>
                                    )
                                })}
                            </div>
                        </CardContent>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 text-sm font-medium text-slate-600 flex justify-between items-center rounded-b-xl">
                            <span>Active Members</span>
                            <span className="bg-white px-2.5 py-1 rounded shadow-sm border border-slate-200 font-bold text-slate-900">{role.attributes.summary.total_users}</span>
                        </div>
                    </Card>
                ))}
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
        </div>
    )
}
