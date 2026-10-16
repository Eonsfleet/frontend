import { create } from 'zustand'
import type { BatchJobOutcome } from '@/lib/api/import-export'

export type BatchJobKind = 'import' | 'export'
// Which endpoint reports this job's progress. Imports are addressed by their own
// numeric record id and exports by a batch UUID; the two id spaces are not
// interchangeable, so a job carries the one it belongs to.
export type BatchJobSource = 'batch' | 'data_import'
export type BatchJobStatus = 'processing' | 'completed' | 'failed'

export interface BatchJob {
  id: string
  source: BatchJobSource
  sourceId: string
  kind: BatchJobKind
  label: string
  status: BatchJobStatus
  // Only meaningful once status === 'completed': whether rows were actually
  // created/updated, not just whether the job finished running.
  outcome: BatchJobOutcome
  progress: number
  error: string | null
  startedAt: number
  finishedAt: number | null
}

interface ImportExportState {
  jobs: BatchJob[]
  isMinimized: boolean
  addJob: (job: Omit<BatchJob, 'status' | 'outcome' | 'progress' | 'error' | 'startedAt' | 'finishedAt'>) => void
  updateJob: (id: string, patch: Partial<Pick<BatchJob, 'status' | 'outcome' | 'progress' | 'error' | 'finishedAt'>>) => void
  dismissJob: (id: string) => void
  setMinimized: (minimized: boolean) => void
}

export const useImportExportStore = create<ImportExportState>((set) => ({
  jobs: [],
  isMinimized: false,

  addJob: (job) =>
    set((s) => ({
      jobs: [
        ...s.jobs,
        { ...job, status: 'processing', outcome: null, progress: 0, error: null, startedAt: Date.now(), finishedAt: null },
      ],
      isMinimized: false,
    })),

  updateJob: (id, patch) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),

  dismissJob: (id) =>
    set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),

  setMinimized: (minimized) => set({ isMinimized: minimized }),
}))
