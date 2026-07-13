'use client'

import { Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

export function SettingsCard({
    title,
    description,
    children,
    className,
}: {
    title: string
    description?: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <Card className={cn('rounded-2xl border-none shadow-none', className)}>
            <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle>
                {description && (
                    <CardDescription className="text-sm text-slate-500">{description}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-6">{children}</CardContent>
        </Card>
    )
}

export function Field({
    label,
    children,
    className,
}: {
    label: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={className}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            {children}
        </div>
    )
}

export function SettingsSelect({
    value,
    onValueChange,
    options,
    ariaLabel,
    placeholder,
    disabled,
}: {
    value: string
    onValueChange: (value: string) => void
    options: { value: string; label: string }[]
    ariaLabel?: string
    placeholder?: string
    disabled?: boolean
}) {
    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 text-sm" aria-label={ariaLabel}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export function UnitInput({
    value,
    onChange,
    unit,
    ariaLabel,
}: {
    value: string
    onChange: (value: string) => void
    unit: string
    ariaLabel?: string
}) {
    return (
        <div className="relative">
            <Input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={ariaLabel}
                className="h-10 rounded-lg border-slate-200 pr-14 text-sm"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {unit}
            </span>
        </div>
    )
}

export function InfoBanner({
    tone = 'blue',
    children,
    action,
}: {
    tone?: 'blue' | 'amber'
    children: React.ReactNode
    action?: React.ReactNode
}) {
    const toneClasses =
        tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-blue-100 bg-blue-50 text-blue-700'
    const iconClasses = tone === 'amber' ? 'text-amber-500' : 'text-blue-500'

    return (
        <div className={cn('flex items-start justify-between gap-3 rounded-lg border p-3 text-sm', toneClasses)}>
            <div className="flex items-start gap-2">
                <Info className={cn('mt-0.5 h-4 w-4 shrink-0', iconClasses)} />
                <span>{children}</span>
            </div>
            {action}
        </div>
    )
}

export function CheckboxRow({
    id,
    label,
    checked,
    onCheckedChange,
    icon: Icon,
}: {
    id: string
    label: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    icon?: LucideIcon
}) {
    return (
        <label
            htmlFor={id}
            className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700"
        >
            <span className="flex items-center gap-1.5">
                {label}
                {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
            </span>
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => onCheckedChange(value === true)}
                className={BLUE_CHECKBOX_CLASS}
            />
        </label>
    )
}

export const BLUE_CHECKBOX_CLASS =
    'data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-600'
