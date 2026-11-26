import apiClient from './client'
import type {
    ImportConfirmResult,
    ImportPreview,
    MileageConfigPayload,
    OdometerEvidence,
    OdometerReading,
    OdometerReview,
    OdometerSettings,
    ReviewListStatus,
    SubmitReadingPayload,
    SubmitReadingResult,
    VehicleOdometer,
    CapacityState,
} from '@/types/odometer'

interface Pagination {
    current: number
    lastPage: number
    total: number
    perPage: number
}

/** Vehicle ids in these routes are the vehicle uuid, as for the rest of the vehicle API. */
export const submitOdometerReading = async (
    vehicleId: string | number,
    payload: SubmitReadingPayload,
): Promise<SubmitReadingResult> => {
    const res = await apiClient.post<{ data: SubmitReadingResult }>(`/vehicles/${vehicleId}/odometer-readings`, payload)
    return res.data.data
}

export const uploadOdometerEvidence = async (
    vehicleId: string | number,
    file: File,
    kind: OdometerEvidence['kind'] = 'dashboard_photo',
): Promise<OdometerEvidence> => {
    const body = new FormData()
    body.append('file', file)
    body.append('kind', kind)
    const res = await apiClient.post<{ data: { evidence: OdometerEvidence } }>(
        `/vehicles/${vehicleId}/odometer-evidence`,
        body,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data.data.evidence
}

/**
 * Uploads the dashboard photo first (if any), then submits the reading with the evidence id.
 * A failed upload stops before any reading is created.
 */
export const submitReadingWithEvidence = async (
    vehicleId: string | number,
    payload: SubmitReadingPayload,
    photo?: File | null,
): Promise<SubmitReadingResult> => {
    let evidence_ids = payload.evidence_ids
    if (photo) {
        const ev = await uploadOdometerEvidence(vehicleId, photo, 'dashboard_photo')
        evidence_ids = [...(evidence_ids ?? []), ev.id]
    }
    return submitOdometerReading(vehicleId, { ...payload, ...(evidence_ids ? { evidence_ids } : {}) })
}

export const getVehicleOdometer = async (vehicleId: string | number) => {
    const res = await apiClient.get<{
        data: { odometer: VehicleOdometer; segments: Record<string, unknown>[] }
    }>(`/vehicles/${vehicleId}/odometer`)
    return res.data.data
}

export const listOdometerReadings = async (
    vehicleId: string | number,
    params: { status?: string; page?: number; perPage?: number } = {},
) => {
    const res = await apiClient.get<{ data: { readings: OdometerReading[]; pagination: Pagination } }>(
        `/vehicles/${vehicleId}/odometer-readings`,
        { params },
    )
    return res.data.data
}

export interface ListReviewsParams {
    status?: ReviewListStatus
    level?: 'organisation' | 'support'
    vehicle_id?: number | string
    page?: number
}

export const listOdometerReviews = async (params: ListReviewsParams = {}) => {
    const res = await apiClient.get<{ data: { reviews: OdometerReview[]; pagination: Pagination } }>(
        '/odometer-reviews',
        { params },
    )
    return res.data.data
}

export const getOdometerReview = async (id: number | string) => {
    const res = await apiClient.get<{ data: { review: OdometerReview } | OdometerReview }>(`/odometer-reviews/${id}`)
    const d = res.data.data as { review?: OdometerReview } & OdometerReview
    // The contract does not say whether the review is wrapped; accept both.
    return d.review ?? (d as OdometerReview)
}

export const decideOdometerReview = async (id: number | string, decision: 'approve' | 'reject', reason: string) => {
    const res = await apiClient.post<{ data: { review: OdometerReview } | OdometerReview }>(
        `/odometer-reviews/${id}/${decision}`,
        { reason },
    )
    const d = res.data.data as { review?: OdometerReview } & OdometerReview
    return d.review ?? (d as OdometerReview)
}

export const getOdometerSettings = async (): Promise<OdometerSettings> => {
    const res = await apiClient.get<{ data: { settings?: OdometerSettings } & OdometerSettings }>(
        '/organization/odometer-settings',
    )
    return res.data.data.settings ?? res.data.data
}

export const updateOdometerSettings = async (payload: Partial<OdometerSettings>): Promise<OdometerSettings> => {
    const res = await apiClient.put<{ data: { settings?: OdometerSettings } & OdometerSettings }>(
        '/organization/odometer-settings',
        payload,
    )
    return res.data.data.settings ?? res.data.data
}

export const setOdometerCapacity = async (
    vehicleId: string | number,
    payload: { capacity_km: number | null; state: Exclude<CapacityState, 'assumed_default'> },
) => {
    const res = await apiClient.patch<{ data: unknown }>(`/vehicles/${vehicleId}/odometer-capacity`, payload)
    return res.data.data
}

export const previewOdometerImport = async (file: File): Promise<ImportPreview> => {
    const body = new FormData()
    body.append('file', file)
    const res = await apiClient.post<{ data: ImportPreview }>('/odometer-readings/import/preview', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
}

export const confirmOdometerImport = async (importId: string): Promise<ImportConfirmResult> => {
    const res = await apiClient.post<{ data: ImportConfirmResult }>('/odometer-readings/import/confirm', {
        import_id: importId,
    })
    return res.data.data
}

export const saveMileageConfig = async (scheduleId: string | number, payload: MileageConfigPayload) => {
    const { confirm_overdue, confirm_postpone, ...rest } = payload
    const res = await apiClient.put<{ data: unknown }>(`/maintenance/schedules/${scheduleId}/mileage-config`, {
        ...rest,
        ...(confirm_overdue ? { confirm_overdue: true } : {}),
        ...(confirm_postpone ? { confirm_postpone: true } : {}),
    })
    return res.data.data
}
