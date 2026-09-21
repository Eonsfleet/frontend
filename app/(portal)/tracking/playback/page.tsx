'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format, subHours } from 'date-fns'
import { ChevronLeft, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import * as vehicleApi from '@/lib/api/vehicles'
import * as driversApi from '@/lib/api/drivers'
import * as tripApi from '@/lib/api/trips'
import { getClustersBatched } from '@/lib/api/settings'
import { getGeofences } from '@/lib/api/geofencing'
import { STALE_TIME_STATIC } from '@/lib/config'
import type { PlaybackEventType } from '@/types'
import { DEFAULT_THRESHOLDS, type DrivingBehaviourThresholds } from '@/lib/playback/derive'
import type { PlaybackSpeed } from '@/lib/playback/interpolation'
import { usePlaybackMovements } from './hooks/usePlaybackMovements'
import { usePlaybackDerived } from './hooks/usePlaybackDerived'
import { usePlaybackEngine } from './hooks/usePlaybackEngine'
import { usePlaybackAddress } from './hooks/usePlaybackAddress'
import { PlaybackFilterBar } from './components/PlaybackFilterBar'
import { PlaybackAdvancedFilters } from './components/PlaybackAdvancedFilters'
import { PlaybackMap } from './components/PlaybackMap'
import { PlaybackScrubber } from './components/PlaybackScrubber'
import { PlaybackSummaryPanel } from './components/PlaybackSummaryPanel'
import { PlaybackBottomPanel } from './components/PlaybackBottomPanel'
import { StreetImageryPanel } from '../components/StreetImageryPanel'
import { useStreetImageryStore } from '@/store/streetImageryStore'

const DEFAULT_EVENT_FILTERS: Record<PlaybackEventType, boolean> = {
  overspeed: true,
  harsh_braking: true,
  harsh_acceleration: true,
  geofence_enter: true,
  geofence_exit: true,
}

function toDatetimeLocal(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
}

export default function PlaybackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setSidebarCollapsed } = useUIStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const [vehicleId, setVehicleId] = useState<string | null>(searchParams.get('vehicleId'))
  const [tripId, setTripId] = useState<string | null>(searchParams.get('tripId'))
  const initialEnd = searchParams.get('end') ?? new Date().toISOString()
  const initialStart = searchParams.get('start') ?? subHours(new Date(initialEnd), 6).toISOString()
  const [startTime, setStartTime] = useState(toDatetimeLocal(initialStart))
  const [endTime, setEndTime] = useState(toDatetimeLocal(initialEnd))
  const [clusterId, setClusterId] = useState<string | null>(null)
  const [driverId, setDriverId] = useState<string | null>(null)

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [vehicleStatusFilters, setVehicleStatusFilters] = useState({ moving: true, parked: true, idle: true, offline: true })
  const [routeId, setRouteId] = useState<string | null>(null)
  const [geofenceId, setGeofenceId] = useState<string | null>(null)
  const [radiusKm, setRadiusKm] = useState(5)
  const [eventFilters, setEventFilters] = useState(DEFAULT_EVENT_FILTERS)
  const [thresholds, setThresholds] = useState<DrivingBehaviourThresholds>(DEFAULT_THRESHOLDS)

  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(16)

  useEffect(() => {
    setSidebarCollapsed(true)
    return () => setSidebarCollapsed(false)
  }, [setSidebarCollapsed])

  const { data: vehiclesData } = useQuery({
    queryKey: ['playback-vehicles'],
    queryFn: () => vehicleApi.getVehicles({ per_page: 200 }),
  })
  const vehicles = useMemo(() => vehiclesData?.data ?? [], [vehiclesData])

  const { data: clusters = [] } = useQuery({
    queryKey: ['cluster-fleet-stats-clusters'],
    queryFn: () => getClustersBatched(),
    staleTime: STALE_TIME_STATIC,
  })

  const { data: driversData } = useQuery({
    queryKey: ['playback-drivers'],
    queryFn: () => driversApi.getDrivers({ per_page: 200 }),
  })
  const drivers = useMemo(() => driversData?.data ?? [], [driversData])

  const { data: driverVehicleData } = useQuery({
    queryKey: ['playback-driver-vehicle', driverId],
    queryFn: () => driversApi.getDriverCurrentVehicle(driverId!),
    enabled: !!driverId,
  })

  useEffect(() => {
    const assignedVehicleId = driverVehicleData?.data?.id
    if (assignedVehicleId) queueMicrotask(() => setVehicleId(String(assignedVehicleId)))
  }, [driverVehicleData])

  const { data: geofencesData } = useQuery({
    queryKey: ['playback-geofences'],
    queryFn: () => getGeofences({ per_page: 100 }),
  })
  const geofences = geofencesData?.data?.geofences ?? []
  const selectedGeofence = geofences.find((g) => String(g.id) === geofenceId) ?? null

  const { data: routesData } = useQuery({
    queryKey: ['playback-routes', tripId],
    queryFn: () => tripApi.getTripRoutes(tripId!),
    enabled: !!tripId,
  })
  const routes = ((routesData?.data ?? []) as Record<string, unknown>[]).map((route) => ({ id: String(route.id), label: String(route.name ?? `Route ${route.id}`) }))

  const visibleVehicles = useMemo(() => {
    if (!clusterId) return vehicles
    return vehicles.filter((v) => String(v.relationships?.cluster?.id ?? '') === clusterId)
  }, [vehicles, clusterId])

  const selectedVehicle = vehicles.find((v) => v.attributes.uuid === vehicleId || String(v.id) === vehicleId) ?? null
  const vehicleLabel = selectedVehicle?.attributes.registration_number ?? '—'

  const { movements, isLoading } = usePlaybackMovements({
    vehicleId,
    tripId,
    startTime: tripId ? null : new Date(startTime).toISOString(),
    endTime: tripId ? null : new Date(endTime).toISOString(),
  })

  const { stats, speedSegments, stops, gaps, events } = usePlaybackDerived(movements, thresholds, selectedGeofence)
  const handlePlaybackEnd = useCallback(() => setIsPlaying(false), [])

  const {
    preparedPoints,
    frame: playbackFrame,
    currentIndex: playbackIndex,
    progressPercent,
    seekToIndex,
    seekToPercent,
  } = usePlaybackEngine({
    movements,
    isPlaying,
    speed: playbackSpeed,
    onPlaybackEnd: handlePlaybackEnd,
  })
  const currentAddress = usePlaybackAddress(playbackFrame, preparedPoints, isPlaying)
  const filteredEvents = events.filter((e) => eventFilters[e.type])

  const handleViewStreet = useCallback(() => {
    const point = playbackFrame ?? movements[playbackIndex]
    if (!point) return
    if (isPlaying) setIsPlaying(false)
    useStreetImageryStore.getState().open(
      { lat: point.lat, lng: point.lng },
      {
        label: vehicleLabel,
        subtitle: `Playback @ ${format(new Date(point.timestamp), 'hh:mm:ss a')}`,
        sourceTimestamp: point.timestamp,
        sourceTimestampLabel: 'Playback timestamp',
      },
    )
  }, [movements, playbackIndex, playbackFrame, isPlaying, vehicleLabel])

  const activeFilterCount =
    Object.values(vehicleStatusFilters).filter((v) => !v).length +
    (routeId ? 1 : 0) +
    (geofenceId ? 1 : 0) +
    Object.values(eventFilters).filter((v) => !v).length

  const activeChips = [
    ...(!vehicleStatusFilters.parked ? [{ key: 'hide-parked', label: 'Hiding Parked' }] : []),
    ...(geofenceId ? [{ key: 'geofence', label: 'Geofence Filter' }] : []),
    ...(routeId ? [{ key: 'route', label: 'Route Filter' }] : []),
  ]

  const removeChip = useCallback((key: string) => {
    if (key === 'hide-parked') setVehicleStatusFilters((prev) => ({ ...prev, parked: true }))
    if (key === 'geofence') setGeofenceId(null)
    if (key === 'route') setRouteId(null)
  }, [])

  const clearAllChips = useCallback(() => {
    setVehicleStatusFilters({ moving: true, parked: true, idle: true, offline: true })
    setGeofenceId(null)
    setRouteId(null)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    }
  }, [])



  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return

      if (event.code === 'Space') {
        event.preventDefault()
        setIsPlaying((playing) => !playing)
        return
      }
      if (movements.length === 0) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        seekToIndex(Math.max(0, playbackIndex - 10))
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        seekToIndex(Math.min(movements.length - 1, playbackIndex + 10))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [movements.length, playbackIndex, seekToIndex])
  return (
    <div ref={containerRef} className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h1 className="font-black text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Playback
        </h1>
      </div>

      <PlaybackFilterBar
        vehicles={visibleVehicles.map((v) => ({ id: v.attributes.uuid ?? String(v.id), label: v.attributes.registration_number }))}
        selectedVehicleId={vehicleId}
        onVehicleChange={(id) => {
          setVehicleId(id)
          setTripId(null)
          seekToIndex(0)
        }}
        clusters={clusters.map((c) => ({ id: String(c.id), label: c.attributes.name }))}
        selectedClusterId={clusterId}
        onClusterChange={setClusterId}
        drivers={drivers.map((driver) => ({ id: String(driver.id), label: driver.attributes.full_name || `${driver.attributes.first_name} ${driver.attributes.last_name}`.trim() || `Driver ${driver.id}` }))}
        selectedDriverId={driverId}
        onDriverChange={setDriverId}
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        isRangeReadOnly={!!tripId}
        activeFilterCount={activeFilterCount}
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen((v) => !v)}
        activeChips={activeChips}
        onRemoveChip={removeChip}
        onClearAllChips={clearAllChips}
      />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold">Loading telemetry…</div>
          ) : (
            <PlaybackMap
              movements={movements}
              speedSegments={speedSegments}
              stops={stops}
              currentIndex={playbackIndex}
              preparedPoints={preparedPoints}
              currentFrame={playbackFrame}
              currentAddress={currentAddress}
              vehicleLabel={vehicleLabel}
              isPlaying={isPlaying}
              mapStyle={mapStyle}
              onToggleMapStyle={() => setMapStyle((s) => (s === 'standard' ? 'satellite' : 'standard'))}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          )}
          <PlaybackScrubber
            movements={movements}
            events={filteredEvents}
            stops={stops}
            currentIndex={playbackIndex}
            onIndexChange={seekToIndex}
            isPlaying={isPlaying}
            onTogglePlaying={() => setIsPlaying((p) => !p)}
            speed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
            currentFrame={playbackFrame}
            progressPercent={progressPercent}
            onProgressChange={seekToPercent}
            onViewStreet={handleViewStreet}
          />
        </div>

        <aside className="flex w-[30rem] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white">
          {isAdvancedOpen ? (
            <PlaybackAdvancedFilters
              vehicleStatusFilters={vehicleStatusFilters}
              onVehicleStatusChange={(key, value) => setVehicleStatusFilters((prev) => ({ ...prev, [key]: value }))}
              routes={routes}
              selectedRouteId={routeId}
              onRouteChange={setRouteId}
              geofences={geofences.map((g) => ({ id: String(g.id), label: g.attributes.name }))}
              selectedGeofenceId={geofenceId}
              onGeofenceChange={setGeofenceId}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              eventFilters={eventFilters}
              onEventFilterChange={(key, value) => setEventFilters((prev) => ({ ...prev, [key]: value }))}
              thresholds={thresholds}
              onThresholdsChange={setThresholds}
              onApply={() => setIsAdvancedOpen(false)}
              onReset={() => {
                setVehicleStatusFilters({ moving: true, parked: true, idle: true, offline: true })
                setRouteId(null)
                setGeofenceId(null)
                setRadiusKm(5)
                setEventFilters(DEFAULT_EVENT_FILTERS)
                setThresholds(DEFAULT_THRESHOLDS)
              }}
            />
          ) : (
            <>
              <PlaybackSummaryPanel stats={stats} stopsCount={stops.length} events={filteredEvents} vehicleLabel={vehicleLabel} />
              <PlaybackBottomPanel
                className="min-h-0 flex-1"
                movements={movements}
                events={filteredEvents}
                stops={stops}
                stats={stats}
                vehicleLabel={vehicleLabel}
                onJumpToIndex={seekToIndex}
              />
            </>
          )}
        </aside>
      </div>

      <StreetImageryPanel />
    </div>
  )
}










