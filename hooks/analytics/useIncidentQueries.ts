'use client'

import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/analyticsIncidents'
import { classifyAnalyticsError } from '@/lib/api/analyticsOverview'

/** Same defaults as the other tabs: five minutes fresh, no refetch on focus, no retry of a 402/403. */
const base = {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (count: number, error: unknown) => classifyAnalyticsError(error) === 'unavailable' && count < 1,
} as const

export const useIncidentTypes = (enabled: boolean) =>
    useQuery({ queryKey: ['analytics', 'incidents', 'types'], queryFn: api.getIncidentTypes, enabled, ...base })

export const useIncidentPriorities = (enabled: boolean) =>
    useQuery({ queryKey: ['analytics', 'incidents', 'priorities'], queryFn: api.getIncidentPriorities, enabled, ...base })

export const useIncidentResolution = (enabled: boolean) =>
    useQuery({ queryKey: ['analytics', 'incidents', 'resolution'], queryFn: api.getIncidentResolution, enabled, ...base })

export const useIncidentVehicles = (enabled: boolean) =>
    useQuery({ queryKey: ['analytics', 'incidents', 'vehicles', api.INCIDENT_VEHICLE_LIMIT], queryFn: () => api.getIncidentVehicles(), enabled, ...base })
