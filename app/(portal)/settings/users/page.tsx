'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Mail, Loader2, UserMinus, UserCog, Upload, Download } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'
import { ImportDialog } from '@/components/shared/ImportDialog'
import { ExportDialog } from '@/components/shared/ExportDialog'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Trash2, Lock, RefreshCw, Power } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { RoleSlug } from '@/types'

const inviteSchema = z.object({
    first_name: z.string().min(2, 'Required'),
    last_name: z.string().min(2, 'Required'),
    email: z.string().email('Invalid email address'),
    role: z.enum(['administrator', 'fleet_manager', 'dispatcher', 'driver', 'mechanic', 'finance', 'compliance', 'vendor'] as const),
    cluster_id: z.string().optional() // Mocking string for Select element, parse to int for API
})

type InviteFormValues = z.infer<typeof inviteSchema>

export default function UserManagementPage() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [isExportOpen, setIsExportOpen] = useState(false)

    const { data, isLoading } = useQuery({
        queryKey: ['settings-users', page, search],
        queryFn: () => api.getUsers({ page, per_page: 15, role: search }), // Mocking search via role param for now
    })

    const { control, register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormValues>({
        resolver: zodResolver(inviteSchema),
        defaultValues: { role: 'driver', first_name: '', last_name: '', email: '' }
    })

    const inviteMutation = useMutation({
        mutationFn: (values: InviteFormValues) => api.inviteUser({
            ...values,
            cluster_id: values.cluster_id ? parseInt(values.cluster_id, 10) : undefined
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-users'] })
            toast.success('Invitation sent successfully')
            setIsInviteOpen(false)
            reset()
        },
        onError: () => toast.error('Failed to send invitation')
    })

    const onInviteSubmit = (data: InviteFormValues) => {
        inviteMutation.mutate(data)
    }

    const { mutate: deactivate, isPending: isDeactivating } = useMutation({
        mutationFn: api.deactivateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-users'] })
            toast.success('User account suspended periodically')
        }
    })

    const { mutate: deleteUser, isPending: isDeleting } = useMutation({
        mutationFn: api.deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-users'] })
            toast.success('User permanently removed from directory')
        },
        onError: () => toast.error('Account removal failed')
    })

    const { mutate: resetPassword, isPending: isResetting } = useMutation({
        mutationFn: (email: string) => api.requestResetPassword(email),
        onSuccess: () => toast.success('Security OTP dispatched to user email'),
        onError: () => toast.error('Failed to trigger reset protocol')
    })

    const roleColors: Record<string, string> = {
        administrator: 'bg-rose-100 text-rose-800',
        fleet_manager: 'bg-indigo-100 text-indigo-800',
        dispatcher: 'bg-sky-100 text-sky-800',
        driver: 'bg-emerald-100 text-emerald-800',
        mechanic: 'bg-amber-100 text-amber-800',
        finance: 'bg-slate-100 text-slate-800',
        vendor: 'bg-purple-100 text-purple-800',
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Directory</h1>
                    <p className="text-slate-500 mt-1">Manage employee access, assign organizational roles, and onboard personnel.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsExportOpen(true)}>
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Import
                    </Button>
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Invite Teammate</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Send Invitation</DialogTitle>
                            <DialogDescription>
                                We'll email them a secure link to join your Eonsfleet portal automatically.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name <span className="text-red-500">*</span></Label>
                                    <Input {...register('first_name')} />
                                    {errors.first_name && <p className="text-[10px] text-red-500">{errors.first_name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name <span className="text-red-500">*</span></Label>
                                    <Input {...register('last_name')} />
                                    {errors.last_name && <p className="text-[10px] text-red-500">{errors.last_name.message}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email Address <span className="text-red-500">*</span></Label>
                                <Input type="email" placeholder="name@company.com" {...register('email')} />
                                {errors.email && <p className="text-[10px] text-red-500">{errors.email.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Assigned Role <span className="text-red-500">*</span></Label>
                                <Controller
                                    name="role"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                                                <SelectItem value="dispatcher">Dispatcher</SelectItem>
                                                <SelectItem value="driver">Driver</SelectItem>
                                                <SelectItem value="mechanic">Mechanic</SelectItem>
                                                <SelectItem value="finance">Finance Agent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.role && <p className="text-[10px] text-red-500">{errors.role.message}</p>}
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" disabled={inviteMutation.isPending} className="w-full">
                                    {inviteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                                    Send Invite
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-white border-b border-slate-100 py-3.5 px-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search users..."
                            className="pl-9 bg-slate-50 border-transparent focus-visible:bg-white focus-visible:border-indigo-500 focus-visible:ring-indigo-100"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3.5">Employee</th>
                                    <th className="px-6 py-3.5">Role</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5">Last Login</th>
                                    <th className="px-6 py-3.5 text-right flex-shrink-0">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                                        </td>
                                    </tr>
                                ) : data?.data.users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-slate-500">
                                            <UserCog className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                            <p>No users correspond to your search query.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.data.users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300 overflow-hidden text-slate-600 font-bold text-xs uppercase">
                                                        {u.attributes.first_name[0]}{u.attributes.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{u.attributes.full_name}</div>
                                                        <div className="text-[12px] text-slate-500">{u.attributes.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const roleStr = String(Array.isArray(u.attributes.role) ? u.attributes.role[0] : u.attributes.role);
                                                    return (
                                                        <Badge variant="secondary" className={`${roleColors[roleStr] || 'bg-slate-100 text-slate-800'} border-transparent capitalize`}>
                                                            {roleStr.replace('_', ' ')}
                                                        </Badge>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${u.attributes.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {u.attributes.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-[13px]">
                                                {u.attributes.last_login || 'Never logged in'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                    onClick={() => deactivate(u.id)}
                                                    disabled={isDeactivating}
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <ImportDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                entity="users"
                model="User"
                onComplete={() => queryClient.invalidateQueries({ queryKey: ['settings-users'] })}
            />

            <ExportDialog
                open={isExportOpen}
                onOpenChange={setIsExportOpen}
                entity="users"
            />
        </div>
    )
}
