'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Loader2, Navigation, Users, BarChart3, Edit2, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getGeofences, deleteGeofence } from '@/lib/api/geofencing'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BulkAssignmentModal } from './BulkAssignmentModal'
import { BreachAnalytics } from './BreachAnalytics'
import { toast } from 'sonner'

interface GeofenceListProps {
    searchTerm?: string
}

export function GeofenceList({ searchTerm = '' }: GeofenceListProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [activeAssignment, setActiveAssignment] = useState<{ id: string; name: string } | null>(null)
    const [activeAnalytics, setActiveAnalytics] = useState<{ id: string; name: string } | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['geofences', { page, searchTerm }],
        queryFn: () => getGeofences({ page, per_page: 9, q: searchTerm || undefined }),
    })

    const geofences = data?.data?.geofences || []
    const pagination = data?.data?.pagination

    const { mutate: handleDelete, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => deleteGeofence(id),
        onSuccess: () => {
            toast.success('Geofence deleted successfully.')
            queryClient.invalidateQueries({ queryKey: ['geofences'] })
            setDeleteTarget(null)
        },
        onError: () => {
            toast.error('Failed to delete geofence.')
        },
    })

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
                            {searchTerm
                                ? `No geofences match "${searchTerm}". Try a different search.`
                                : 'Define virtual boundaries to monitor fleet compliance and automate security alerts.'}
                        </p>
                    </div>
                ) : (
                    geofences.map((item) => {
                        const vehicleCount = item.relationships?.vehicles?.data?.length ?? 0
                        return (
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
                                                <span className="text-sm font-black text-slate-700">{vehicleCount}</span>
                                            </div>
                                        </div>
                                        {item.attributes.type === 'circle' && item.attributes.radius != null && (
                                            <>
                                                <div className="h-8 w-[1px] bg-slate-100" />
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Radius</p>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <AlertCircle className="h-3 w-3 text-indigo-400" />
                                                        <span className="text-sm font-black text-slate-700">
                                                            {(item.attributes.radius / 1000).toFixed(1)} km
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-50/80 backdrop-blur-sm p-3 grid grid-cols-4 gap-2 border-t border-slate-50">
                                    <button
                                        onClick={() => setActiveAssignment({ id: item.id, name: item.attributes.name })}
                                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group/btn"
                                        title="Assign vehicles"
                                    >
                                        <Users className="h-4 w-4 text-slate-400 group-hover/btn:text-blue-600 mb-1" />
                                        <span className="text-[8px] font-black text-slate-400 group-hover/btn:text-slate-900 uppercase tracking-widest">ASSIGN</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveAnalytics({ id: item.id, name: item.attributes.name })}
                                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group/btn"
                                        title="View breach analytics"
                                    >
                                        <BarChart3 className="h-4 w-4 text-slate-400 group-hover/btn:text-indigo-600 mb-1" />
                                        <span className="text-[8px] font-black text-slate-400 group-hover/btn:text-slate-900 uppercase tracking-widest">INSIGHTS</span>
                                    </button>
                                    <button
                                        onClick={() => router.push(`/geofences/${item.id}/edit`)}
                                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group/btn"
                                        title="Edit geofence"
                                    >
                                        <Edit2 className="h-4 w-4 text-slate-400 group-hover/btn:text-slate-900 mb-1" />
                                        <span className="text-[8px] font-black text-slate-400 group-hover/btn:text-slate-900 uppercase tracking-widest">EDIT</span>
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget({ id: item.id, name: item.attributes.name })}
                                        className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group/btn"
                                        title="Delete geofence"
                                    >
                                        <Trash2 className="h-4 w-4 text-slate-400 group-hover/btn:text-rose-600 mb-1" />
                                        <span className="text-[8px] font-black text-slate-400 group-hover/btn:text-rose-600 uppercase tracking-widest">DELETE</span>
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Pagination */}
            {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Page {pagination.current} of {pagination.lastPage} &nbsp;·&nbsp; {pagination.total} zones
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={pagination.current <= 1}
                            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 transition-all"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.lastPage, p + 1))}
                            disabled={pagination.current >= pagination.lastPage}
                            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 transition-all"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <BulkAssignmentModal
                isOpen={!!activeAssignment}
                geofenceId={activeAssignment?.id}
                geofenceName={activeAssignment?.name || ''}
                onClose={() => setActiveAssignment(null)}
            />

            <BreachAnalytics
                isOpen={!!activeAnalytics}
                geofenceId={activeAnalytics?.id}
                geofenceName={activeAnalytics?.name || ''}
                onClose={() => setActiveAnalytics(null)}
            />

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-base font-black text-slate-900 uppercase italic">Delete Geofence</h3>
                            <p className="text-sm text-slate-500">
                                Are you sure you want to delete <span className="font-bold text-slate-700">{deleteTarget.name}</span>?
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteTarget.id)}
                                disabled={isDeleting}
                                className="flex-1 py-3 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
