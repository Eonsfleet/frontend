'use client'

import { useState } from 'react'
import { Check, Bell, Mail, MessageSquare, Webhook, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn, extractApiError } from '@/lib/utils'
import { toast } from 'sonner'
import { createFuelAlertRule, type FuelAlertRulePayload, type VehicleScope } from '@/lib/api/fuel'

interface CreateAlertRuleModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const STEPS = ['Rule Details', 'Conditions', 'Notifications', 'Review'] as const

// Maps the notification channel display titles to the API's channel slugs.
const CHANNEL_SLUG: Record<string, string> = {
    'In-app Notification': 'in_app',
    Email: 'email',
    SMS: 'sms',
    Webhook: 'webhook',
}

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

const CHANNELS = [
    { icon: Bell, title: 'In-app Notification', sub: 'Send notification in EonsFleet' },
    { icon: Mail, title: 'Email', sub: 'Send email to selected recipients' },
    { icon: MessageSquare, title: 'SMS', sub: 'Send SMS to selected phone numbers' },
    { icon: Webhook, title: 'Webhook', sub: 'Send data to external system' },
]

export function CreateAlertRuleModal({ open, onOpenChange }: CreateAlertRuleModalProps) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState(0)
    const [active, setActive] = useState(true)
    const [ruleName, setRuleName] = useState('')
    const [alertType, setAlertType] = useState('low_fuel')
    const [description, setDescription] = useState('')
    const [metric, setMetric] = useState('fuel_level')
    const [operator, setOperator] = useState<'lte' | 'gte'>('lte')
    const [threshold, setThreshold] = useState('20')
    const [durationValue, setDurationValue] = useState('10')
    const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('minutes')
    const [vehicleScope, setVehicleScope] = useState<VehicleScope>('all')
    const [channels, setChannels] = useState<Record<string, boolean>>({ 'In-app Notification': true })

    const reset = () => {
        setStep(0)
        setActive(true)
        setRuleName('')
        setAlertType('low_fuel')
        setDescription('')
        setMetric('fuel_level')
        setOperator('lte')
        setThreshold('20')
        setDurationValue('10')
        setDurationUnit('minutes')
        setVehicleScope('all')
        setChannels({ 'In-app Notification': true })
    }

    const buildPayload = (): FuelAlertRulePayload => ({
        name: ruleName.trim(),
        alert_type: alertType,
        description: description.trim() || null,
        is_active: active,
        vehicle_scope: vehicleScope,
        condition: {
            metric,
            operator,
            threshold_value: Number(threshold) || 0,
            duration_value: Number(durationValue) || 0,
            duration_unit: durationUnit,
        },
        channels: Object.keys(channels)
            .filter((title) => channels[title])
            .map((title) => CHANNEL_SLUG[title] ?? title.toLowerCase()),
    })

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
        // 'specific' scope needs vehicle_ids, but there's no per-vehicle picker yet —
        // block it with a clear message rather than sending an invalid payload.
        if (vehicleScope === 'specific') {
            toast.error('Selecting specific vehicles is not available yet. Choose "All Vehicles".')
            setStep(1)
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
                                    <SelectBox value={alertType} onChange={(e) => setAlertType(e.target.value)}>
                                        <option value="low_fuel">Low Fuel</option>
                                        <option value="fuel_theft">Fuel Theft</option>
                                        <option value="rapid_drop">Rapid Drop</option>
                                        <option value="unauthorized_drain">Unauthorized Drain</option>
                                        <option value="sensor_error">Sensor Error</option>
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
                                    <SelectBox value={metric} onChange={(e) => setMetric(e.target.value)} style={{ width: 140 }}>
                                        <option value="fuel_level">Fuel Level</option>
                                        <option value="fuel_drop">Fuel Drop</option>
                                        <option value="idle_time">Idle Time</option>
                                    </SelectBox>
                                    <SelectBox value={operator} onChange={(e) => setOperator(e.target.value as 'lte' | 'gte')} style={{ width: 170 }}>
                                        <option value="lte">is less than or equal to</option>
                                        <option value="gte">is greater than or equal to</option>
                                    </SelectBox>
                                    <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} type="number" className="h-9 w-20 border-slate-200 text-[13px]" />
                                    <span className="pb-2 text-[13px] text-slate-500">%</span>
                                </div>
                                <div className="flex flex-wrap items-end gap-2">
                                    <span className="pb-2 text-[13px] font-semibold text-slate-600">For</span>
                                    <Input value={durationValue} onChange={(e) => setDurationValue(e.target.value)} type="number" className="h-9 w-20 border-slate-200 text-[13px]" />
                                    <SelectBox value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as 'minutes' | 'hours')} style={{ width: 120 }}>
                                        <option value="minutes">minutes</option>
                                        <option value="hours">hours</option>
                                    </SelectBox>
                                </div>
                                <Field label="Apply to">
                                    <SelectBox value={vehicleScope} onChange={(e) => setVehicleScope(e.target.value as VehicleScope)}>
                                        <option value="all">All Vehicles</option>
                                        <option value="specific">Specific Vehicles</option>
                                    </SelectBox>
                                </Field>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-3">
                                <p className="text-[13px] text-slate-500">Choose how you want to be notified.</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {CHANNELS.map((c) => {
                                        const on = channels[c.title]
                                        return (
                                            <button
                                                key={c.title}
                                                type="button"
                                                onClick={() => setChannels((p) => ({ ...p, [c.title]: !p[c.title] }))}
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
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-3">
                                <p className="text-[13px] text-slate-500">Review your alert rule before saving.</p>
                                <dl className="space-y-2 rounded-xl border border-slate-100 p-3 text-[13px]">
                                    <div className="flex justify-between"><dt className="text-slate-400">Rule Name</dt><dd className="font-medium text-slate-700">{ruleName || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Alert Type</dt><dd className="font-medium capitalize text-slate-700">{alertType.replaceAll('_', ' ')}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Condition</dt><dd className="font-medium text-slate-700">{metric.replaceAll('_', ' ')} {operator === 'lte' ? '≤' : '≥'} {threshold}% for {durationValue} {durationUnit}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Apply to</dt><dd className="font-medium text-slate-700">{vehicleScope === 'all' ? 'All Vehicles' : 'Specific Vehicles'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="font-medium text-slate-700">{active ? 'Active' : 'Inactive'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-slate-400">Notifications</dt><dd className="font-medium text-slate-700">{Object.keys(channels).filter((k) => channels[k]).join(', ') || 'None'}</dd></div>
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
