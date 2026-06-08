'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
    AlertTriangle,
    Car,
    Calendar,
    Clock,
    MapPin,
    Navigation,
    ShieldCheck,
    Users,
    AlertCircle,
    TrendingDown,
    Activity,
} from 'lucide-react'
import {
    getGeofenceById,
    getGeofenceVehicles,
    getGeofenceAlerts,
    getGeofenceAnalytics,
} from '@/lib/api/geofencing'

// ── Helpers ───────────────────────────────────────────────────────────────────

function MetaLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn('text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5', className)}>
            {children}
        </p>
    )
}

function safeDate(d: string | null | undefined, fmt = 'dd MMM yyyy'): string {
    if (!d) return '—'
    const parsed = new Date(d)
    return isNaN(parsed.getTime()) ? d : format(parsed, fmt)
}

const TRIGGER_STYLES: Record<string, { badge: string; label: string; text: string }> = {
    entry:  { badge: 'bg-blue-50 text-blue-600',     label: 'Entry',       text: 'text-blue-600'   },
    enter:  { badge: 'bg-blue-50 text-blue-600',     label: 'Entry',       text: 'text-blue-600'   },
    exit:   { badge: 'bg-amber-50 text-amber-600',   label: 'Exit',        text: 'text-amber-600'  },
    both:   { badge: 'bg-indigo-50 text-indigo-600', label: 'Entry + Exit', text: 'text-indigo-600' },
}

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // 1-indexed (memory: days:[1-7])

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
    geofenceId: string | null
    onClose: () => void
}

