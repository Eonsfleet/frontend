import apiClient from './client'

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export type ImportModel = 'Vehicle' | 'User' | 'Driver'
export type ExportFormat = 'excel' | 'csv' | 'json'
export type EntityType = 'vehicles' | 'drivers' | 'users'

export interface BatchStatus {
    id: string
    name: string
    totalJobs: number
    pendingJobs: number
    failedJobs: number
    processedJobs: number
    progress: number      // 0–100
    status: 'pending' | 'running' | 'finished' | 'cancelled' | 'failed'
    finishedAt: string | null
    cancelledAt: string | null
    createdAt: string
}

export interface ExportVehiclesParams {
    format?: ExportFormat
    status?: string
    device_status?: string
    is_allocated?: boolean
    make?: string
    model?: string
    year?: string | number
    body_type?: string
    type?: string
    fuel_type?: string
    q?: string
    columns?: string[]
}

export interface ExportUsersParams {
    format?: ExportFormat
    role?: string
    status?: string
    q?: string
    columns?: string[]
}

// -------------------------------------------------------------------------
// Import
// -------------------------------------------------------------------------

// POST /file/import returns the import record's own numeric id -- never a batch
// id -- and a progress_url pointing at that record.
export interface ImportStartedResponse {
    data_import_id: number
    status: string
    progress_url: string
}

export const importFile = async (
    model: ImportModel,
    file: File,
    onProgress?: (pct: number) => void
): Promise<ImportStartedResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

    const res = await apiClient.post('/file/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
            if (onProgress && e.total) {
                onProgress(Math.round((e.loaded * 100) / e.total))
            }
        },
    })

    return res.data.data
}

// -------------------------------------------------------------------------
// Batch polling
// -------------------------------------------------------------------------

export type RawBatchJobStatus = 'processing' | 'completed' | 'failed' | string

// A "completed" status only means the job finished running -- it says nothing
// about whether any row actually made it in. `outcome` folds the row counts in
// so callers don't have to re-derive this everywhere a result gets displayed:
//   - 'success': completed, every row succeeded
//   - 'partial': completed, some rows succeeded and some were skipped/failed
//   - 'empty':   completed, but nothing was created or updated (e.g. every row skipped)
//   - 'failed':  the job itself failed
export type BatchJobOutcome = 'success' | 'partial' | 'empty' | 'failed' | null

export interface ImportRowCounts {
    processedRows: number
    successfulRows: number
    failedRows: number
    skippedRows: number
    duplicateRows: number
    createdCount: number
    updatedCount: number
}

export interface BatchJobStatusResponse {
    status: RawBatchJobStatus
    progress: number
    message: string | null
    outcome: BatchJobOutcome
    counts: ImportRowCounts | null
}

// Generic batch job status poll (GET /batch/{id}) — used by the global
// import/export progress widget. Tolerant of the varying shapes different
// job types (fuel import, vehicle import, exports, ...) report progress in.
export const getBatchJobStatus = async (batchId: string): Promise<BatchJobStatusResponse> => {
    const res = await apiClient.get(`/batch/${batchId}`)
    const d = res.data?.data ?? res.data

    const rawStatus: string = (d.status ?? '').toLowerCase()
    const status: RawBatchJobStatus =
        rawStatus === 'processing' || rawStatus === 'pending' || rawStatus === 'running'
            ? 'processing'
            : rawStatus === 'completed' || rawStatus === 'finished' || rawStatus === 'success'
              ? 'completed'
              : rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'error'
                ? 'failed'
                : rawStatus || 'processing'

    const total = d.total_jobs ?? d.total ?? 0
    const processed = d.processed_jobs ?? d.processed ?? 0
    const progress =
        typeof d.progress === 'number'
            ? d.progress
            : total > 0
              ? Math.round((processed / total) * 100)
              : status === 'completed'
                ? 100
                : 0

    const message: string | null =
        d.error ?? d.error_message ?? d.failure_reason ?? d.message ?? null

    return { status, progress, message, outcome: null, counts: null }
}

