'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, Layers, Navigation as NavigationIcon, Crosshair, Lock, Move, ZoomIn, ZoomOut } from 'lucide-react'
import { format } from 'date-fns'
import type { PlaybackMovement, PlaybackSpeedSegment, PlaybackStop } from '@/types'
import type { LatLng, MapMarkerHandle } from '@/lib/map/types'
import type { PlaybackFrame, PlaybackPreparedPoint } from '@/lib/playback/interpolation'
import { simplifyRoutePoints, type PlaybackGap } from '@/lib/playback/route'
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

const LABELED_PIN_ICON = { iconSize: [164, 64] as [number, number], iconAnchor: [14, 58] as [number, number] }

function escapeMarkerText(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
}

function labeledPinMarkerHtml(color: string, label: string, detail: string, showDirection = false) {
  const safeLabel = escapeMarkerText(label)
  const safeDetail = escapeMarkerText(detail)
  const direction = showDirection
    ? '<div class="marker-base" style="position:absolute;left:9px;top:27px;width:10px;height:15px;transform-origin:50% 50%;"><svg width="10" height="15" viewBox="0 0 10 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 0 10 14 5 10 0 14 5 0Z" fill="#1d4ed8" stroke="white" stroke-width="1.5"/></svg></div>'
    : ''
  return `<div style="position:relative;width:164px;height:64px;overflow:visible;"><div style="position:absolute;left:25px;top:0;min-width:102px;padding:6px 9px;border:1px solid #e2e8f0;border-radius:8px;background:rgba(255,255,255,.97);box-shadow:0 3px 10px rgba(15,23,42,.14);font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.2;"><div style="font-size:10px;font-weight:800;color:#1e3a8a;white-space:nowrap;">${safeLabel}</div><div style="margin-top:2px;font-size:9px;font-weight:700;color:#475569;white-space:nowrap;">${safeDetail}</div></div><div style="position:absolute;left:0;top:22px;width:28px;height:36px;"><svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 1C6.82 1 1 6.82 1 14c0 9.75 13 21 13 21s13-11.25 13-21C27 6.82 21.18 1 14 1Z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="white"/><circle cx="14" cy="14" r="2.5" fill="${color}"/></svg></div>${direction}</div>`
}

function stopMarkerHtml(index: number) {
  return `<div style="width:22px;height:22px;border-radius:9999px;background:#1677ff;color:white;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(15,23,42,.25);">${index + 1}</div>`
}

