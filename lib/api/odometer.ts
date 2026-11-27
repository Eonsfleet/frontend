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

/** The stable `code` of an odometer error body `{ message, code, status, errors? }`, or null. */
export function apiErrorCode(e: unknown): string | null {
    const data = (e as { response?: { data?: { code?: unknown } } })?.response?.data
    return typeof data?.code === 'string' ? data.code : null
}

export function apiErrorStatus(e: unknown): number | null {
    const s = (e as { response?: { status?: unknown } })?.response?.status
    return typeof s === 'number' ? s : null
}

const newKey = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `odo-${Date.now()}-${Math.random().toString(36).slice(2)}`

/**
 * State carried across attempts at one reading: the idempotency key (reused on a retry of the same reading,
 * dropped after a 4xx because that attempt created nothing) and the evidence already uploaded (never uploaded twice).
 */
export interface ReadingAttempt {
    idempotencyKey?: string
    evidenceIds?: number[]
}

/** Vehicle ids in these routes are the vehicle uuid, as for the rest of the vehicle API. */
export const submitOdometerReading = async (
    vehicleId: string | number,
    payload: SubmitReadingPayload,
    idempotencyKey?: string,
): Promise<SubmitReadingResult> => {
    const res = await apiClient.post<{ data: SubmitReadingResult }>(
        `/vehicles/${vehicleId}/odometer-readings`,
        payload,
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
    )
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
 * Uploads the dashboard photo first (if any, once), then submits the reading with the evidence id and an
 * Idempotency-Key. A failed upload stops before any reading is created. Pass the same `attempt` object to retry.
 */
export const submitReadingWithEvidence = async (
    vehicleId: string | number,
    payload: SubmitReadingPayload,
    photo?: File | null,
    attempt: ReadingAttempt = {},
): Promise<SubmitReadingResult> => {
    if (photo && !attempt.evidenceIds) {
        const ev = await uploadOdometerEvidence(vehicleId, photo, 'dashboard_photo')
        attempt.evidenceIds = [ev.id]
    }
    const evidence_ids = [...(payload.evidence_ids ?? []), ...(attempt.evidenceIds ?? [])]
    attempt.idempotencyKey ??= newKey()
    try {
        return await submitOdometerReading(
            vehicleId,
            { ...payload, ...(evidence_ids.length ? { evidence_ids } : {}) },
            attempt.idempotencyKey,
        )
    } catch (e) {
        // A 4xx created nothing, so the next attempt (possibly with a confirmation flag) is a new submission.
        const st = apiErrorStatus(e)
        if (st !== null && st >= 400 && st < 500) delete attempt.idempotencyKey
        throw e
    }
}

/** Attaches a photo to the reading under an open review (unblocks `photo_required`). */
export const uploadReviewEvidence = async (
    reviewId: number | string,
    file: File,
    kind: OdometerEvidence['kind'] = 'dashboard_photo',
) => {
    const body = new FormData()
    body.append('file', file)
    body.append('kind', kind)
    const res = await apiClient.post<{ data: { evidence?: OdometerEvidence; review?: OdometerReview } }>(
        `/odometer-reviews/${reviewId}/evidence`,
        body,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data.data
}

/**
 * Fetches an attachment with the auth header (never a public URL) and returns it as a Blob.
 * Organisation users use /odometer-evidence/{id}/download.
 */
export const fetchEvidenceBlob = async (id: number | string): Promise<Blob> => {
    const res = await apiClient.get<Blob>(`/odometer-evidence/${id}/download`, { responseType: 'blob' })
    return res.data
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
    const res = await apiClient.get<{ data: { review: OdometerReview } }>(`/odometer-reviews/${id}`)
    return res.data.data.review
}

export const decideOdometerReview = async (id: number | string, decision: 'approve' | 'reject', reason: string) => {
    const res = await apiClient.post<{ data: { review: OdometerReview } }>(`/odometer-reviews/${id}/${decision}`, { reason })
    return res.data.data.review
}

export const getOdometerSettings = async (): Promise<OdometerSettings> => {
    const res = await apiClient.get<{ data: OdometerSettings }>('/organization/odometer-settings')
    return res.data.data
}

export const updateOdometerSettings = async (payload: Partial<OdometerSettings>): Promise<OdometerSettings> => {
    const res = await apiClient.put<{ data: OdometerSettings }>('/organization/odometer-settings', payload)
    return res.data.data
}

export const setOdometerCapacity = async (
    vehicleId: string | number,
    payload: { state: 'set'; capacity_km: number } | { state: 'none' } | { state: 'assumed_default' },
) => {
    const res = await apiClient.patch<{ data: { capacity: { km: number | null; state: CapacityState } } }>(`/vehicles/${vehicleId}/odometer-capacity`, payload)
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
