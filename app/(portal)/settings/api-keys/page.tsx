'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, KeySquare, Copy, ShieldAlert, Loader2, CalendarX, LockKeyhole } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'
import { Badge } from '@/components/ui/badge'
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
import { format } from 'date-fns'

const generateSchema = z.object({
    name: z.string().min(2, 'Description name is required'),
    expires_in_days: z.number().min(1, 'Define expiration days'),
    scopes: z.string().optional(),
    ip_whitelist: z.string().optional()
})

type GenerateFormValues = z.infer<typeof generateSchema>

export default function ApiKeysPage() {
    const queryClient = useQueryClient()
    const [isGenerateOpen, setIsGenerateOpen] = useState(false)
    const [revealedKey, setRevealedKey] = useState<string | null>(null)

    const { data: keysData, isLoading } = useQuery({
        queryKey: ['settings-api-keys'],
        queryFn: api.getApiKeys,
    })

    const { control, register, handleSubmit, reset, formState: { errors } } = useForm<GenerateFormValues>({
        resolver: zodResolver(generateSchema),
        defaultValues: { name: '', expires_in_days: 30, scopes: '', ip_whitelist: '' }
    })

    const generateMutation = useMutation({
        mutationFn: api.generateApiKey,
        onSuccess: (res) => {
            setRevealedKey(res.data.api_key)
            queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] })
            toast.success('System API credential established')
        },
        onError: () => toast.error('Failed to provision API Key')
    })

    const revokeMutation = useMutation({
        mutationFn: api.revokeApiKey,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] })
            toast.success('Access Key officially revoked')
        }
    })

    const onGenerateSubmit = (data: GenerateFormValues) => {
        const payload = {
            ...data,
            scopes: data.scopes ? data.scopes.split(',').map(s => s.trim()) : [],
            ip_whitelist: data.ip_whitelist ? data.ip_whitelist.split(',').map(ip => ip.trim()) : []
        }
        generateMutation.mutate(payload)
    }

    const handleCopy = () => {
        if (revealedKey) {
            navigator.clipboard.writeText(revealedKey)
            toast.info('API Key copied to clipboard')
        }
    }

    const closeReveal = () => {
        setRevealedKey(null)
        setIsGenerateOpen(false)
        reset()
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Developer API Keys</h1>
                    <p className="text-slate-500 mt-1">Issue secure tokens for integrating backend systems or external analytical tools.</p>
                </div>

                <Dialog open={isGenerateOpen} onOpenChange={(open) => {
                    if (!open && revealedKey) closeReveal(); // Force clean up if dismissing
                    else setIsGenerateOpen(open);
                }}>
                    <DialogTrigger asChild>
                        <Button className="shrink-0 bg-slate-900 hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" /> Generate New Key</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px]">
                        {revealedKey ? (
                            <div className="space-y-6 pt-4">
                                <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <LockKeyhole className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-slate-900">Credential Issued</h3>
                                    <p className="text-sm text-slate-500 mt-1">Please copy this token securely now. For your protection, <strong className="text-rose-600">you will never be able to view it again.</strong></p>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-slate-100 border border-slate-200 rounded-md font-mono text-sm break-all text-slate-800 relative group">
                                    <p className="pr-10">{revealedKey}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                        onClick={handleCopy}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={closeReveal}>I have securely stored the key</Button>
                            </div>
                        ) : (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Provision Access Token</DialogTitle>
                                    <DialogDescription>
                                        Name this key clearly so your team knows which script or automation utilizes it.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit(onGenerateSubmit)} className="space-y-5 pt-4">
                                    <div className="space-y-2">
                                        <Label>Descriptive Name <span className="text-red-500">*</span></Label>
                                        <Input {...register('name')} placeholder="e.g. ERP Auto-Sync Script" />
                                        {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Token Lifetime <span className="text-red-500">*</span></Label>
                                        <Controller
                                            name="expires_in_days"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Expiration" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="7">7 Days</SelectItem>
                                                        <SelectItem value="30">30 Days</SelectItem>
                                                        <SelectItem value="90">90 Days</SelectItem>
                                                        <SelectItem value="365">1 Year</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.expires_in_days && <p className="text-[10px] text-red-500">{errors.expires_in_days.message}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Scopes (comma separated)</Label>
                                            <Input {...register('scopes')} placeholder="view_vehicles, view_reports" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>IP Whitelist (comma separated)</Label>
                                            <Input {...register('ip_whitelist')} placeholder="192.168.1.1, 10.0.0.0/24" />
                                        </div>
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button type="submit" disabled={generateMutation.isPending} className="w-full bg-slate-900 hover:bg-slate-800">
                                            {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeySquare className="w-4 h-4 mr-2" />}
                                            Generate Secret Key
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        <KeySquare className="w-5 h-5 text-slate-400" />
                        <CardTitle className="text-base font-semibold">Active Integrations</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3.5">Key Identity / Prefix</th>
                                    <th className="px-6 py-3.5">Created</th>
                                    <th className="px-6 py-3.5">Last Accessed</th>
                                    <th className="px-6 py-3.5">Expiration Limit</th>
                                    <th className="px-6 py-3.5 text-right flex-shrink-0">Controls</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                                        </td>
                                    </tr>
                                ) : keysData?.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-slate-500">
                                            <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                            <p>No active API credentials. Your external integration paths are closed.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    keysData?.data.map((key) => {
                                        const isExpired = key.expires_at ? new Date(key.expires_at) < new Date() : false
                                        return (
                                            <tr key={key.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 group flex items-center gap-2">
                                                        {key.name}
                                                        {isExpired && <Badge variant="destructive" className="h-5 text-[10px] px-1.5 uppercase font-bold tracking-widest leading-none">Expired</Badge>}
                                                    </div>
                                                    <div className="font-mono text-xs text-slate-400 mt-1 flex items-center justify-between group/key">
                                                        <span>ef_live_...{String(key.id).substring(0, 6)}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 opacity-0 group-hover/key:opacity-100 transition-opacity"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`ef_live_...${String(key.id).substring(0, 6)}`)
                                                                toast.info('Key identifier copied')
                                                            }}
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                    {format(new Date(key.created_at), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {key.last_used_at ? format(new Date(key.last_used_at), 'MMM dd \\at HH:mm') : <span className="italic">Never utilized</span>}
                                                </td>
                                                <td className="px-6 py-4 font-medium">
                                                    {key.expires_at ? (
                                                        <span className={isExpired ? 'text-rose-600' : 'text-slate-900'}>{format(new Date(key.expires_at), 'MMM dd, yyyy')}</span>
                                                    ) : (
                                                        <span className="text-emerald-600 flex items-center gap-1.5"><LockKeyhole className="w-3.5 h-3.5" /> Indefinite</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                        onClick={() => revokeMutation.mutate(key.id)}
                                                        disabled={revokeMutation.isPending || isExpired}
                                                    >
                                                        Revoke Access
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
