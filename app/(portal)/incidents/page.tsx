import { Suspense } from 'react'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { IncidentList } from '@/components/incidents/IncidentList'

export default function IncidentsPage() {
    return (
        <UpgradeGate
            module="incidents"
            featureName="Incident Management"
            description="Track, investigate, and resolve fleet incidents with our comprehensive 9-state workflow engine."
            requiredPlan="enterprise"
        >
            <div className="p-8 space-y-8 bg-slate-50 min-h-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incidents</h1>
                        <p className="text-slate-500 mt-1">Reported issues, ongoing investigations, and resolutions.</p>
                    </div>
                </div>

                <Suspense>
                    <IncidentList />
                </Suspense>
            </div>
        </UpgradeGate>
    )
}
