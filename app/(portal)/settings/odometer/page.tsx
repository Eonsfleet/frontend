'use client'

import { OdometerSettingsForm } from '@/components/odometer/OdometerSettingsForm'

export default function OdometerSettingsPage() {
    return (
        <div className="max-w-2xl space-y-4 p-6">
            <div>
                <h1 className="text-xl font-bold text-slate-900">Odometer settings</h1>
                <p className="text-sm text-slate-500">How readings are checked, and when a person has to review them.</p>
            </div>
            <OdometerSettingsForm />
        </div>
    )
}
