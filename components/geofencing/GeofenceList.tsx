'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Loader2, MapPin, Eye, Edit2, Trash2, Users, BarChart3, Navigation, AlertCircle } from 'lucide-react'
import { getGeofences } from '@/lib/api/geofencing'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BulkAssignmentModal } from './BulkAssignmentModal'
import { BreachAnalytics } from './BreachAnalytics'

export function GeofenceList() {
    const [page, setPage] = useState(1)
    const [activeAssignment, setActiveAssignment] = useState<string | null>(null)
    const [activeAnalytics, setActiveAnalytics] = useState<string | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['geofences', { page }],
        queryFn: () => getGeofences({ page, per_page: 10 }),
    })

    const geofences = data?.data?.geofences || []

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-48 w-full bg-white rounded-3xl animate-pulse border border-slate-100" />
                    ))
                ) : geofences.length === 0 ? (
                    <div className="col-span-full py-20 bg-white rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Navigation className="h-10 w-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic">No Active Zones</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-xs leading-relaxed">
                            Definitive virtual boundaries help monitor fleet compliance and automate security alerts.
                        </p>
                    </div>
                ) : (
                    geofences.map((item) => (
                        <div key={item.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group overflow-hidden flex flex-col">
                            <div className="p-6 flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Navigation className="h-6 w-6" />
                                    </div>
                                    <Badge className={cn(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-none shadow-sm",
                                        item.attributes.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {item.attributes.is_active ? 'MONITORING ACTIVE' : 'INACTIVE'}
                                    </Badge>
                                </div>

                                <h3 className="text-lg font-black text-slate-900 uppercase italic leading-tight mb-2 truncate group-hover:text-blue-600 transition-colors">
                                    {item.attributes.name}
                                </h3>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <div className="px-2 py-0.5 rounded bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-100">
                                        {item.attributes.type}
                                    </div>
                                    <div className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100">
                                        ALERT: {item.attributes.alert_type}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 mt-6">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Linked Assets</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Users className="h-3 w-3 text-blue-500" />
                                            <span className="text-sm font-black text-slate-700">12</span>
                                        </div>
                                    </div>
                                    <div className="h-8 w-[1px] bg-slate-100" />
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last Breach</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <AlertCircle className="h-3 w-3 text-rose-500" />
                                            <span className="text-sm font-black text-slate-700">2h ago</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/80 backdrop-blur-sm p-3 grid grid-cols-3 gap-2 border-t border-slate-50">
                                <button
                                    onClick={() => setActiveAssignment(item.attributes.name)}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group/btn"
                                >
                                    <Users className="h-4 w-4 text-slate-400 group-hover/btn:text-blue-600 mb-1" />
                                    <span className="text-[8px] font-black text-slate-400 group-hover/btn:text-slate-900 uppercase tracking-widest">ASSIGN</span>
                                </button>
                                <button
                                    onClick={() => setActiveAnalytics(item.attributes.name)}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group/btn"
                                >
                                    <BarChart3 className="h-4 w-4 text-slate-400 group-hover/btn:text-indigo-600 mb-1" />
                                    <span className="text-[8px] font-black text-slate-400 group-hover/btn:text-slate-900 uppercase tracking-widest">INSIGHTS</span>
                                </button>
                                <button className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group/btn">
                                    <Edit2 className="h-4 w-4 text-slate-400 group-hover/btn:text-slate-900 mb-1" />
                                    <span className="text-[8px] font-black text-slate-400 group-hover/btn:text-slate-900 uppercase tracking-widest">EDIT</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <BulkAssignmentModal
                isOpen={!!activeAssignment}
                geofenceName={activeAssignment || ''}
                onClose={() => setActiveAssignment(null)}
            />

            <BreachAnalytics
                isOpen={!!activeAnalytics}
                geofenceName={activeAnalytics || ''}
                onClose={() => setActiveAnalytics(null)}
            />
        </div>
    )
}
