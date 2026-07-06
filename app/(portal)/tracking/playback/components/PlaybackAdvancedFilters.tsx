'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PlaybackEventType } from '@/types'
import type { DrivingBehaviourThresholds } from '@/lib/playback/derive'

export interface PlaybackAdvancedFiltersProps {
  vehicleStatusFilters: Record<'moving' | 'parked' | 'idle' | 'offline', boolean>
  onVehicleStatusChange: (key: 'moving' | 'parked' | 'idle' | 'offline', value: boolean) => void
  routes: { id: string; label: string }[]
  selectedRouteId: string | null
  onRouteChange: (id: string | null) => void
  geofences: { id: string; label: string }[]
  selectedGeofenceId: string | null
  onGeofenceChange: (id: string | null) => void
  radiusKm: number
  onRadiusChange: (value: number) => void
  eventFilters: Record<PlaybackEventType, boolean>
  onEventFilterChange: (key: PlaybackEventType, value: boolean) => void
  thresholds: DrivingBehaviourThresholds
  onThresholdsChange: (thresholds: DrivingBehaviourThresholds) => void
  onApply: () => void
  onReset: () => void
}

const SECTION_TITLE = 'text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2'
const CHECKBOX_ROW = 'flex items-center gap-2 text-xs font-bold text-slate-700'
const NUMBER_INPUT = 'w-full bg-white border border-slate-200 rounded-lg h-8 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500'

const VEHICLE_STATUS_OPTIONS: { key: 'moving' | 'parked' | 'idle' | 'offline'; label: string }[] = [
  { key: 'moving', label: 'Moving' },
  { key: 'parked', label: 'Parked' },
  { key: 'idle', label: 'Idle' },
  { key: 'offline', label: 'Offline' },
]

const EVENT_OPTIONS: { key: PlaybackEventType; label: string }[] = [
  { key: 'overspeed', label: 'Overspeed' },
  { key: 'harsh_braking', label: 'Harsh Braking' },
  { key: 'harsh_acceleration', label: 'Harsh Acceleration' },
  { key: 'geofence_enter', label: 'Geofence Enter' },
  { key: 'geofence_exit', label: 'Geofence Exit' },
]

export function PlaybackAdvancedFilters({
  vehicleStatusFilters,
  onVehicleStatusChange,
  routes,
  selectedRouteId,
  onRouteChange,
  geofences,
  selectedGeofenceId,
  onGeofenceChange,
  radiusKm,
  onRadiusChange,
  eventFilters,
  onEventFilterChange,
  thresholds,
  onThresholdsChange,
  onApply,
  onReset,
}: PlaybackAdvancedFiltersProps) {
  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      <section>
        <h4 className={SECTION_TITLE}>Vehicle Status</h4>
        <div className="grid grid-cols-2 gap-2">
          {VEHICLE_STATUS_OPTIONS.map((opt) => (
            <label key={opt.key} className={CHECKBOX_ROW}>
              <input
                type="checkbox"
                checked={vehicleStatusFilters[opt.key]}
                onChange={(e) => onVehicleStatusChange(opt.key, e.target.checked)}
                aria-label={opt.label}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h4 className={SECTION_TITLE}>Route & Location</h4>
        <div className="space-y-2">
          <Select value={selectedRouteId ?? 'none'} onValueChange={(v) => onRouteChange(v === 'none' ? null : v)}>
            <SelectTrigger aria-label="Route" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="Select Route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select Route</SelectItem>
              {routes.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedGeofenceId ?? 'none'} onValueChange={(v) => onGeofenceChange(v === 'none' ? null : v)}>
            <SelectTrigger aria-label="Geofence" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="Select Geofence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select Geofence</SelectItem>
              {geofences.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <label htmlFor="playback-radius" className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Radius (km)</label>
            <input
              id="playback-radius"
              type="number"
              min={0}
              className={NUMBER_INPUT}
              value={radiusKm}
              disabled={!selectedGeofenceId}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section>
        <h4 className={SECTION_TITLE}>Playback Events</h4>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_OPTIONS.map((opt) => (
            <label key={opt.key} className={CHECKBOX_ROW}>
              <input
                type="checkbox"
                checked={eventFilters[opt.key]}
                onChange={(e) => onEventFilterChange(opt.key, e.target.checked)}
                aria-label={opt.label}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h4 className={SECTION_TITLE}>Driving Behaviour</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="playback-min-speed" className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Min Speed</label>
            <input
              id="playback-min-speed"
              type="number"
              className={NUMBER_INPUT}
              value={thresholds.minSpeedThreshold}
              onChange={(e) => onThresholdsChange({ ...thresholds, minSpeedThreshold: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="playback-max-speed" className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Max Speed</label>
            <input
              id="playback-max-speed"
              type="number"
              className={NUMBER_INPUT}
              value={thresholds.maxSpeedThreshold}
              onChange={(e) => onThresholdsChange({ ...thresholds, maxSpeedThreshold: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="playback-min-stop" className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Min Stop (min)</label>
            <input
              id="playback-min-stop"
              type="number"
              className={NUMBER_INPUT}
              value={thresholds.minStopDurationMinutes}
              onChange={(e) => onThresholdsChange({ ...thresholds, minStopDurationMinutes: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <section data-testid="device-filters-section" aria-disabled="true" className="opacity-50 pointer-events-none">
        <h4 className={SECTION_TITLE}>Device Filters</h4>
        <p className="text-[10px] font-bold text-slate-400">Not available for this device yet.</p>
      </section>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onApply}
          className="flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700"
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}
