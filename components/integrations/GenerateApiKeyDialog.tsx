'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Copy, KeySquare, Loader2, LockKeyhole, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api/settings'

const API_KEY_SCOPES = [
    { value: 'read:fleet', label: 'Read fleet data' },
    { value: 'write:fleet', label: 'Manage fleet data' },
    { value: 'read:analytics', label: 'Read analytics' },
    { value: 'read:trips', label: 'Read trips' },
    { value: 'write:trips', label: 'Manage trips' },
    { value: 'read:fuel', label: 'Read fuel data' },
    { value: 'write:fuel', label: 'Manage fuel data' },
    { value: 'read:compliance', label: 'Read compliance' },
    { value: 'webhooks', label: 'Manage webhooks' },
] as const

const generateSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    expires_in_days: z.number().min(1, 'Choose an expiration'),
    scopes: z.array(z.string()).min(1, 'Choose at least one scope'),
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
                                    <RequiredLabel>Name</RequiredLabel>
                                    <Input {...register('name')} className="shadow-none" placeholder="e.g. ERP Sync Script" />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <RequiredLabel>Expires in</RequiredLabel>
                                    <Controller
                                        name="expires_in_days"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                                                <SelectTrigger className="w-full shadow-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="shadow-none">
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
                                    <RequiredLabel>Scopes</RequiredLabel>
                                    <Controller
                                        name="scopes"
                                        control={control}
                                        render={({ field }) => <ScopeMultiSelect value={field.value ?? []} onChange={field.onChange} />}
                                    />
                                    {errors.scopes && <p className="text-xs text-red-500">{errors.scopes.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>IP whitelist</Label>
                                    <Input {...register('ip_whitelist')} className="shadow-none" placeholder="192.168.1.1, 10.0.0.5" />
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

function RequiredLabel({ children }: { children: React.ReactNode }) {
    return (
        <Label>
            {children} <span className="text-red-500">*</span>
        </Label>
    )
}

function ScopeMultiSelect({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
    const [open, setOpen] = useState(false)

    const toggle = (scope: string) => {
        onChange(value.includes(scope) ? value.filter((item) => item !== scope) : [...value, scope])
    }

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="h-auto min-h-10 w-full justify-between text-left font-normal shadow-none"
                    >
                        <span className="truncate text-slate-500">
                            {value.length === 0 ? 'Select one or more scopes' : `${value.length} scope${value.length === 1 ? '' : 's'} selected`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-none" align="start">
                    <Command>
                        <CommandInput placeholder="Search scopes..." />
                        <CommandList>
                            <CommandEmpty>No scopes found.</CommandEmpty>
                            <CommandGroup>
                                {API_KEY_SCOPES.map((scope) => {
                                    const selected = value.includes(scope.value)
                                    return (
                                        <CommandItem
                                            key={scope.value}
                                            value={`${scope.label} ${scope.value}`}
                                            onSelect={() => toggle(scope.value)}
                                            className="items-start gap-3"
                                        >
                                            <span className={cn('mt-0.5 flex h-4 w-4 items-center justify-center rounded-[4px] border', selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>
                                                {selected && <Check className="h-3 w-3" />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-medium text-slate-900">{scope.label}</span>
                                                <span className="block font-mono text-[11px] text-slate-500">{scope.value}</span>
                                            </span>
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((scope) => (
                        <Badge key={scope} variant="secondary" className="gap-1 rounded-md py-1 pl-2 pr-1 text-[11px] font-medium shadow-none">
                            {API_KEY_SCOPES.find((option) => option.value === scope)?.label ?? scope}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((item) => item !== scope))}
                                className="rounded-sm p-0.5 hover:bg-slate-200"
                                aria-label={`Remove ${scope}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