export function GeofenceDrawer({ geofenceId, onClose }: Props) {
    // ── Queries ──────────────────────────────────────────────────────────────
    const { data: detailData, isLoading, isError } = useQuery({
        queryKey: ['geofence-detail', geofenceId],
        queryFn: () => getGeofenceById(geofenceId!),
        enabled: !!geofenceId,
    })

    const { data: vehiclesData, isLoading: isVehiclesLoading } = useQuery({
        queryKey: ['geofence-vehicles', geofenceId],
        queryFn: () => getGeofenceVehicles(geofenceId!),
        enabled: !!geofenceId,
    })

    const { data: alertsData, isLoading: isAlertsLoading } = useQuery({
        queryKey: ['geofence-alerts-drawer', geofenceId],
        queryFn: () => getGeofenceAlerts(geofenceId!, { per_page: 30 }),
        enabled: !!geofenceId,
    })

    const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
        queryKey: ['geofence-analytics', geofenceId],
        queryFn: () => getGeofenceAnalytics(geofenceId!, {
            days: 30,
            include_timeline: true,
            include_ranking: true,
        }),
        enabled: !!geofenceId,
    })

    // ── Derived state ────────────────────────────────────────────────────────
    const geofence = detailData?.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = geofence?.attributes as any
    const isActive: boolean = attrs?.is_active ?? attrs?.status ?? false
    const triggerType: string = attrs?.trigger_type ?? 'both'
    const triggerStyle = TRIGGER_STYLES[triggerType] ?? TRIGGER_STYLES.both

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicles: any[] = (vehiclesData as any)?.data ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alertsRaw: any = alertsData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alerts: any[] =
        alertsRaw?.data?.alerts ??
        alertsRaw?.data?.data ??
        (Array.isArray(alertsRaw?.data) ? alertsRaw.data : [])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analytics: any = (analyticsData as any)?.data ?? analyticsData
    const summary = analytics?.summary

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <Sheet open={!!geofenceId} onOpenChange={(open) => { if (!open) onClose() }}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[1180px] xl:max-w-[1280px] p-0 flex flex-col gap-0 overflow-hidden"
            >
                {/* ── Header ── */}
                <SheetHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
                    <SheetTitle
                        className={cn(
                            'text-lg font-black uppercase tracking-tight text-slate-900 leading-tight',
                            isLoading && 'sr-only',
                        )}
                    >
                        {isLoading
                            ? 'Zone Detail'
                            : isError
                            ? 'Failed to load zone'
                            : attrs?.name ?? 'Zone Detail'}
                    </SheetTitle>

                    {isLoading ? (
                        <div className="space-y-2 pt-1">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ) : geofence ? (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest',
                                isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400',
                            )}>
                                {isActive ? 'Monitoring Active' : 'Inactive'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                                {attrs?.type}
                            </span>
                            <span className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest',
                                triggerStyle.badge,
                            )}>
                                Alert: {triggerStyle.label}
                            </span>
                            {attrs?.category && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-600">
                                    {attrs.category}
                                </span>
                            )}
                        </div>
                    ) : null}
                </SheetHeader>

                {/* ── Body ── */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 rounded-xl" />
                            ))}
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-rose-500">
                            <AlertTriangle className="h-8 w-8" />
                            <p className="text-sm font-bold">Could not load zone details.</p>
                        </div>
                    ) : geofence ? (
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 bg-white">

                            {/* ── LEFT PANEL — Alert History + Vehicles ── */}
                            <section className="w-full lg:w-[420px] xl:w-[460px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col min-h-[360px] lg:min-h-0 bg-slate-50/40">
                                <Tabs defaultValue="alerts" className="flex-1 flex flex-col min-h-0">
                                    <TabsList className="shrink-0 w-full justify-start rounded-none border-b border-slate-100 bg-white px-5 h-11 gap-0">
                                        <TabsTrigger
                                            value="alerts"
                                            className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3"
                                        >
                                            Alert History
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="vehicles"
                                            className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3"
                                        >
                                            Vehicles ({vehicles.length})
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Alerts tab */}
                                    <TabsContent value="alerts" className="flex-1 overflow-hidden m-0 min-h-0">
                                        <ScrollArea className="h-full">
                                            {isAlertsLoading ? (
                                                <div className="p-5 space-y-2">
                                                    {Array.from({ length: 4 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-14 rounded-xl" />
                                                    ))}
                                                </div>
                                            ) : alerts.length === 0 ? (
                                                <div className="py-14 text-center">
                                                    <AlertCircle className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No alerts yet</p>
                                                    <p className="text-[9px] text-slate-300 font-medium mt-1">
                                                        Alerts will appear when vehicles breach this zone
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="p-4 space-y-2">
                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                    {alerts.map((alert: any, i: number) => {
                                                        const isEntry = alert.event_type === 'enter' || alert.event_type === 'entry'
                                                        return (
                                                            <div key={alert.id ?? i} className="p-3 rounded-2xl border border-slate-100 bg-white flex items-start gap-3 hover:border-blue-100 transition-all">
                                                                <div className={cn(
                                                                    'h-8 w-8 rounded-full shrink-0 flex items-center justify-center mt-0.5',
                                                                    isEntry ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500',
                                                                )}>
                                                                    <Navigation className="h-3.5 w-3.5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className={cn(
                                                                            'text-[9px] font-black uppercase tracking-widest',
                                                                            isEntry ? 'text-blue-600' : 'text-amber-600',
                                                                        )}>
                                                                            {isEntry ? 'Zone Entry' : 'Zone Exit'}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-300 font-medium shrink-0">
                                                                            {alert.timestamp
                                                                                ? safeDate(alert.timestamp, 'dd MMM, HH:mm')
                                                                                : '—'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                                                                        {alert.vehicle?.registration_number
                                                                            ?? alert.registration_number
                                                                            ?? `Vehicle #${alert.vehicle_id ?? '—'}`}
                                                                    </p>
                                                                    {alert.latitude && alert.longitude && (
                                                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                                            {Number(alert.latitude).toFixed(4)}, {Number(alert.longitude).toFixed(4)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </TabsContent>

                                    {/* Vehicles tab */}
                                    <TabsContent value="vehicles" className="flex-1 overflow-hidden m-0 min-h-0">
                                        <ScrollArea className="h-full">
                                            {isVehiclesLoading ? (
                                                <div className="p-5 space-y-2">
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-16 rounded-xl" />
                                                    ))}
                                                </div>
                                            ) : vehicles.length === 0 ? (
                                                <div className="py-14 text-center">
                                                    <Car className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No vehicles assigned</p>
                                                    <p className="text-[9px] text-slate-300 font-medium mt-1">
                                                        Use the Assign button to link vehicles
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="p-4 space-y-2">
                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                    {vehicles.map((v: any, i: number) => {
                                                        const reg = v.attributes?.registration_number ?? v.registration_number ?? v.display_number ?? `#${v.id}`
                                                        const make = v.attributes?.make ?? v.make
                                                        const model = v.attributes?.model ?? v.model
                                                        const status = v.attributes?.status ?? v.status
                                                        const loc = v.attributes?.current_location ?? v.current_location
                                                        return (
                                                            <div key={v.id ?? i} className="p-3 rounded-2xl border border-slate-100 bg-white flex items-start gap-3 hover:border-blue-100 transition-all">
                                                                <div className="h-9 w-9 rounded-full bg-slate-50 shrink-0 flex items-center justify-center">
                                                                    <Car className="h-4 w-4 text-slate-400" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-black text-slate-900 uppercase italic truncate">{reg}</p>
                                                                    {(make || model) && (
                                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                            {make} {model ?? ''}
                                                                        </p>
                                                                    )}
                                                                    {loc && (
                                                                        <p className="text-[9px] text-slate-300 font-mono mt-0.5 truncate">
                                                                            {loc.address ?? `${loc.latitude}, ${loc.longitude}`}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {status && (
                                                                    <span className={cn(
                                                                        'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0',
                                                                        status === 'active'
                                                                            ? 'bg-emerald-50 text-emerald-600'
                                                                            : 'bg-slate-100 text-slate-400',
                                                                    )}>
                                                                        {status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </TabsContent>
                                </Tabs>
                            </section>

                            {/* ── MIDDLE + RIGHT ── */}
                            <div className="flex flex-1 min-h-0 overflow-hidden">

                                {/* Middle panel — zone details */}
                                <ScrollArea className="flex-1 min-w-0">
                                    <div className="px-6 py-5 space-y-6">

                                        {/* Zone name + location */}
                                        <div>
                                            <MetaLabel>Zone Name</MetaLabel>
                                            <p className="text-lg font-black uppercase tracking-tight text-slate-900 leading-tight">
                                                {attrs?.name}
                                            </p>
                                            {attrs?.location && (
                                                <p className="text-xs text-slate-400 font-medium mt-1.5 flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    {attrs.location}
                                                </p>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {attrs?.description && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>Description</MetaLabel>
                                                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                                        {attrs.description}
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        <Separator className="border-slate-100" />

                                        {/* Configuration grid */}
                                        <div>
                                            <MetaLabel>
                                                <span className="inline-flex items-center gap-1">
                                                    <Activity className="h-2.5 w-2.5" /> Zone Configuration
                                                </span>
                                            </MetaLabel>
                                            <div className="mt-2 grid grid-cols-2 gap-3">
                                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                    <MetaLabel>Type</MetaLabel>
                                                    <p className="text-sm font-black text-slate-900 uppercase">{attrs?.type ?? '—'}</p>
                                                </div>

                                                {attrs?.type === 'circle' && attrs?.radius != null && (
                                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                        <MetaLabel>Radius</MetaLabel>
                                                        <p className="text-sm font-black text-slate-900">
                                                            {attrs.radius >= 1000
                                                                ? `${(attrs.radius / 1000).toFixed(1)} km`
                                                                : `${attrs.radius} m`}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                    <MetaLabel>Alert Trigger</MetaLabel>
                                                    <p className={cn('text-sm font-black uppercase', triggerStyle.text)}>
                                                        {triggerStyle.label}
                                                    </p>
                                                </div>

                                                {(attrs?.speed_limit_kmh || attrs?.speed) ? (
                                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                        <MetaLabel>Speed Limit</MetaLabel>
                                                        <p className="text-sm font-black text-slate-900">
                                                            {attrs.speed_limit_kmh ?? attrs.speed} km/h
                                                        </p>
                                                    </div>
                                                ) : null}

                                                {attrs?.max_dwell_minutes != null && (
                                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                        <MetaLabel>Max Dwell</MetaLabel>
                                                        <p className="text-sm font-black text-slate-900">
                                                            {attrs.max_dwell_minutes} min
                                                        </p>
                                                    </div>
                                                )}

                                                {attrs?.category && (
                                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                        <MetaLabel>Category</MetaLabel>
                                                        <p className="text-sm font-black text-slate-900 uppercase">{attrs.category}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Active hours */}
                                        {attrs?.active_hours && (attrs.active_hours.start || attrs.active_hours.start_time) && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock className="h-2.5 w-2.5" /> Active Hours
                                                        </span>
                                                    </MetaLabel>
                                                    <div className="mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                                                        <p className="text-xs font-bold text-slate-700">
                                                            {attrs.active_hours.start ?? attrs.active_hours.start_time}
                                                            {' '}–{' '}
                                                            {attrs.active_hours.end ?? attrs.active_hours.end_time ?? '—'}
                                                        </p>
                                                        {attrs.active_hours.days?.length > 0 && (
                                                            <div className="flex gap-1 flex-wrap">
                                                                {DAY_LABELS.slice(1).map((day, idx) => (
                                                                    <span
                                                                        key={day}
                                                                        className={cn(
                                                                            'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded',
                                                                            attrs.active_hours.days.includes(idx + 1)
                                                                                ? 'bg-blue-100 text-blue-700'
                                                                                : 'bg-slate-100 text-slate-300',
                                                                        )}
                                                                    >
                                                                        {day}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Tags */}
                                        {attrs?.tags?.length > 0 && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>Tags</MetaLabel>
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                        {attrs.tags.map((tag: any, i: number) => (
                                                            <span
                                                                key={i}
                                                                className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[9px] font-black uppercase tracking-widest text-indigo-600"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Top offending vehicles */}
                                        {analytics?.vehicle_ranking?.length > 0 && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>
                                                        <span className="inline-flex items-center gap-1">
                                                            <TrendingDown className="h-2.5 w-2.5 text-rose-400" /> Top Offending Vehicles
                                                        </span>
                                                    </MetaLabel>
                                                    <div className="mt-2 space-y-2">
                                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                        {analytics.vehicle_ranking.slice(0, 5).map((v: any, i: number) => (
                                                            <div
                                                                key={v.registration ?? i}
                                                                className="p-3 rounded-2xl border border-slate-100 bg-white flex items-center justify-between hover:border-rose-100 transition-all"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400">
                                                                        <TrendingDown className="h-4 w-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-slate-900 uppercase italic">{v.registration}</p>
                                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                                            Last: {v.last_breach ? safeDate(v.last_breach, 'dd MMM, HH:mm') : 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-sm font-black text-rose-600">{v.breach_count}</div>
                                                                    <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Breaches</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </ScrollArea>

                                {/* Separator */}
                                <Separator orientation="vertical" className="border-slate-100 shrink-0" />

                                {/* RIGHT PANE — metadata sidebar */}
                                <ScrollArea className="w-56 shrink-0 bg-slate-50/50">
                                    <div className="px-4 py-5 space-y-5">

                                        {/* Status */}
                                        <div>
                                            <MetaLabel>Status</MetaLabel>
                                            <span className={cn(
                                                'inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-0.5',
                                                isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400',
                                            )}>
                                                {isActive ? 'Monitoring Active' : 'Inactive'}
                                            </span>
                                        </div>

                                        {attrs?.category && (
                                            <div>
                                                <MetaLabel>Category</MetaLabel>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-0.5 bg-purple-50 text-purple-600">
                                                    {attrs.category}
                                                </span>
                                            </div>
                                        )}

                                        <Separator className="border-slate-100" />

                                        {/* Dates */}
                                        <div className="space-y-3">
                                            <MetaLabel>
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar className="h-2.5 w-2.5" /> Dates
                                                </span>
                                            </MetaLabel>
                                            <div>
                                                <MetaLabel>Created</MetaLabel>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {safeDate(attrs?.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <Separator className="border-slate-100" />

                                        {/* Zone stats */}
                                        <div className="space-y-3">
                                            <MetaLabel>
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="h-2.5 w-2.5" /> Zone Stats
                                                </span>
                                            </MetaLabel>
                                            <div>
                                                <MetaLabel>Linked Assets</MetaLabel>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <Separator className="border-slate-100" />

                                        {/* Breach intelligence KPIs */}
                                        <div className="space-y-3">
                                            <MetaLabel>
                                                <span className="inline-flex items-center gap-1">
                                                    <ShieldCheck className="h-2.5 w-2.5" /> Breach Intel (30d)
                                                </span>
                                            </MetaLabel>

                                            {isAnalyticsLoading ? (
                                                <div className="space-y-2">
                                                    <Skeleton className="h-14 rounded-xl" />
                                                    <Skeleton className="h-14 rounded-xl" />
                                                    <Skeleton className="h-14 rounded-xl" />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                                                        <MetaLabel>Total Breaches</MetaLabel>
                                                        <p className="text-xl font-black text-slate-900 italic">
                                                            {summary?.total_breaches ?? '—'}
                                                        </p>
                                                        {summary?.breach_rate_per_day != null && (
                                                            <p className="text-[9px] text-rose-500 font-bold uppercase mt-0.5">
                                                                {summary.breach_rate_per_day.toFixed(1)}/day avg
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                                                        <MetaLabel>Avg Dwell</MetaLabel>
                                                        <p className="text-xl font-black text-slate-900 italic">
                                                            {summary?.average_dwell_time_minutes != null
                                                                ? `${summary.average_dwell_time_minutes}m`
                                                                : '—'}
                                                        </p>
                                                        <p className="text-[9px] text-blue-500 font-bold uppercase mt-0.5">Per breach</p>
                                                    </div>

                                                    {summary?.peak_breach_time && (
                                                        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                                                            <MetaLabel>Peak Time</MetaLabel>
                                                            <p className="text-sm font-black text-slate-900 italic leading-tight">
                                                                {summary.peak_breach_time}
                                                            </p>
                                                            <p className="text-[9px] text-emerald-500 font-bold uppercase mt-0.5">
                                                                Highest activity
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>

                        </div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}
