'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as trackingApi from '@/lib/api/tracking'
import type { PlaybackMovement } from '@/types'

type RawPlaybackPoint = Record<string, unknown>

export interface UsePlaybackMovementsParams {
  vehicleId: string | null
  tripId: string | null
  startTime: string | null
  endTime: string | null
}

function numeric(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function optionalNumeric(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

export function usePlaybackMovements({ vehicleId, tripId, startTime, endTime }: UsePlaybackMovementsParams) {
  const tripQuery = useQuery({
    queryKey: ['playback-trip', vehicleId, tripId],
    queryFn: () => trackingApi.getTripPlayback(vehicleId!, tripId!, { include_gps_points: true }),
    enabled: !!vehicleId && !!tripId,
  })

  const historyQuery = useQuery({
    queryKey: ['playback-history', vehicleId, startTime, endTime],
    queryFn: () => trackingApi.getVehiclePlayback(vehicleId!, startTime!, endTime!),
    enabled: !!vehicleId && !tripId && !!startTime && !!endTime,
  })

  const movements = useMemo<PlaybackMovement[]>(() => {
    const raw = (tripId ? (tripQuery.data?.data?.gps_points ?? []) : (historyQuery.data?.data ?? [])) as RawPlaybackPoint[]
    return raw
      .map((p) => ({
        id: numeric(p.id),
        vehicle_id: String(p.vehicle_id ?? vehicleId ?? ''),
        lat: numeric(p.lat ?? p.latitude, Number.NaN),
        lng: numeric(p.lng ?? p.longitude, Number.NaN),
        speed: numeric(p.speed),
        heading: numeric(p.heading ?? p.course ?? p.bearing),
        timestamp: String(p.timestamp ?? p.gps_datetime ?? p.recorded_at ?? p.created_at ?? ''),
        fuel_level: optionalNumeric(p.fuel_level),
        fuel_level_liters: optionalNumeric(p.fuel_level_liters),
        fuel_level_percent: optionalNumeric(p.fuel_level_percent),
        altitude: optionalNumeric(p.altitude),
        ignition: p.ignition as PlaybackMovement['ignition'],
        movement: p.movement as PlaybackMovement['movement'],
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [tripId, tripQuery.data, historyQuery.data, vehicleId])

  return {
    movements,
    isLoading: tripId ? tripQuery.isLoading : historyQuery.isLoading,
    isError: tripId ? tripQuery.isError : historyQuery.isError,
    refetch: tripId ? tripQuery.refetch : historyQuery.refetch,
  }
}