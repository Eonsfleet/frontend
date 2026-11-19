'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { DateRange } from 'react-day-picker'
import { differenceInCalendarDays, endOfDay, format, isSameDay, startOfDay, subDays } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, FileDown, Loader2, Play, RefreshCw, Route as RouteIcon, Timer, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, extractApiError } from '@/lib/utils'
import * as vehicleApi from '@/lib/api/vehicles'
import { getVehicleRouteHistory, ROUTE_HISTORY_MAX_WINDOW_DAYS, type RouteHistorySegment } from '@/lib/api/tracking'
import { describePlace, formatDuration } from '../components/RouteHistoryPanel'
import { HistoryMap, SEGMENT_COLORS } from './components/HistoryMap'

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'
const PRESETS: { key: Exclude<Preset, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
]

function resolve(preset: Preset, custom: DateRange | undefined, now = new Date()) {
  if (preset === 'today') return { start: startOfDay(now), end: endOfDay(now) }
  if (preset === 'yesterday') return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }
  if (preset === '7d') return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
  if (preset === '30d') return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
  if (!custom?.from) return null
  return { start: startOfDay(custom.from), end: endOfDay(custom.to ?? custom.from) }
}

function exportSegments(segments: RouteHistorySegment[], plate: string) {
  const rows = ['journey_start,journey_end,timestamp,latitude,longitude,speed_kmh']
  segments.forEach((s) => s.path.forEach((p) => rows.push([s.started_at, s.ended_at, p.timestamp, p.latitude, p.longitude, p.speed ?? ''].join(','))))
  if (rows.length === 1) return toast.info('No path data to export.')
  const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `route-history-${plate}-${format(new Date(), 'yyyy-MM-dd')}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function Kpi({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-4 w-4" /></span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-base font-black text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function DailyBars({ segments }: { segments: RouteHistorySegment[] }) {
  const days = useMemo(() => {
    const m = new Map<string, number>()
    segments.forEach((s) => {
      const k = format(new Date(s.started_at), 'yyyy-MM-dd')
      m.set(k, (m.get(k) ?? 0) + s.distance_km)
    })
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [segments])
  if (days.length < 2) return null
  const max = Math.max(...days.map(([, v]) => v), 1)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Distance per day</p>
      <div className="flex h-16 items-end gap-1">
        {days.map(([d, km]) => (
          <div key={d} className="group relative flex-1" title={`${format(new Date(d), 'EEE, MMM d')}: ${km.toFixed(1)} km`}>
            <div className="w-full rounded-t bg-blue-500/80 group-hover:bg-blue-600" style={{ height: `${Math.max((km / max) * 100, 4)}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function JourneyCard({
  segment, color, isSelected, showDate, vehicleId, onSelect,
}: { segment: RouteHistorySegment; color: string; isSelected: boolean; showDate: boolean; vehicleId: string; onSelect: () => void }) {
  const start = new Date(segment.started_at)
  const end = new Date(segment.ended_at)
  const replay = `/tracking/playback?vehicleId=${vehicleId}&start=${encodeURIComponent(segment.started_at)}&end=${encodeURIComponent(segment.ended_at)}`
  return (
    <div
      className={cn('rounded-xl border bg-white p-3 transition-colors', isSelected ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300')}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left" aria-pressed={isSelected}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="text-xs font-black text-slate-900">
            {showDate && `${format(start, 'MMM d')} · `}{format(start, 'hh:mm a')} – {format(end, 'hh:mm a')}
          </span>
          <span className="ml-auto text-[11px] font-black text-slate-700">{segment.distance_km} km</span>
        </div>
        <div className="mt-2 space-y-1.5 border-l-2 border-slate-100 pl-3 text-[11px] font-semibold text-slate-600">
          <p className="truncate"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />{describePlace(segment.start)}</p>
          <p className="truncate"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-500" />{describePlace(segment.end)}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500">
          <Chip>{formatDuration(segment.duration_seconds)} total</Chip>
          {segment.idle_seconds > 0 && <Chip>{formatDuration(segment.idle_seconds)} idle</Chip>}
          <Chip>{segment.stops} {segment.stops === 1 ? 'stop' : 'stops'}</Chip>
          <Chip>max {Math.round(segment.max_speed)} km/h</Chip>
          <Chip>avg {Math.round(segment.avg_speed)} km/h</Chip>
        </div>
      </button>

      {isSelected && segment.stop_points.length > 0 && (
        <ol className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {segment.stop_points.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{describePlace(s)}</span>
              <span className="shrink-0 font-bold text-slate-400">{formatDuration(s.duration_seconds)}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
        <Link href={replay} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700">
          <Play className="h-3 w-3" /> Replay
        </Link>
        <button
          type="button"
          onClick={() => exportSegments([segment], vehicleId)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
        >
          <FileDown className="h-3 w-3" /> CSV
        </button>
      </div>
    </div>
  )
}

const Chip = ({ children }: { children: React.ReactNode }) => <span className="rounded-md bg-slate-100 px-1.5 py-0.5">{children}</span>

export default function RouteHistoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vehicleId, setVehicleId] = useState<string | null>(searchParams.get('vehicleId'))
  const [preset, setPreset] = useState<Preset>('today')
  const [custom, setCustom] = useState<DateRange | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard')

  const { data: vehiclesData } = useQuery({ queryKey: ['history-vehicles'], queryFn: () => vehicleApi.getVehicles({ per_page: 200 }) })
  const vehicles = useMemo(() => vehiclesData?.data ?? [], [vehiclesData])
  const vehicle = vehicles.find((v) => String(v.id) === vehicleId || v.attributes.uuid === vehicleId) ?? null
  const apiVehicleId = vehicle ? String(vehicle.id) : vehicleId
  const plate = vehicle?.attributes.registration_number ?? 'vehicle'

  const range = useMemo(() => resolve(preset, custom), [preset, custom])
  const spanDays = range ? differenceInCalendarDays(range.end, range.start) + 1 : 0
  const tooWide = spanDays > ROUTE_HISTORY_MAX_WINDOW_DAYS

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['route-history-page', apiVehicleId, range?.start.toISOString(), range?.end.toISOString()],
    queryFn: () => getVehicleRouteHistory(apiVehicleId!, range!.start.toISOString(), range!.end.toISOString()),
    enabled: !!apiVehicleId && !!range && !tooWide,
    staleTime: 60_000,
  })

  const segments = useMemo(() => [...(data?.data ?? [])].sort((a, b) => a.started_at.localeCompare(b.started_at)), [data])
  const summary = data?.meta?.summary
  const multiDay = !!range && !isSameDay(range.start, range.end)
  const rangeLabel = range ? (multiDay ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}` : format(range.start, 'EEE, MMM d, yyyy')) : 'Pick dates'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="flex items-center gap-2 font-black tracking-tight text-slate-900"><RouteIcon className="h-5 w-5 text-blue-600" /> Route History</h1>
        <Link href="/tracking" className="ml-auto text-xs font-bold text-blue-600 hover:underline">Live tracking</Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="w-60">
          <Select value={vehicleId ?? undefined} onValueChange={(v) => { setVehicleId(v); setSelectedId(null) }}>
            <SelectTrigger className="h-9 text-xs font-bold"><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>{v.attributes.registration_number}{v.attributes.make ? ` · ${v.attributes.make} ${v.attributes.model ?? ''}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.key} aria-pressed={preset === p.key} onClick={() => { setPreset(p.key); setSelectedId(null) }}
              className={cn('rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors', preset === p.key ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {p.label}
            </button>
          ))}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold', preset === 'custom' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                {preset === 'custom' ? rangeLabel : 'Custom'} <CalendarIcon className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={custom} disabled={{ after: new Date() }}
                onSelect={(next) => { setCustom(next); setPreset('custom'); setSelectedId(null); if (next?.from && next?.to) setCalendarOpen(false) }} />
            </PopoverContent>
          </Popover>
        </div>

        <span className="text-xs font-semibold text-slate-400">{rangeLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => refetch()} disabled={!apiVehicleId || !range || tooWide} aria-label="Refresh" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-40">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
          <button onClick={() => exportSegments(segments, plate)} disabled={segments.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            <FileDown className="h-3.5 w-3.5" /> Export all
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-3 md:grid-cols-4">
        <Kpi icon={RouteIcon} label="Journeys" value={summary ? String(summary.trips) : '—'} />
        <Kpi icon={TrendingUp} label="Distance" value={summary ? `${summary.distance_km.toLocaleString()} km` : '—'} />
        <Kpi icon={Timer} label="Drive / idle" value={summary ? `${formatDuration(summary.duration_seconds - summary.idle_seconds)} / ${formatDuration(summary.idle_seconds)}` : '—'} />
        <Kpi icon={TrendingUp} label="Top speed" value={summary ? `${Math.round(summary.max_speed)} km/h` : '—'} />
      </div>

      <div className="flex min-h-0 flex-1 gap-3 p-4">
        <aside className="flex w-[26rem] shrink-0 flex-col gap-3 overflow-y-auto pr-1">
          {!vehicleId ? (
            <Empty title="Choose a vehicle" detail="Pick a vehicle above to see where it has been." />
          ) : tooWide ? (
            <Empty title="Pick a shorter range" detail={`Up to ${ROUTE_HISTORY_MAX_WINDOW_DAYS} days at a time. This one spans ${spanDays}.`} />
          ) : !range ? (
            <Empty title="Choose dates" detail="Pick a day or a range." />
          ) : isLoading ? (
            <div className="flex justify-center py-16 text-slate-300"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : isError ? (
            <Empty title="Could not load route history" detail={extractApiError(error, 'Something went wrong fetching journeys.')} />
          ) : segments.length === 0 ? (
            <Empty title="No journeys recorded" detail={`${plate} did not move during ${rangeLabel}.`} />
          ) : (
            <>
              <DailyBars segments={segments} />
              {segments.map((s, i) => (
                <JourneyCard key={s.id} segment={s} color={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} isSelected={selectedId === s.id}
                  showDate={multiDay} vehicleId={apiVehicleId!} onSelect={() => setSelectedId((cur) => (cur === s.id ? null : s.id))} />
              ))}
            </>
          )}
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <HistoryMap segments={segments} selectedId={selectedId} onSelect={setSelectedId} mapStyle={mapStyle} onToggleStyle={() => setMapStyle((s) => (s === 'standard' ? 'satellite' : 'standard'))} />
        </div>
      </div>
    </div>
  )
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <RouteIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </div>
  )
}
