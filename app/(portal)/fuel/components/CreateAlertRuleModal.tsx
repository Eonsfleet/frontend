'use client'

import { useState } from 'react'
import { Check, Bell, Mail, MessageSquare, Webhook } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CreateAlertRuleModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const STEPS = ['Rule Details', 'Conditions', 'Notifications', 'Review'] as const

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
    const [step, setStep] = useState(0)
    const [active, setActive] = useState(true)
    const [ruleName, setRuleName] = useState('')
    const [channels, setChannels] = useState<Record<string, boolean>>({ 'In-app Notification': true })

    const reset = () => { setStep(0); setActive(true); setRuleName(''); setChannels({ 'In-app Notification': true }) }
    const close = (o: boolean) => { if (!o) reset(); onOpenChange(o) }
    const finish = () => { toast.success('Alert rule created'); close(false) }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-4xl sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Create Alert Rule</DialogTitle>
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
                                    <SelectBox defaultValue="low_fuel">
                                        <option value="low_fuel">Low Fuel</option>
                                        <option value="fuel_theft">Fuel Theft</option>
                                        <option value="rapid_drop">Rapid Drop</option>
                                        <option value="unauthorized_drain">Unauthorized Drain</option>
                                        <option value="sensor_error">Sensor Error</option>
                                    </SelectBox>
                                </Field>
                                <Field label="Description">
                                    <textarea rows={3} placeholder="Enter rule description (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                                    <SelectBox defaultValue="fuel_level" style={{ width: 140 }}>
                                        <option value="fuel_level">Fuel Level</option>
                                        <option value="fuel_drop">Fuel Drop</option>
                                        <option value="idle_time">Idle Time</option>
                                    </SelectBox>
                                    <SelectBox defaultValue="lte" style={{ width: 170 }}>
                                        <option value="lte">is less than or equal to</option>
                                        <option value="gte">is greater than or equal to</option>
                                    </SelectBox>
                                    <Input defaultValue="20" className="h-9 w-20 border-slate-200 text-[13px]" />
                                    <span className="pb-2 text-[13px] text-slate-500">%</span>
                                </div>
                                <div className="flex flex-wrap items-end gap-2">
                                    <span className="pb-2 text-[13px] font-semibold text-slate-600">For</span>
                                    <Input defaultValue="10" className="h-9 w-20 border-slate-200 text-[13px]" />
                                    <SelectBox defaultValue="minutes" style={{ width: 120 }}>
                                        <option value="minutes">minutes</option>
                                        <option value="hours">hours</option>
                                    </SelectBox>
                                </div>
                                <Field label="Apply to">
                                    <SelectBox defaultValue="all"><option value="all">All Vehicles</option></SelectBox>
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
                            <button type="button" onClick={finish} className="h-9 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700">
                                Create Rule
                            </button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