// An import's progress lives on the import record, not on the Bus batch it
// eventually dispatches: the batch id is only written once the queued parse job
// dispatches one, and an import with no rows to queue never dispatches a batch
// at all. So imports are polled here; only exports have a batch id to poll.
export const getDataImportStatus = async (dataImportId: string): Promise<BatchJobStatusResponse> => {
    const res = await apiClient.get(`/data-imports/${dataImportId}`)
    const d = res.data?.data ?? res.data

    const rawStatus: string = (d.status ?? '').toLowerCase()
    const status: RawBatchJobStatus =
        rawStatus === 'completed' || rawStatus === 'completed_with_errors'
            ? 'completed'
            : rawStatus === 'failed'
              ? 'failed'
              : 'processing'

    // The backend can report status: 'completed' while summary.created_count and
    // summary.updated_count are both 0 -- e.g. every row was a duplicate or failed
    // validation. That is not a success story, so row counts (not just `status`)
    // decide what the user is told.
    const summary = d.summary ?? {}
    const counts: ImportRowCounts = {
        processedRows: d.processed_rows ?? 0,
        successfulRows: d.successful_rows ?? 0,
        failedRows: d.failed_rows ?? summary.invalid_count ?? 0,
        skippedRows: d.skipped_rows ?? summary.skipped_count ?? 0,
        duplicateRows: d.duplicate_rows ?? 0,
        createdCount: d.created_count ?? summary.created_count ?? 0,
        updatedCount: d.updated_count ?? summary.updated_count ?? 0,
    }
    const importedCount = counts.createdCount + counts.updatedCount
    const problemRows = counts.failedRows + counts.skippedRows + counts.duplicateRows

    const outcome: BatchJobOutcome =
        status === 'failed'
            ? 'failed'
            : status !== 'completed'
              ? null
              : importedCount === 0 && counts.processedRows > 0
                ? 'empty'
                : problemRows > 0
                  ? 'partial'
                  : 'success'

    const message: string | null =
        d.error_message ??
        (outcome === 'empty'
            ? 'Nothing was imported -- every row was skipped or failed.'
            : outcome === 'partial'
              ? `Completed with ${problemRows} skipped/failed row${problemRows === 1 ? '' : 's'}.`
              : null)

    return {
        status,
        progress: typeof d.progress_percent === 'number' ? d.progress_percent : 0,
        message,
        outcome,
        counts,
    }
}

export const getBatchStatus = async (batchId: string): Promise<BatchStatus> => {
    const res = await apiClient.get(`/batch/${batchId}`)
    const d = res.data?.data ?? res.data
    return {
        id:            d.id,
        name:          d.name,
        totalJobs:     d.total_jobs ?? d.totalJobs ?? 0,
        pendingJobs:   d.pending_jobs ?? d.pendingJobs ?? 0,
        failedJobs:    d.failed_jobs ?? d.failedJobs ?? 0,
        processedJobs: d.processed_jobs ?? d.processedJobs ?? 0,
        progress:      d.progress ?? 0,
        status:        d.status ?? (d.finished_at ? 'finished' : d.cancelled_at ? 'cancelled' : 'running'),
        finishedAt:    d.finished_at ?? d.finishedAt ?? null,
        cancelledAt:   d.cancelled_at ?? d.cancelledAt ?? null,
        createdAt:     d.created_at ?? d.createdAt ?? '',
    }
}

// -------------------------------------------------------------------------
// Template downloads
// -------------------------------------------------------------------------

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export const downloadTemplate = async (entity: EntityType): Promise<void> => {
    const paths: Record<EntityType, string> = {
        vehicles: '/vehicles/export/template',
        drivers:  '/drivers/export/template',
        users:    '/users/export/template',
    }
    const filenames: Record<EntityType, string> = {
        vehicles: 'vehicles_import_template.xlsx',
        drivers:  'drivers_import_template.xlsx',
        users:    'users_import_template.xlsx',
    }

    const res = await apiClient.get(paths[entity], { responseType: 'blob' })
    downloadBlob(res.data, filenames[entity])
}

// -------------------------------------------------------------------------
// Export downloads
// -------------------------------------------------------------------------

export const exportVehicles = async (params: ExportVehiclesParams): Promise<void> => {
    const fmt = params.format ?? 'excel'

    if (fmt === 'json') {
        const res = await apiClient.get('/vehicles/export', { params })
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        downloadBlob(blob, `vehicles_export_${Date.now()}.json`)
        return
    }

    const res = await apiClient.get('/vehicles/export', {
        params,
        responseType: 'blob',
    })
    const ext      = fmt === 'csv' ? 'csv' : 'xlsx'
    downloadBlob(res.data, `vehicles_export_${Date.now()}.${ext}`)
}

export const exportDrivers = async (params: ExportUsersParams & { role?: string }): Promise<void> => {
    const fmt = params.format ?? 'excel'

    if (fmt === 'json') {
        const res = await apiClient.get('/drivers/export', { params })
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        downloadBlob(blob, `drivers_export_${Date.now()}.json`)
        return
    }

    const res = await apiClient.get('/drivers/export', {
        params,
        responseType: 'blob',
    })
    const ext = fmt === 'csv' ? 'csv' : 'xlsx'
    downloadBlob(res.data, `drivers_export_${Date.now()}.${ext}`)
}

export const exportUsers = async (params: ExportUsersParams): Promise<void> => {
    const fmt = params.format ?? 'excel'

    if (fmt === 'json') {
        const res = await apiClient.get('/users/export', { params })
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        downloadBlob(blob, `users_export_${Date.now()}.json`)
        return
    }

    const res = await apiClient.get('/users/export', {
        params,
        responseType: 'blob',
    })
    const ext = fmt === 'csv' ? 'csv' : 'xlsx'
    downloadBlob(res.data, `users_export_${Date.now()}.${ext}`)
}
