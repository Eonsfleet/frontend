'use client'

import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { GeofenceList } from '@/components/geofencing/GeofenceList'
// import { GeofenceMap } from '@/components/geofencing/GeofenceMap' // Re-enable when layout is ready
import { GeofenceBuilder } from '../../../components/geofencing/GeofenceBuilder'
import { useState } from 'react'
import { Plus, List, Map as MapIcon, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GeofencesPage() {
    const [view, setView] = useState<'list' | 'map'>('list')
    const [isBuilderOpen, setIsBuilderOpen] = useState(false)

    return (
        <UpgradeGate
            module="geofence"
            featureName="Geofencing"
            description="Create virtual boundaries and receive alerts when vehicles enter or exit defined zones."
            requiredPlan="growth"
        >
            <div className="p-8 pb-16 space-y-8 bg-slate-50 min-h-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                            Geofence <span className="text-blue-600">Manager</span>
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            Virtual Boundaries • Asset Security & Monitoring
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm mr-2">
                            <button
                                onClick={() => setView('list')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    view === 'list' ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setView('map')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    view === 'map' ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <MapIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsBuilderOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Create Geofence
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                        <Filter className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Category: All</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200 mx-2" />
                    <input
                        type="text"
                        placeholder="SEARCH GEOFENCES..."
                        className="bg-transparent border-none focus:ring-0 text-[10px] font-bold uppercase tracking-widest text-slate-600 placeholder:text-slate-300 flex-1"
                    />
                </div>

                {view === 'list' ? (
                    <GeofenceList />
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden h-[600px] shadow-sm flex items-center justify-center">
                        <div className="text-center">
                            <MapIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Unified Map View coming soon</p>
                            <p className="text-[10px] text-slate-300 font-medium mt-2">Enhanced spatial visualization of all fleet boundaries</p>
                        </div>
                    </div>
                )}

                <GeofenceBuilder
                    isOpen={isBuilderOpen}
                    onClose={() => setIsBuilderOpen(false)}
                />
            </div>
        </UpgradeGate>
    )
}
