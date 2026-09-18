"use client";

import { useQuery } from "@tanstack/react-query";
import * as vehicleApi from "@/lib/api/vehicles";
import { PAGE_SIZE_DROPDOWN, STALE_TIME_STATIC } from "@/lib/config";

/**
 * Flat, unfiltered vehicle list used to populate dropdowns/selects across the
 * app (geofences, trips, incidents, maintenance, documents, etc). Every
 * caller shares this one query key so the list is fetched once and reused,
 * instead of each screen paying for its own copy under a different key.
 */
export function useVehiclesDropdown(enabled = true) {
  return useQuery({
    queryKey: ["vehicles-dropdown"],
    queryFn: () => vehicleApi.getVehicles({ per_page: PAGE_SIZE_DROPDOWN }),
    enabled,
    staleTime: STALE_TIME_STATIC,
  });
}

/** Same dropdown list, restricted to active vehicles — trip assignment only allows active fleet. */
export function useActiveVehiclesDropdown(enabled = true) {
  return useQuery({
    queryKey: ["vehicles-dropdown", { status: "active" }],
    queryFn: () => vehicleApi.getVehicles({ per_page: PAGE_SIZE_DROPDOWN, status: "active" }),
    enabled,
    staleTime: STALE_TIME_STATIC,
  });
}
