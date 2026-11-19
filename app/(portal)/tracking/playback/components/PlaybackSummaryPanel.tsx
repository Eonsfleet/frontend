'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Droplets, Fuel, MapPin, ShieldAlert } from 'lucide-react'
import type { PlaybackEvent, PlaybackMovement, PlaybackStats, PlaybackStop } from '@/types'
import { computeFuelSummary, computeTimeBreakdown, formatMs, longestStop, summariseBehaviour } from '@/lib/playback/insights'
import { useAddress } from '../hooks/useAddress'
import { cn } from '@/lib/utils'

export interface PlaybackSummaryPanelProps {
  stats: PlaybackStats
  stops: PlaybackStop[]
  events: PlaybackEvent[]
  movements: PlaybackMovement[]
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3" title={hint}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h4>
      {children}
    </section>
  )
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'warn' }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs font-bold text-slate-700">
      <span>{label}</span>
      <span className={cn('text-slate-500', tone === 'warn' && 'text-amber-600')}>{value}</span>
    </div>
  )
}

const SEGMENTS = [
  { key: 'movingMs', label: 'Driving', color: 'bg-emerald-500' },
  { key: 'idleMs', label: 'Idling', color: 'bg-amber-400' },
  { key: 'stoppedMs', label: 'Parked', color: 'bg-slate-300' },
  { key: 'noDataMs', label: 'No data', color: 'bg-rose-300' },
] as const

function Place({ label, point, time }: { label: string; point: { lat: number; lng: number } | undefined; time?: string }) {
  const address = useAddress(point)
  return (
    <div className="flex items-start gap-2">
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase text-slate-400">{label}{time ? ` · ${time}` : ''}</p>
        <p className="text-[11px] font-semibold leading-snug text-slate-700">{address}</p>
      </div>
    </div>
  )
}

export function PlaybackSummaryPanel({ stats, stops, events, movements }: PlaybackSummaryPanelProps) {
  const breakdown = useMemo(() => computeTimeBreakdown(movements), [movements])
  const fuel = useMemo(() => computeFuelSummary(movements), [movements])
  const behaviour = useMemo(() => summariseBehaviour(events, movements, stats.distanceKm), [events, movements, stats.distanceKm])
  const longest = useMemo(() => longestStop(stops), [stops])
  const first = movements[0]
  const last = movements[movements.length - 1]
  const hasData = movements.length > 0
  const total = breakdown.totalMs || 1
  const fuelFmt = (n: number) => (fuel?.unit === 'L' ? `${n.toFixed(1)} L` : `${n.toFixed(0)}%`)
  const efficiency = fuel?.unit === 'L' && stats.distanceKm >= 1 && fuel.consumed > 0 ? (fuel.consumed / stats.distanceKm) * 100 : null

  return (
    <div className="shrink-0 space-y-5 p-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Distance" value={`${stats.distanceKm.toFixed(1)} km`} />
        <Stat label="Elapsed" value={formatMs(stats.durationMinutes * 60_000)} hint="First to last GPS point" />
        <Stat label="Driving" value={formatMs(breakdown.movingMs)} />
        <Stat label="Idling" value={formatMs(breakdown.idleMs)} hint="Engine on, not moving (needs ignition data)" />
        <Stat label="Avg speed" value={`${Math.round(stats.avgSpeed)} km/h`} />
        <Stat label="Max speed" value={`${Math.round(stats.maxSpeed)} km/h`} />
      </div>

      {hasData && (
        <Section title="Where the time went">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            {SEGMENTS.map((s) => (
              <div key={s.key} className={s.color} style={{ width: `${(breakdown[s.key] / total) * 100}%` }} title={`${s.label}: ${formatMs(breakdown[s.key])}`} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {SEGMENTS.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', s.color)} />{s.label}</span>
                <span className="text-slate-700">{formatMs(breakdown[s.key])}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasData && (
        <Section title="Journey">
          <div className="space-y-3 rounded-xl border border-slate-100 p-3">
            <Place label="Start" point={first} time={format(new Date(first.timestamp), 'hh:mm a')} />
            <Place label="End" point={last} time={format(new Date(last.timestamp), 'hh:mm a')} />
          </div>
          <div className="mt-2">
            <Row label="Stops" value={stops.length} />
            {longest && <Row label="Longest stop" value={formatMs(longest.durationMinutes * 60_000)} />}
          </div>
        </Section>
      )}

      <Section title="Driving behaviour">
        <div className="space-y-0.5">
          <Row label="Overspeed" value={behaviour.overspeed ? `${behaviour.overspeed} · ${formatMs(behaviour.overspeedMinutes * 60_000)}` : 'None'} tone={behaviour.overspeed ? 'warn' : undefined} />
          <Row label="Harsh braking" value={behaviour.harshBraking || 'None'} tone={behaviour.harshBraking ? 'warn' : undefined} />
          <Row label="Harsh acceleration" value={behaviour.harshAcceleration || 'None'} tone={behaviour.harshAcceleration ? 'warn' : undefined} />
          {(behaviour.geofenceEntries > 0 || behaviour.geofenceExits > 0) && (
            <Row label="Geofence in / out" value={`${behaviour.geofenceEntries} / ${behaviour.geofenceExits}`} />
          )}
          {behaviour.incidentsPer100Km != null && <Row label="Incidents / 100 km" value={behaviour.incidentsPer100Km.toFixed(1)} />}
        </div>
        {behaviour.overspeed + behaviour.harshBraking + behaviour.harshAcceleration === 0 && hasData && (
          <p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600"><ShieldAlert className="h-3 w-3" /> Clean run — no behaviour events.</p>
        )}
      </Section>

      {fuel && (
        <Section title="Fuel">
          <div className="space-y-0.5">
            <Row label="Start → End" value={`${fuelFmt(fuel.start)} → ${fuelFmt(fuel.end)}`} />
            <Row label="Used" value={fuelFmt(fuel.consumed)} />
            {efficiency != null && <Row label="Consumption" value={`${efficiency.toFixed(1)} L/100km`} />}
            {fuel.refuelCount > 0 && <Row label={`Refuelled (${fuel.refuelCount}×)`} value={<span className="flex items-center gap-1"><Fuel className="h-3 w-3" />{fuelFmt(fuel.refuelled)}</span>} />}
          </div>
          {fuel.suspectedDrains.length > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-2.5 text-[10px] font-bold text-rose-700">
              <Droplets className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {fuel.suspectedDrains.length} sudden drop{fuel.suspectedDrains.length > 1 ? 's' : ''} while stationary
                ({fuel.suspectedDrains.map((d) => `${fuelFmt(d.amount)} at ${format(new Date(d.timestamp), 'hh:mm a')}`).join(', ')}). Possible fuel loss.
              </span>
            </div>
          )}
        </Section>
      )}

      {breakdown.noDataMs > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-2.5 text-[10px] font-bold text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{formatMs(breakdown.noDataMs)} of this window has no GPS data, so distance may be understated.</span>
        </div>
      )}
    </div>
  )
}
