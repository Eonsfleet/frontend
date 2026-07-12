'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, Layers, Navigation as NavigationIcon, Crosshair, Lock, Move } from 'lucide-react'
import { format } from 'date-fns'
import type { PlaybackMovement, PlaybackSpeedSegment, PlaybackStop } from '@/types'
import type { LatLng, MapMarkerHandle } from '@/lib/map/types'
import type { PlaybackFrame, PlaybackPreparedPoint } from '@/lib/playback/interpolation'
import { lookAheadPoint } from '@/lib/playback/interpolation'
import { useMapProvider } from '../../hooks/useMapProvider'
import { useMapCameraFollow } from '../../hooks/useMapCameraFollow'
import { MapCompatibilityBanner } from '../../components/MapCompatibilityBanner'
import { cn } from '@/lib/utils'

const DEFAULT_CENTER: LatLng = { lat: 6.5244, lng: 3.3792 }

const SPEED_LEGEND: { bucket: string; color: string }[] = [
  { bucket: '0 - 20', color: '#22c55e' },
  { bucket: '20 - 40', color: '#84cc16' },
  { bucket: '40 - 60', color: '#eab308' },
  { bucket: '60 - 80', color: '#f97316' },
  { bucket: '80+', color: '#ef4444' },
]

export type PlaybackCameraMode = 'smart' | 'follow' | 'free'

function positionMarkerHtml(heading: number) {
  return `<div class="marker-container is-active"><div class="marker-pulse"></div><div class="marker-base" style="transform: rotate(${heading}deg); background: #2563eb; border-color: #fff;"><div class="marker-icon-wrapper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div></div></div>`
}

function endpointMarkerHtml(color: string) {
  return `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`
}

function stopMarkerHtml(index: number) {
  return `<div style="width:20px;height:20px;border-radius:9999px;background:#2563eb;color:white;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid white;">${index + 1}</div>`
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function boolLabel(value: PlaybackMovement['ignition']): string {
  if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'on' || String(value).toLowerCase() === 'true') return 'On'
  if (value === false || value === 0 || value === '0' || String(value).toLowerCase() === 'off' || String(value).toLowerCase() === 'false') return 'Off'
  return '—'
}

function routePoints(points: PlaybackPreparedPoint[]): LatLng[] {
  return points.map((p) => ({ lat: p.lat, lng: p.lng }))
}

export interface PlaybackMapProps {
  movements: PlaybackMovement[]
  preparedPoints?: PlaybackPreparedPoint[]
  speedSegments: PlaybackSpeedSegment[]
  stops: PlaybackStop[]
  currentIndex: number
  currentFrame?: PlaybackFrame | null
  currentAddress?: string
  mapStyle: 'standard' | 'satellite'
  onToggleMapStyle: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export function PlaybackMap({
  movements,
  preparedPoints = [],
  speedSegments,
  stops,
  currentIndex,
  currentFrame,
  currentAddress = 'Resolving location…',
  mapStyle,
  onToggleMapStyle,
  isFullscreen,
  onToggleFullscreen,
}: PlaybackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cameraMode, setCameraMode] = useState<PlaybackCameraMode>('free')
  const [recenterKey, setRecenterKey] = useState(0)
  const { provider, isReady, isFallback } = useMapProvider({
    containerRef,
    initialCenter: DEFAULT_CENTER,
    initialZoom: 12,
    styleKey: mapStyle,
  })

  const currentMovement = currentFrame ?? movements[currentIndex]
  const allRoutePoints = useMemo(
    () => (preparedPoints.length ? routePoints(preparedPoints) : movements.map((m) => ({ lat: m.lat, lng: m.lng }))),
    [movements, preparedPoints],
  )

  useMapCameraFollow({
    provider,
    isReady,
    fleetPoints: allRoutePoints,
    followTarget: null,
    zoomResetKey: recenterKey,
  })

  useEffect(() => {
    if (!provider || !isReady) return
    return provider.onInteractionStart(() => setCameraMode('free'))
  }, [provider, isReady])

