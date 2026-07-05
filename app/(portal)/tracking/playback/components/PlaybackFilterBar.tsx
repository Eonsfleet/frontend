'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface PlaybackFilterBarProps {
  vehicles: { id: string; label: string }[]
  selectedVehicleId: string | null
  onVehicleChange: (id: string) => void
  clusters: { id: string; label: string }[]
  selectedClusterId: string | null
  onClusterChange: (id: string | null) => void
  drivers: { id: string; label: string }[]
  selectedDriverId: string | null
  onDriverChange: (id: string | null) => void
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  isRangeReadOnly: boolean
  activeFilterCount: number
  isAdvancedOpen: boolean
  onToggleAdvanced: () => void
  activeChips: { key: string; label: string }[]
  onRemoveChip: (key: string) => void
  onClearAllChips: () => void
}

const FIELD_LABEL = 'text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5'
const FIELD_INPUT = 'w-full bg-white border border-slate-200 rounded-lg h-9 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500'

export function PlaybackFilterBar({
  vehicles,
  selectedVehicleId,
  onVehicleChange,
  clusters,
  selectedClusterId,
  onClusterChange,
  drivers,
  selectedDriverId,
  onDriverChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  isRangeReadOnly,
  activeFilterCount,
  isAdvancedOpen,
  onToggleAdvanced,
  activeChips,
  onRemoveChip,
  onClearAllChips,
}: PlaybackFilterBarProps) {
  return (
    <div className="bg-white border-b border-slate-200 p-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        <div>
          <label htmlFor="playback-start-time" className={FIELD_LABEL}>Date & Time (Start)</label>
          <input
            id="playback-start-time"
            type="datetime-local"
            className={FIELD_INPUT}
            value={startTime}
            readOnly={isRangeReadOnly}
            onChange={(e) => onStartTimeChange(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="playback-end-time" className={FIELD_LABEL}>Date & Time (End)</label>
          <input
            id="playback-end-time"
            type="datetime-local"
            className={FIELD_INPUT}
            value={endTime}
            readOnly={isRangeReadOnly}
            onChange={(e) => onEndTimeChange(e.target.value)}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Vehicles</label>
          <Select value={selectedVehicleId ?? undefined} onValueChange={onVehicleChange}>
            <SelectTrigger aria-label="Vehicles" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Groups</label>
          <Select value={selectedClusterId ?? 'all'} onValueChange={(v) => onClusterChange(v === 'all' ? null : v)}>
            <SelectTrigger aria-label="Groups" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {clusters.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Drivers</label>
          <Select value={selectedDriverId ?? 'all'} onValueChange={(v) => onDriverChange(v === 'all' ? null : v)}>
            <SelectTrigger aria-label="Drivers" className="w-full h-9 text-xs font-bold">
              <SelectValue placeholder="All Drivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Location</label>
          <Select disabled value="all">
            <SelectTrigger aria-label="Location" title="Location filtering isn't available yet" className="w-full h-9 text-xs font-bold opacity-60">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onToggleAdvanced}
            aria-label={`More Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
            className={cn(
              'w-full h-9 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors',
              isAdvancedOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            More Filters
            {activeFilterCount > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wide"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label.toLowerCase()} filter`}
                onClick={() => onRemoveChip(chip.key)}
                className="hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAllChips}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 ml-1"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  )
}
