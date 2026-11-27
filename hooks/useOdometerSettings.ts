import { useQuery } from '@tanstack/react-query'
import { getOdometerSettings } from '@/lib/api/odometer'
import type { DistanceUnit } from '@/types/odometer'

/**
 * The organisation's odometer settings. Only users with the configure permission can read them
 * (the contract has no lighter endpoint), so a 403 is expected and simply means "use km / defaults".
 */
export function useOdometerSettings(enabled = true) {
    return useQuery({
        queryKey: ['odometer-settings'],
        queryFn: getOdometerSettings,
        enabled,
        retry: false,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Default unit for entry. The vehicle's odometer block always carries `unit` (the organisation's unit), so it is
 * used first and the settings endpoint (which needs configure_odometer) is only asked when there is no vehicle yet.
 */
export function useDefaultDistanceUnit(vehicleUnit?: DistanceUnit | null): DistanceUnit {
    const { data } = useOdometerSettings(!vehicleUnit)
    return vehicleUnit ?? data?.distance_unit ?? 'km'
}
