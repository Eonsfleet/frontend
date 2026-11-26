import { useQuery } from '@tanstack/react-query'
import { getOdometerSettings } from '@/lib/api/odometer'
import type { DistanceUnit } from '@/types/odometer'

/**
 * The organisation's odometer settings. Only users with the configure permission can read them
 * (the contract has no lighter endpoint), so a 403 is expected and simply means "use km / defaults".
 */
export function useOdometerSettings() {
    return useQuery({
        queryKey: ['odometer-settings'],
        queryFn: getOdometerSettings,
        retry: false,
        staleTime: 5 * 60 * 1000,
    })
}

/** Default unit for entry: the organisation's unit when known, else the vehicle's own unit, else km. */
export function useDefaultDistanceUnit(vehicleUnit?: DistanceUnit | null): DistanceUnit {
    const { data } = useOdometerSettings()
    return data?.distance_unit ?? vehicleUnit ?? 'km'
}
