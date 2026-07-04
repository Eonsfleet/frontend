'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as trackingApi from '@/lib/api/tracking'
import type { PlaybackMovement } from '@/types'

export interface UsePlaybackMovementsParams {
  vehicleId: string | null
  tripId: string | null
  startTime: string | null
  endTime: string | null
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
    const raw: any[] = tripId ? (tripQuery.data?.data?.gps_points ?? []) : (historyQuery.data?.data ?? [])
    return raw
      .map((p: any) => ({
        id: p.id ?? 0,
        vehicle_id: Number(vehicleId),
        lat: p.lat ?? p.latitude,
        lng: p.lng ?? p.longitude,
        speed: p.speed ?? 0,
        heading: p.heading ?? 0,
        timestamp: p.timestamp ?? p.gps_datetime,
      }))
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [tripId, tripQuery.data, historyQuery.data, vehicleId])

  return {
    movements,
    isLoading: tripId ? tripQuery.isLoading : historyQuery.isLoading,
    isError: tripId ? tripQuery.isError : historyQuery.isError,
    refetch: tripId ? tripQuery.refetch : historyQuery.refetch,
  }
}
