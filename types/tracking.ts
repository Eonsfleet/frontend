export interface PlaybackMovement {
  id: number
  vehicle_id: number
  lat: number
  lng: number
  speed: number
  heading: number
  timestamp: string
}

export interface PlaybackStats {
  durationMinutes: number
  distanceKm: number
  avgSpeed: number
  maxSpeed: number
}

export type PlaybackEventType =
  | 'overspeed'
  | 'harsh_braking'
  | 'harsh_acceleration'
  | 'geofence_enter'
  | 'geofence_exit'

export interface PlaybackEvent {
  type: PlaybackEventType
  startIndex: number
  endIndex: number
  timestamp: string
  lat: number
  lng: number
  peakSpeed?: number
}

export interface PlaybackStop {
  startIndex: number
  endIndex: number
  startTimestamp: string
  endTimestamp: string
  durationMinutes: number
  lat: number
  lng: number
}

export type PlaybackSpeedBucket = '0-20' | '20-40' | '40-60' | '60-80' | '80+'

export interface PlaybackSpeedSegment {
  positions: [number, number][]
  bucket: PlaybackSpeedBucket
  color: string
}
