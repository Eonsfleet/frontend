'use client'

import { useState } from 'react'
import { Check, Bell, Mail, MessageSquare, Webhook, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn, extractApiError } from '@/lib/utils'
import { toast } from 'sonner'
import {
    createFuelAlertRule,
    type FuelAlertChannels,
    type FuelAlertMetric,
    type FuelAlertRulePayload,
    type FuelAlertType,
    type VehicleScope,
} from '@/lib/api/fuel'
import { VehicleMultiSelect } from './VehicleMultiSelect'
import { UserMultiSelect } from './UserMultiSelect'

interface CreateAlertRuleModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const STEPS = ['Rule Details', 'Conditions', 'Notifications', 'Review'] as const

const ALERT_TYPE_OPTIONS: { value: FuelAlertType; label: string }[] = [
    { value: 'low_fuel', label: 'Low Fuel' },
    { value: 'refill', label: 'Refill' },
    { value: 'fuel_theft', label: 'Fuel Theft' },
    { value: 'fuel_leakage', label: 'Fuel Leakage' },
    { value: 'sensor_malfunction', label: 'Sensor Malfunction' },
    { value: 'rapid_drop', label: 'Rapid Drop' },
]

const METRIC_OPTIONS: { value: FuelAlertMetric; label: string; unit: '%' | 'L' | '' }[] = [
    { value: 'fuel_level_percent', label: 'Fuel Level (%)', unit: '%' },
    { value: 'fuel_drop_percent', label: 'Fuel Drop (%)', unit: '%' },
    { value: 'fuel_drop_liters', label: 'Fuel Drop (L)', unit: 'L' },
    { value: 'fuel_rise_percent', label: 'Fuel Rise (%)', unit: '%' },
    { value: 'fuel_rise_liters', label: 'Fuel Rise (L)', unit: 'L' },
    { value: 'invalid_reading_count', label: 'Invalid Reading Count', unit: '' },
]

// The backend restricts which metrics are valid per alert type. The dropdown only
// offers allowed metrics, and switching type auto-picks the first valid one.
const ALERT_TYPE_METRICS: Record<FuelAlertType, FuelAlertMetric[]> = {
    low_fuel: ['fuel_level_percent'],
    refill: ['fuel_rise_percent', 'fuel_rise_liters'],
    fuel_theft: ['fuel_drop_percent', 'fuel_drop_liters'],
    fuel_leakage: ['fuel_drop_percent', 'fuel_drop_liters'],
    sensor_malfunction: ['invalid_reading_count'],
    rapid_drop: ['fuel_drop_percent', 'fuel_drop_liters'],
}

// Channel object keys ↔ display metadata.
const CHANNELS: { key: keyof FuelAlertChannels; title: string; sub: string; icon: typeof Bell }[] = [
    { key: 'in_app', title: 'In-app Notification', sub: 'Send notification in EonsFleet', icon: Bell },
    { key: 'email', title: 'Email', sub: 'Send email to selected recipients', icon: Mail },
    { key: 'sms', title: 'SMS', sub: 'Send SMS to selected phone numbers', icon: MessageSquare },
    { key: 'webhook', title: 'Webhook', sub: 'Send data to external system', icon: Webhook },
]

function SelectBox({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select {...props} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {children}
        </select>
    )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                {label}{required && <span className="text-rose-500"> *</span>}
            </label>
            {children}
        </div>
    )
}

const DEFAULT_CHANNELS: FuelAlertChannels = { in_app: true, email: false, sms: false, webhook: false }

