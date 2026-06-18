import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from 'axios'
import { ApiError } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    if (data?.errors?.[0]?.detail) return data.errors[0].detail
    if (data?.message) return data.message
  }
  return 'An unexpected error occurred'
}
export function normalizeTelemetry(telemetry: any, overrides?: any) {
  if (!telemetry) return null

  const normalized = { ...telemetry, ...overrides }
  const metadata = telemetry.metadata || {}

  // Flatten metadata into top level
  Object.keys(metadata).forEach((key) => {
    let value = metadata[key]

    // Normalize units if string (e.g. "0rpm" -> 0, "4.09v" -> 4.09)
    if (typeof value === 'string') {
      const match = value.match(/^([\d.]+)/)
      if (match) {
        const num = parseFloat(match[1])
        if (!isNaN(num)) value = num
      }
    }

    normalized[key] = value
  })

  // Consolidated Status Logic
  // Statuses: in_transit, online, offline, idle, parked
  const devStatus = (normalized.deviceStatus || normalized.device_status || normalized.attributes?.deviceStatus || normalized.attributes?.device_status || '').toLowerCase()
  const isOnline = devStatus === 'online' || normalized.is_online === true || normalized.attributes?.is_online === true
  
  const speed = normalized.speed || 0
  const ignition = (normalized.ignition || '').toLowerCase()

  if (!isOnline) {
    normalized.status = 'offline'
  } else if (normalized.status === 'in_transit' || speed > 0) {
    normalized.status = 'in_transit'
  } else if (ignition === 'on' || ignition === '1' || (normalized.engine_rpm ?? 0) > 0) {
    normalized.status = 'idle'
  } else if (ignition === 'off' || ignition === '0') {
    normalized.status = 'parked'
  } else {
    normalized.status = 'online'
  }

  normalized.is_online = isOnline

  // Ensure coordinate consistency for map components
  if (normalized.latitude !== undefined) normalized.lat = normalized.latitude
  if (normalized.longitude !== undefined) normalized.lng = normalized.longitude
  
  // Ensure numeric fields are actually numbers if they came as unit strings or similar
  if (typeof normalized.speed === 'string') normalized.speed = parseFloat(normalized.speed) || 0
  if (typeof normalized.heading === 'string') normalized.heading = parseFloat(normalized.heading) || 0

  // Normalize movement/ignition binary variants ("1"/"0") to "on"/"off" for consistent drawer display
  if (normalized.movement === '1') normalized.movement = 'on'
  else if (normalized.movement === '0') normalized.movement = 'off'
  if (normalized.ignition === '1') normalized.ignition = 'on'
  else if (normalized.ignition === '0') normalized.ignition = 'off'

  return normalized
}
