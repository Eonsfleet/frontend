'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Copy, KeySquare, Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as api from '@/lib/api/settings'

const API_KEY_SCOPES = [
    { value: 'read:fleet', label: 'Read fleet data' },
    { value: 'write:fleet', label: 'Manage fleet data' },
    { value: 'read:vehicles', label: 'Read vehicles' },
    { value: 'write:vehicles', label: 'Manage vehicles' },
    { value: 'read:drivers', label: 'Read drivers' },
    { value: 'read:trips', label: 'Read trips' },
    { value: 'read:fuel', label: 'Read fuel data' },
    { value: 'write:fuel', label: 'Manage fuel data' },
    { value: 'read:analytics', label: 'Read analytics' },
    { value: 'read:maintenance', label: 'Read maintenance' },
    { value: 'write:maintenance', label: 'Manage maintenance' },
    { value: 'read:webhooks', label: 'Read webhooks' },
] as const

const generateSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    expires_in_days: z.number().min(1, 'Choose an expiration'),
    scopes: z.array(z.string()).optional(),
    ip_whitelist: z.string().optional(),
})

type GenerateFormValues = z.infer<typeof generateSchema>

export function GenerateApiKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const queryClient = useQueryClient()
    const [revealedKey, setRevealedKey] = useState<string | null>(null)

    const { control, register, handleSubmit, reset, formState: { errors } } = useForm<GenerateFormValues>({
        resolver: zodResolver(generateSchema),
        defaultValues: { name: '', expires_in_days: 30, scopes: [], ip_whitelist: '' },
    })

    const generateMutation = useMutation({
        mutationFn: api.generateApiKey,
        onSuccess: (res) => {
            setRevealedKey(res.data.api_key)
            queryClient.invalidateQueries({ queryKey: ['api-keys'] })
            toast.success('API key generated')
        },
        onError: () => toast.error('Failed to generate API key'),
    })

    const onSubmit = (data: GenerateFormValues) => {
        generateMutation.mutate({
            ...data,
            scopes: data.scopes ?? [],
            ip_whitelist: data.ip_whitelist ? data.ip_whitelist.split(',').map((ip) => ip.trim()) : [],
        })
    }

    const close = () => {
        setRevealedKey(null)
        reset()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={(next) => (!next && revealedKey ? close() : onOpenChange(next))}>
            <DialogContent className="shadow-none sm:max-w-[680px]">
                {revealedKey ? (
                    <div className="space-y-6 pt-4">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                            <LockKeyhole className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-slate-900">Key generated</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Copy this key now — <strong className="text-rose-600">it won&apos;t be shown again.</strong>
                            </p>
                        </div>
                        <div className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 p-3 font-mono text-sm break-all text-slate-800">
                            <p className="pr-10">{revealedKey}</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                onClick={() => {
                                    navigator.clipboard.writeText(revealedKey)
                                    toast.info('Copied to clipboard')
                                }}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700" onClick={close}>
                            I have stored it securely
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Generate API key</DialogTitle>
                            <DialogDescription>Name it clearly so your team knows what uses it.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input {...register('name')} placeholder="e.g. ERP Sync Script" />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Expires in</Label>
                                    <Controller
                                        name="expires_in_days"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="7">7 days</SelectItem>
                                                    <SelectItem value="30">30 days</SelectItem>
                                                    <SelectItem value="90">90 days</SelectItem>
                                                    <SelectItem value="365">1 year</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.25fr_0.75fr]">
                                <div className="space-y-2">
                                    <Label>Scopes</Label>
                                    <Controller
                                        name="scopes"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                                                {API_KEY_SCOPES.map((scope) => {
                                                    const selected = field.value?.includes(scope.value) ?? false
                                                    return (
                                                        <label key={scope.value} className="flex items-start gap-2 rounded-md bg-white p-2 text-sm text-slate-700">
                                                            <Checkbox
                                                                className="mt-0.5 shadow-none"
                                                                checked={selected}
                                                                onCheckedChange={(checked) => {
                                                                    const current = field.value ?? []
                                                                    field.onChange(
                                                                        checked
                                                                            ? [...current, scope.value]
                                                                            : current.filter((value) => value !== scope.value),
                                                                    )
                                                                }}
                                                            />
                                                            <span>
                                                                <span className="block font-medium">{scope.label}</span>
                                                                <span className="block font-mono text-[11px] text-slate-400">{scope.value}</span>
                                                            </span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>IP whitelist</Label>
                                    <Input {...register('ip_whitelist')} placeholder="192.168.1.1, 10.0.0.5" />
                                    <p className="text-[11px] leading-5 text-slate-500">Optional. Separate multiple IP addresses with commas.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={generateMutation.isPending} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
                                    {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeySquare className="mr-2 h-4 w-4" />}
                                    Generate key
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
