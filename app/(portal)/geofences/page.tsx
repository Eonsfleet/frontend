import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { GeofenceList } from '@/components/geofencing/GeofenceList'

export default function GeofencesPage() {
    return (
        <UpgradeGate
            module="geofence"
            featureName="Geofencing"
            description="Create virtual boundaries and receive alerts when vehicles enter or exit defined zones."
            requiredPlan="growth"
        >
            <div className="p-8 space-y-8 bg-slate-50 min-h-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Geofences</h1>
                        <p className="text-slate-500 mt-1">Manage virtual boundaries and associated vehicle alerts.</p>
                    </div>
                </div>

                <GeofenceList />
            </div>
        </UpgradeGate>
    )
}
