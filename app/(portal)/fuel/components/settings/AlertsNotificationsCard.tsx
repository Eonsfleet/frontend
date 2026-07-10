'use client'

import { SettingsCard, Field, SettingsSelect, CheckboxRow, BLUE_CHECKBOX_CLASS } from './shared'
import { Checkbox } from '@/components/ui/checkbox'
import { TIME_OPTIONS } from './types'
import type { AlertsSettings } from './types'

interface AlertsNotificationsCardProps {
    value: AlertsSettings
    onChange: (value: AlertsSettings) => void
}

export function AlertsNotificationsCard({ value, onChange }: AlertsNotificationsCardProps) {
    const setChannel = (key: keyof AlertsSettings['channels'], checked: boolean) =>
        onChange({ ...value, channels: { ...value.channels, [key]: checked } })

    return (
        <SettingsCard
            title="Fuel Alerts & Notifications"
            description="Choose how and when you want to be notified."
        >
            <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">Alert Channels</p>
                <div className="space-y-3">
                    <CheckboxRow
                        id="channel-in-app"
                        label="In-app Notifications"
                        checked={value.channels.inApp}
                        onCheckedChange={(checked) => setChannel('inApp', checked)}
                    />
                    <CheckboxRow
                        id="channel-email"
                        label="Email"
                        checked={value.channels.email}
                        onCheckedChange={(checked) => setChannel('email', checked)}
                    />
                    <CheckboxRow
                        id="channel-sms"
                        label="SMS"
                        checked={value.channels.sms}
                        onCheckedChange={(checked) => setChannel('sms', checked)}
                    />
                    <CheckboxRow
                        id="channel-webhook"
                        label="Webhook"
                        checked={value.channels.webhook}
                        onCheckedChange={(checked) => setChannel('webhook', checked)}
                    />
                </div>
            </div>

            <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">Quiet Hours (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="From">
                        <SettingsSelect
                            value={value.quietFrom}
                            onValueChange={(v) => onChange({ ...value, quietFrom: v })}
                            options={TIME_OPTIONS}
                            ariaLabel="Quiet hours from"
                        />
                    </Field>
                    <Field label="To">
                        <SettingsSelect
                            value={value.quietTo}
                            onValueChange={(v) => onChange({ ...value, quietTo: v })}
                            options={TIME_OPTIONS}
                            ariaLabel="Quiet hours to"
                        />
                    </Field>
                </div>
            </div>

            <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">Alert Summary</p>
                <div className="flex items-center gap-3">
                    <Checkbox
                        id="daily-summary"
                        checked={value.dailySummaryEnabled}
                        onCheckedChange={(checked) => onChange({ ...value, dailySummaryEnabled: checked === true })}
                        className={BLUE_CHECKBOX_CLASS}
                    />
                    <label htmlFor="daily-summary" className="text-sm font-medium text-slate-700">
                        Send daily summary at
                    </label>
                    <div className="w-32">
                        <SettingsSelect
                            value={value.summaryTime}
                            onValueChange={(v) => onChange({ ...value, summaryTime: v })}
                            options={TIME_OPTIONS}
                            ariaLabel="Daily summary time"
                            disabled={!value.dailySummaryEnabled}
                        />
                    </div>
                </div>
            </div>
        </SettingsCard>
    )
}