  const cameraTickRef = useRef(0)
  useEffect(() => {
    if (!provider || !isReady || !currentMovement || cameraMode === 'free') return
    const now = performance.now()
    if (now - cameraTickRef.current < 300) return
    cameraTickRef.current = now
    const current = { lat: currentMovement.lat, lng: currentMovement.lng }
    const ahead = currentFrame && cameraMode === 'smart' ? lookAheadPoint(preparedPoints, currentFrame.timeMs, 20) : null
    const target = ahead ? { lat: current.lat * 0.35 + ahead.lat * 0.65, lng: current.lng * 0.35 + ahead.lng * 0.65 } : current
    provider.flyTo(target, cameraMode === 'smart' ? 16 : 17, { durationMs: 450 })
  }, [cameraMode, currentFrame, currentMovement, isReady, preparedPoints, provider])

  // Static speed-colored route segments stay cheap: built once per data change.
  const prevSegmentKeysRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!provider || !isReady) return
    const keys = new Set<string>()
    speedSegments.forEach((segment, i) => {
      const key = `segment-${i}`
      provider.setPolyline(
        key,
        segment.positions.map(([lat, lng]) => ({ lat, lng })),
        { color: segment.color, weight: 3, opacity: 0.35 },
      )
      keys.add(key)
    })
    prevSegmentKeysRef.current.forEach((key) => {
      if (!keys.has(key)) provider.removeOverlay(key)
    })
    prevSegmentKeysRef.current = keys
  }, [provider, isReady, speedSegments])

  // Progress layers: completed route is vivid, remaining route is subtle.
  useEffect(() => {
    if (!provider || !isReady) return
    if (!currentMovement || allRoutePoints.length === 0) {
      provider.removeOverlay('playback-completed-route')
      provider.removeOverlay('playback-remaining-route')
      return
    }
    const current = { lat: currentMovement.lat, lng: currentMovement.lng }
    const index = Math.max(0, Math.min(currentFrame?.index ?? currentIndex, allRoutePoints.length - 1))
    const completed = [...allRoutePoints.slice(0, index + 1), current]
    const remaining = [current, ...allRoutePoints.slice(index + 1)]
    provider.setPolyline('playback-completed-route', completed, { color: '#2563eb', weight: 6, opacity: 0.95 })
    provider.setPolyline('playback-remaining-route', remaining, { color: '#94a3b8', weight: 4, opacity: 0.45, dashed: true })
  }, [allRoutePoints, currentFrame, currentIndex, currentMovement, isReady, provider])

  // Start/end endpoint markers.
  const startHandleRef = useRef<MapMarkerHandle | null>(null)
  const endHandleRef = useRef<MapMarkerHandle | null>(null)
  useEffect(() => {
    if (!provider || !isReady) return

    if (allRoutePoints[0]) {
      const { lat, lng } = allRoutePoints[0]
      if (!startHandleRef.current) {
        startHandleRef.current = provider.addMarker('playback-start', { lat, lng, html: endpointMarkerHtml('#22c55e'), iconSize: [16, 16], iconAnchor: [8, 8] })
      } else startHandleRef.current.setPosition(lat, lng)
    }

    if (allRoutePoints.length > 1) {
      const { lat, lng } = allRoutePoints[allRoutePoints.length - 1]
      if (!endHandleRef.current) {
        endHandleRef.current = provider.addMarker('playback-end', { lat, lng, html: endpointMarkerHtml('#ef4444'), iconSize: [16, 16], iconAnchor: [8, 8] })
      } else endHandleRef.current.setPosition(lat, lng)
    }

    return () => {
      if (startHandleRef.current) {
        provider.removeMarker('playback-start')
        startHandleRef.current = null
      }
      if (endHandleRef.current) {
        provider.removeMarker('playback-end')
        endHandleRef.current = null
      }
    }
  }, [provider, isReady, allRoutePoints])

  // Stop markers.
  const prevStopKeysRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!provider || !isReady) return
    const keys = new Set<string>()
    stops.forEach((stop, i) => {
      const key = `stop-${i}`
      const existing = provider.getMarker(key)
      if (existing) existing.setPosition(stop.lat, stop.lng)
      else provider.addMarker(key, { lat: stop.lat, lng: stop.lng, html: stopMarkerHtml(i), iconSize: [20, 20], iconAnchor: [10, 10] })
      keys.add(key)
    })
    prevStopKeysRef.current.forEach((key) => {
      if (!keys.has(key)) provider.removeMarker(key)
    })
    prevStopKeysRef.current = keys
  }, [provider, isReady, stops])

  // Current playback position updates the existing marker imperatively.
  const currentHandleRef = useRef<MapMarkerHandle | null>(null)
  useEffect(() => {
    if (!provider || !isReady) return
    if (currentMovement) {
      if (!currentHandleRef.current) {
        currentHandleRef.current = provider.addMarker('playback-current', {
          lat: currentMovement.lat,
          lng: currentMovement.lng,
          html: positionMarkerHtml(currentMovement.heading),
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        })
      } else {
        currentHandleRef.current.setPosition(currentMovement.lat, currentMovement.lng)
        currentHandleRef.current.setRotation(currentMovement.heading)
      }
    } else if (currentHandleRef.current) {
      provider.removeMarker('playback-current')
      currentHandleRef.current = null
    }
  }, [provider, isReady, currentMovement])

  const recenter = () => {
    setCameraMode('smart')
    setRecenterKey((key) => key + 1)
  }

  return (
    <div className="relative flex-1 h-full">
      <div ref={containerRef} className="h-full w-full z-10" />
      <MapCompatibilityBanner isFallback={isFallback} />

      <div className="absolute top-4 left-4 w-80 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur z-20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Live playback position</p>
            <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-900">{currentAddress}</p>
          </div>
          <span className={cn('rounded-full px-2 py-1 text-[9px] font-black uppercase', currentFrame?.isStopped ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
            {currentFrame?.isStopped ? 'Stopped' : 'Moving'}
          </span>
        </div>
        {currentMovement && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
            <span>Speed: {Math.round(currentMovement.speed)} km/h</span>
            <span>Heading: {Math.round(currentMovement.heading)}°</span>
            <span>Fuel: {currentMovement.fuel_level_percent != null ? `${Math.round(currentMovement.fuel_level_percent)}%` : '—'}</span>
            <span>Altitude: {currentMovement.altitude != null ? `${Math.round(currentMovement.altitude)} m` : '—'}</span>
            <span>Ignition: {boolLabel(currentMovement.ignition)}</span>
            <span>Movement: {currentFrame?.isStopped ? 'Waiting' : 'Driving'}</span>
            <span className="col-span-2">Time: {format(new Date(currentMovement.timestamp), 'MMM d, yyyy h:mm:ss a')}</span>
            <span className="col-span-2">GPS: {currentMovement.lat.toFixed(5)}, {currentMovement.lng.toFixed(5)}</span>
            {currentFrame && <span className="col-span-2">Trip: {currentFrame.distanceKm.toFixed(2)} km done · {currentFrame.remainingDistanceKm.toFixed(2)} km left · {formatDuration(currentFrame.elapsedMs)} elapsed</span>}
            {currentFrame?.isStopped && <span className="col-span-2 text-amber-600">Stop duration: {formatDuration(currentFrame.stopDurationMs)}</span>}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-3 z-20">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Speed (km/h)</p>
        <div className="space-y-1">
          {SPEED_LEGEND.map((entry) => (
            <div key={entry.bucket} className="flex items-center gap-2">
              <span data-testid="speed-legend-swatch" className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
              <span className="text-[10px] font-bold text-slate-600">{entry.bucket}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <div className="rounded-xl bg-white p-1 shadow-lg">
          {([
            ['smart', Lock],
            ['follow', Crosshair],
            ['free', Move],
          ] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCameraMode(mode)}
              aria-label={`${mode} camera`}
              className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-blue-600', cameraMode === mode && 'bg-blue-50 text-blue-600')}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <button type="button" onClick={recenter} aria-label="Recenter" className="h-10 w-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-blue-600">
          <Crosshair className="h-4 w-4" />
        </button>
        <button type="button" disabled title="Traffic layer isn't available yet" aria-label="Traffic" className="h-10 w-10 rounded-xl bg-white/60 shadow-lg flex items-center justify-center text-slate-300 cursor-not-allowed">
          <NavigationIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={onToggleMapStyle} aria-label={mapStyle === 'standard' ? 'Satellite' : 'Map'} className="h-10 w-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-blue-600">
          <Layers className="h-4 w-4" />
        </button>
        <button type="button" onClick={onToggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="h-10 w-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-blue-600">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