export function CreateAlertRuleModal({ open, onOpenChange }: CreateAlertRuleModalProps) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState(0)
    const [active, setActive] = useState(true)
    const [ruleName, setRuleName] = useState('')
    const [alertType, setAlertType] = useState<FuelAlertType>('low_fuel')
    const [description, setDescription] = useState('')
    const [metric, setMetric] = useState<FuelAlertMetric>('fuel_level_percent')
    const [operator, setOperator] = useState<'lte' | 'gte'>('lte')
    const [threshold, setThreshold] = useState('20')
    // Duration is optional — left empty, it is omitted from the condition.
    const [durationValue, setDurationValue] = useState('15')
    const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('minutes')
    const [vehicleScope, setVehicleScope] = useState<VehicleScope>('all_vehicles')
    const [vehicleIds, setVehicleIds] = useState<number[]>([])
    const [channels, setChannels] = useState<FuelAlertChannels>(DEFAULT_CHANNELS)
    const [recipientUserIds, setRecipientUserIds] = useState<number[]>([])

    const reset = () => {
        setStep(0)
        setActive(true)
        setRuleName('')
        setAlertType('low_fuel')
        setDescription('')
        setMetric('fuel_level_percent')
        setOperator('lte')
        setThreshold('20')
        setDurationValue('15')
        setDurationUnit('minutes')
        setVehicleScope('all_vehicles')
        setVehicleIds([])
        setChannels(DEFAULT_CHANNELS)
        setRecipientUserIds([])
    }

    // Metrics allowed for the current alert type; the dropdown shows only these.
    const allowedMetrics = ALERT_TYPE_METRICS[alertType]
    const metricOptions = METRIC_OPTIONS.filter((m) => allowedMetrics.includes(m.value))
    const metricMeta = metricOptions.find((m) => m.value === metric) ?? metricOptions[0]

    // When the alert type changes, keep the metric valid for the new type.
    const changeAlertType = (next: FuelAlertType) => {
        setAlertType(next)
        const allowed = ALERT_TYPE_METRICS[next]
        if (!allowed.includes(metric)) setMetric(allowed[0])
    }

    const buildPayload = (): FuelAlertRulePayload => {
        const durationNum = Number(durationValue)
        const hasDuration = durationValue.trim() !== '' && Number.isFinite(durationNum) && durationNum > 0
        const specific = vehicleScope === 'specific_vehicles'
        return {
            name: ruleName.trim(),
            alert_type: alertType,
            description: description.trim() || null,
            is_active: active,
            condition: {
                metric,
                operator,
                threshold_value: Number(threshold) || 0,
                ...(hasDuration ? { duration_value: durationNum, duration_unit: durationUnit } : {}),
            },
            vehicle_scope: vehicleScope,
            ...(specific ? { vehicle_ids: vehicleIds } : {}),
            channels,
            recipient_user_ids: recipientUserIds,
            recipient_emails: [],
            recipient_phone_numbers: [],
            webhook_endpoint_ids: [],
        }
    }

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: FuelAlertRulePayload) => createFuelAlertRule(payload),
        onSuccess: () => {
            toast.success('Alert rule created')
            queryClient.invalidateQueries({ queryKey: ['fuel-alert-rules'] })
            close(false)
        },
        onError: (error) => toast.error(extractApiError(error, 'Failed to create alert rule.')),
    })

    const close = (o: boolean) => { if (!o && !isPending) { reset(); onOpenChange(o) } else if (o) onOpenChange(o) }
    const finish = () => {
        if (!ruleName.trim()) {
            toast.error('Rule name is required.')
            setStep(0)
            return
        }
        if (vehicleScope === 'specific_vehicles' && vehicleIds.length === 0) {
            toast.error('Select at least one vehicle, or choose "All Vehicles".')
            setStep(1)
            return
        }
        if (!channels.in_app && !channels.email && !channels.sms && !channels.webhook) {
            toast.error('Select at least one notification channel.')
            setStep(2)
            return
        }
        if (recipientUserIds.length === 0) {
            toast.error('Select at least one recipient.')
            setStep(2)
            return
        }
        mutate(buildPayload())
    }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-4xl sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Create Alert</DialogTitle>
                    <p className="text-sm text-slate-500">Define conditions to be notified when an alert should be triggered.</p>
                </DialogHeader>

                <div className="flex gap-8">
                    {/* Timeline stepper */}
                    <ol className="hidden w-44 shrink-0 sm:block">
                        {STEPS.map((s, i) => {
                            const done = i < step
                            const active = i === step
                            const last = i === STEPS.length - 1
                            return (
                                <li key={s} className="flex gap-3">
                                    {/* Number + connecting line */}
                                    <div className="flex flex-col items-center">
                                        <span className={cn(
                                            'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                                            done || active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400',
                                        )}>
                                            {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                                        </span>
                                        {!last && <span className={cn('my-1 w-0.5 flex-1', done ? 'bg-blue-600' : 'bg-slate-200')} style={{ minHeight: 28 }} />}
                                    </div>
                                    <span className={cn('pt-1 text-[13px]', active ? 'font-semibold text-slate-900' : done ? 'font-medium text-slate-600' : 'font-medium text-slate-400')}>{s}</span>
                                </li>
                            )
                        })}
                    </ol>

                    {/* Step body */}
                    <div className="min-h-[240px] flex-1">
                        {step === 0 && (
                            <div className="space-y-4">
                                <Field label="Rule Name" required>
                                    <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Low Fuel Level" className="h-9 border-slate-200 text-[13px]" />
                                </Field>
                                <Field label="Alert Type" required>
                                    <SelectBox value={alertType} onChange={(e) => changeAlertType(e.target.value as FuelAlertType)}>
                                        {ALERT_TYPE_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </SelectBox>
                                </Field>
                                <Field label="Description">
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Enter rule description (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </Field>
                                <div className="flex items-center gap-2">
                                    <Switch checked={active} onCheckedChange={setActive} />
                                    <span className="text-[13px] font-medium text-slate-600">Active</span>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-4">
                                <p className="text-[13px] text-slate-500">Define when this alert should be triggered.</p>
                                <div className="flex flex-wrap items-end gap-2">
                                    <span className="pb-2 text-[13px] font-semibold text-slate-600">If</span>
                                    <SelectBox value={metric} onChange={(e) => setMetric(e.target.value as FuelAlertMetric)} style={{ width: 190 }}>
                                        {metricOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </SelectBox>
                                    <SelectBox value={operator} onChange={(e) => setOperator(e.target.value as 'lte' | 'gte')} style={{ width: 170 }}>
                                        <option value="lte">is less than or equal to</option>
                                        <option value="gte">is greater than or equal to</option>
                                    </SelectBox>
                                    <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} type="number" className="h-9 w-20 border-slate-200 text-[13px]" />
                                    {metricMeta.unit && <span className="pb-2 text-[13px] text-slate-500">{metricMeta.unit}</span>}
                                </div>
                                <div className="flex flex-wrap items-end gap-2">
                                    <span className="pb-2 text-[13px] font-semibold text-slate-600">For</span>
                                    <Input value={durationValue} onChange={(e) => setDurationValue(e.target.value)} type="number" placeholder="Optional" className="h-9 w-24 border-slate-200 text-[13px]" />
                                    <SelectBox value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as 'minutes' | 'hours')} style={{ width: 120 }}>
                                        <option value="minutes">minutes</option>
                                        <option value="hours">hours</option>
                                    </SelectBox>
                                    <span className="pb-2 text-[11px] text-slate-400">(leave empty for instant)</span>
                                </div>
                                <Field label="Apply to">
                                    <SelectBox value={vehicleScope} onChange={(e) => setVehicleScope(e.target.value as VehicleScope)}>
                                        <option value="all_vehicles">All Vehicles</option>
                                        <option value="specific_vehicles">Specific Vehicles</option>
                                    </SelectBox>
                                    {vehicleScope === 'specific_vehicles' && (
                                        <div className="mt-2">
                                            <VehicleMultiSelect value={vehicleIds} onChange={setVehicleIds} allLabel="Select vehicles" />
                                            <p className="mt-1 text-[11px] text-slate-400">Select one or more vehicles this rule applies to.</p>
                                        </div>
                                    )}
                                </Field>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-3">
                                <p className="text-[13px] text-slate-500">Choose how you want to be notified.</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {CHANNELS.map((c) => {
                                        const on = channels[c.key]
                                        return (
                                            <button
                                                key={c.key}
                                                type="button"
                                                onClick={() => setChannels((p) => ({ ...p, [c.key]: !p[c.key] }))}
                                                className={cn(
                                                    'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                                                    on ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50',
                                                )}
                                            >
                                                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', on ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400')}>
                                                    <c.icon className="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[13px] font-semibold text-slate-800">{c.title}</span>
                                                    <span className="block text-[11px] text-slate-400">{c.sub}</span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>

                                <Field label="Recipients" required>
                                    <UserMultiSelect value={recipientUserIds} onChange={setRecipientUserIds} />
                                    <p className="mt-1 text-[11px] text-slate-400">Users who will receive this alert on the enabled channels.</p>
                                </Field>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-3">
                                <p className="text-[13px] text-slate-500">Review your alert rule before saving.</p>
                                <dl className="space-y-2 rounded-xl border border-slate-100 p-3 text-[13px]">
                                    <div className="flex justify-between"><dt className="text-slate-400">Rule Name</dt><dd className="font-medium text-slate-700">{ruleName || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Alert Type</dt><dd className="font-medium text-slate-700">{ALERT_TYPE_OPTIONS.find((o) => o.value === alertType)?.label}</dd></div>
                                    <div className="flex justify-between gap-4"><dt className="text-slate-400">Condition</dt><dd className="text-right font-medium text-slate-700">{metricMeta.label} {operator === 'lte' ? '≤' : '≥'} {threshold}{metricMeta.unit}{durationValue.trim() && Number(durationValue) > 0 ? ` for ${durationValue} ${durationUnit}` : ''}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Apply to</dt><dd className="font-medium text-slate-700">{vehicleScope === 'all_vehicles' ? 'All Vehicles' : `${vehicleIds.length} vehicle${vehicleIds.length === 1 ? '' : 's'}`}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="font-medium text-slate-700">{active ? 'Active' : 'Inactive'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Notifications</dt><dd className="font-medium text-slate-700">{CHANNELS.filter((c) => channels[c.key]).map((c) => c.title).join(', ') || 'None'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Recipients</dt><dd className="font-medium text-slate-700">{recipientUserIds.length === 0 ? 'None' : `${recipientUserIds.length} user${recipientUserIds.length === 1 ? '' : 's'}`}</dd></div>
                                </dl>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button type="button" onClick={() => toast.info('Saved as draft')} className="text-[13px] font-semibold text-slate-500 hover:text-slate-700">
                        Save as Draft
                    </button>
                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <button type="button" onClick={() => setStep((s) => s - 1)} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                                Back
                            </button>
                        )}
                        {step < STEPS.length - 1 ? (
                            <button type="button" onClick={() => setStep((s) => s + 1)} className="h-9 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700">
                                Next
                            </button>
                        ) : (
                            <button type="button" onClick={finish} disabled={isPending} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Create Rule
                            </button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
