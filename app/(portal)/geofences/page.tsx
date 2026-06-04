'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { GeofenceList } from '@/components/geofencing/GeofenceList'
import { GeofenceBuilder } from '../../../components/geofencing/GeofenceBuilder'
import { Plus, List, Map as MapIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGeofences } from '@/lib/api/geofencing'
import { getVehicles } from '@/lib/api/vehicles'
import { QueryError } from '@/components/shared/QueryError'
import { PAGE_SIZE_DROPDOWN } from '@/lib/config'
import { GeofenceFilters, GeofenceFilterState } from '@/components/geofencing/GeofenceFilters'

const GeofenceOverviewMap = dynamic(
    () => import('@/components/geofencing/GeofenceOverviewMap'),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        ),
    }
)

export default function GeofencesPage() {
    const [view, setView] = useState<'list' | 'map'>('list')
    const [isBuilderOpen, setIsBuilderOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [geofenceFilters, setGeofenceFilters] = useState<GeofenceFilterState>({})

    // Fetch all geofences for map view (no pagination needed — map shows all)
    const { data: allGeofencesData, isLoading: isLoadingMapData, isError: isMapError, refetch: refetchMap } = useQuery({
        queryKey: ['geofences-all'],
        queryFn: () => getGeofences({ per_page: PAGE_SIZE_DROPDOWN }),
        enabled: view === 'map',
    })

    const { data: vehiclesData } = useQuery({
        queryKey: ['vehicles-list-simple'],
        queryFn: () => getVehicles({ per_page: PAGE_SIZE_DROPDOWN }),
        enabled: view === 'map',
    })

    const allGeofences = allGeofencesData?.data?.geofences || []

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

                {/* Filters Row — only shown in list view */}
                {view === 'list' && (
                    <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                        <GeofenceFilters
                            filters={geofenceFilters}
                            onFiltersChange={setGeofenceFilters}
                        />
                        <div className="h-4 w-[1px] bg-slate-200" />
                        <input
                            type="text"
                            placeholder="SEARCH GEOFENCES..."
                            className="bg-transparent border-none focus:ring-0 text-[10px] font-bold uppercase tracking-widest text-slate-600 placeholder:text-slate-300 flex-1"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                {view === 'list' ? (
                    <GeofenceList searchTerm={searchTerm} statusFilter={geofenceFilters.status} />
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden h-[600px] shadow-sm relative">
                        {isLoadingMapData ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : isMapError ? (
                            <div className="h-full flex items-center justify-center p-6">
                                <QueryError message="Failed to load geofences." onRetry={refetchMap} />
                            </div>
                        ) : allGeofences.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <MapIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Geofences to Display</p>
                                <p className="text-[10px] text-slate-300 font-medium mt-2">Create geofences to see them on the map.</p>
                            </div>
                        ) : (
                            <GeofenceOverviewMap 
                                geofences={allGeofences} 
                                vehicles={vehiclesData?.data}
                            />
                        )}
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