function gapMarkerHtml(durationMs: number) {
  const minutes = Math.round(durationMs / 60_000)
  return `<div title="GPS gap: ${minutes} minutes" style="width:22px;height:22px;border-radius:9999px;background:#f59e0b;color:white;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(15,23,42,.25);">!</div>`
}
function adaptiveFollowZoom(speed: number): number {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
  const baseZoom = viewportWidth < 640 ? 14.5 : viewportWidth < 1024 ? 15.25 : 16
  if (speed >= 90) return baseZoom - 1
  if (speed >= 60) return baseZoom - 0.5
  return baseZoom
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
  gaps?: PlaybackGap[]
  currentIndex: number
  currentFrame?: PlaybackFrame | null
  currentAddress?: string
  vehicleLabel?: string
  isPlaying?: boolean
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
  gaps = [],
  currentIndex,
  currentFrame,
  currentAddress = 'Resolving location…',
  vehicleLabel = 'Vehicle',
  isPlaying = false,
  mapStyle,
  onToggleMapStyle,
  isFullscreen,
  onToggleFullscreen,
}: PlaybackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cameraMode, setCameraMode] = useState<PlaybackCameraMode>('smart')
  const [recenterKey, setRecenterKey] = useState(0)
  const [viewportKey, setViewportKey] = useState(0)
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

  useEffect(() => {
    const updateViewport = () => setViewportKey((key) => key + 1)
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  const cameraTickRef = useRef(0)
  useEffect(() => {
    if (!provider || !isReady || !isPlaying || !currentMovement || cameraMode === 'free') return
    const now = performance.now()
    if (now - cameraTickRef.current < 250) return
    cameraTickRef.current = now

    const current = { lat: currentMovement.lat, lng: currentMovement.lng }
    const currentRouteIndex = Math.max(0, Math.min(currentFrame?.index ?? currentIndex, allRoutePoints.length - 1))
    const remainingRoute = allRoutePoints.slice(currentRouteIndex + 1)

    if (cameraMode === 'smart' && remainingRoute.length > 0) {
      const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
      const paddingPx = viewportWidth < 640 ? 56 : viewportWidth < 1024 ? 80 : 112
      provider.fitBounds([current, ...remainingRoute], { paddingPx, maxZoom: adaptiveFollowZoom(currentMovement.speed) + 0.5 })
      return
    }

    const zoom = adaptiveFollowZoom(currentMovement.speed) + 0.75
    provider.flyTo(current, zoom, { durationMs: 320 })
  }, [allRoutePoints, cameraMode, currentFrame, currentIndex, currentMovement, isPlaying, isReady, provider, recenterKey, viewportKey])

  // Static speed-colored route segments stay cheap: built once per data change.
  const prevSegmentKeysRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!provider || !isReady) return
    const keys = new Set<string>()
    speedSegments.forEach((segment, i) => {
      const key = `segment-${i}`
      provider.setPolyline(
        key,
        simplifyRoutePoints(segment.positions.map(([lat, lng]) => ({ lat, lng }))),
        { color: segment.color, weight: 5, opacity: 0.95 },
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
    provider.setPolyline('playback-completed-route', completed, { color: '#2563eb', weight: 9, opacity: 0.18 })
    provider.removeOverlay('playback-remaining-route')
  }, [allRoutePoints, currentFrame, currentIndex, currentMovement, isReady, provider])

  // Start/end endpoint markers.
  const startHandleRef = useRef<MapMarkerHandle | null>(null)
  const endHandleRef = useRef<MapMarkerHandle | null>(null)
  const endpointProviderRef = useRef<typeof provider>(null)
  useEffect(() => {
    if (!provider || !isReady) return
    if (endpointProviderRef.current !== provider) {
      endpointProviderRef.current = provider
      startHandleRef.current = null
      endHandleRef.current = null
    }

    const isAtRouteStart = currentMovement && allRoutePoints[0] && currentMovement.lat === allRoutePoints[0].lat && currentMovement.lng === allRoutePoints[0].lng
    const isAtRouteEnd = currentMovement && allRoutePoints.length > 1 && currentMovement.lat === allRoutePoints[allRoutePoints.length - 1].lat && currentMovement.lng === allRoutePoints[allRoutePoints.length - 1].lng

    if (allRoutePoints[0] && !isAtRouteStart) {
      const { lat, lng } = allRoutePoints[0]
      const startSpeed = movements[0]?.speed ?? 0
      const html = labeledPinMarkerHtml('#16a34a', vehicleLabel, `Start · ${Math.round(startSpeed)} km/h`)
      if (!startHandleRef.current) {
        startHandleRef.current = provider.addMarker('playback-start', { lat, lng, html, zIndexOffset: 10, ...LABELED_PIN_ICON })
      } else {
        startHandleRef.current.setPosition(lat, lng)
        startHandleRef.current.setHtml(html, LABELED_PIN_ICON)
      }
    } else if (startHandleRef.current) {
      provider.removeMarker('playback-start')
      startHandleRef.current = null
    }

    if (allRoutePoints.length > 1 && !isAtRouteEnd) {
      const { lat, lng } = allRoutePoints[allRoutePoints.length - 1]
      const endSpeed = movements[movements.length - 1]?.speed ?? 0
      const html = labeledPinMarkerHtml('#ef4444', vehicleLabel, `End · ${Math.round(endSpeed)} km/h`)
      if (!endHandleRef.current) {
        endHandleRef.current = provider.addMarker('playback-end', { lat, lng, html, zIndexOffset: 10, ...LABELED_PIN_ICON })
      } else {
        endHandleRef.current.setPosition(lat, lng)
        endHandleRef.current.setHtml(html, LABELED_PIN_ICON)
      }
    } else if (endHandleRef.current) {
      provider.removeMarker('playback-end')
      endHandleRef.current = null
    }

  }, [provider, isReady, allRoutePoints, currentMovement, movements, vehicleLabel])

  // Stop markers.
  const prevStopKeysRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!provider || !isReady) return
    const keys = new Set<string>()
    stops.forEach((stop, i) => {
      const key = `stop-${i}`
      const existing = provider.getMarker(key)
      if (existing) existing.setPosition(stop.lat, stop.lng)
      else provider.addMarker(key, { lat: stop.lat, lng: stop.lng, html: stopMarkerHtml(i), iconSize: [22, 22], iconAnchor: [11, 11] })
      keys.add(key)
    })
    prevStopKeysRef.current.forEach((key) => {
      if (!keys.has(key)) provider.removeMarker(key)
    })
    prevStopKeysRef.current = keys
  }, [provider, isReady, stops])

  // Large telemetry gaps stay visible without affecting raw route interpolation.
  const prevGapOverlayKeysRef = useRef<Set<string>>(new Set())
  const prevGapMarkerKeysRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!provider || !isReady) return
    const overlayKeys = new Set<string>()
    const markerKeys = new Set<string>()
    gaps.forEach((gap, index) => {
      const overlayKey = `playback-gap-${index}`
      const markerKey = `playback-gap-marker-${index}`
      provider.setPolyline(overlayKey, [gap.start, gap.end], { color: '#f59e0b', weight: 4, opacity: 0.95, dashed: true })
      const marker = provider.getMarker(markerKey)
      if (marker) marker.setPosition(gap.end.lat, gap.end.lng)
      else provider.addMarker(markerKey, { lat: gap.end.lat, lng: gap.end.lng, html: gapMarkerHtml(gap.durationMs), iconSize: [22, 22], iconAnchor: [11, 11] })
      overlayKeys.add(overlayKey)
      markerKeys.add(markerKey)
    })
    prevGapOverlayKeysRef.current.forEach((key) => {
      if (!overlayKeys.has(key)) provider.removeOverlay(key)
    })
    prevGapMarkerKeysRef.current.forEach((key) => {
      if (!markerKeys.has(key)) provider.removeMarker(key)
    })
    prevGapOverlayKeysRef.current = overlayKeys
    prevGapMarkerKeysRef.current = markerKeys
  }, [gaps, provider, isReady])

  // Current playback position updates the existing marker imperatively.
  const currentHandleRef = useRef<MapMarkerHandle | null>(null)
  const currentMarkerHtmlRef = useRef<string | null>(null)
  const currentMarkerHtml = currentMovement ? labeledPinMarkerHtml('#1677ff', vehicleLabel, `${Math.round(currentMovement.speed)} km/h`, true) : null
  useEffect(() => {
    if (!provider || !isReady) return
    if (currentMovement && currentMarkerHtml) {
      if (!currentHandleRef.current) {
        currentHandleRef.current = provider.addMarker('playback-current', {
          lat: currentMovement.lat,
          lng: currentMovement.lng,
          html: currentMarkerHtml,
          zIndexOffset: 20,
          ...LABELED_PIN_ICON,
        })
        currentHandleRef.current.setRotation(currentMovement.heading)
        currentMarkerHtmlRef.current = currentMarkerHtml
      } else {
        currentHandleRef.current.setPosition(currentMovement.lat, currentMovement.lng)
        if (currentMarkerHtmlRef.current !== currentMarkerHtml) {
          currentHandleRef.current.setHtml(currentMarkerHtml, LABELED_PIN_ICON)
          currentMarkerHtmlRef.current = currentMarkerHtml
        }
        currentHandleRef.current.setRotation(currentMovement.heading)
      }
    } else if (currentHandleRef.current) {
      provider.removeMarker('playback-current')
      currentHandleRef.current = null
      currentMarkerHtmlRef.current = null
    }
  }, [provider, isReady, currentMarkerHtml, currentMovement])

  const recenter = () => {
    setCameraMode('smart')
    setRecenterKey((key) => key + 1)
  }

  const zoomBy = (direction: 'in' | 'out') => {
    setCameraMode('free')
    if (direction === 'in') provider?.zoomIn()
    else provider?.zoomOut()
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
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <button type="button" onClick={() => zoomBy('in')} aria-label="Zoom in" className="flex h-10 w-10 items-center justify-center border-b border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-blue-600">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => zoomBy('out')} aria-label="Zoom out" className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-blue-600">
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>
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
