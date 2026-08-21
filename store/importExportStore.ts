import { create } from 'zustand'

export type BatchJobKind = 'import' | 'export'
export type BatchJobStatus = 'processing' | 'completed' | 'failed'

export interface BatchJob {
  id: string
  batchId: string
  kind: BatchJobKind
  label: string
  status: BatchJobStatus
  progress: number
  error: string | null
  startedAt: number
  finishedAt: number | null
}

interface ImportExportState {
  jobs: BatchJob[]
  isMinimized: boolean
  addJob: (job: Omit<BatchJob, 'status' | 'progress' | 'error' | 'startedAt' | 'finishedAt'>) => void
  updateJob: (id: string, patch: Partial<Pick<BatchJob, 'status' | 'progress' | 'error' | 'finishedAt'>>) => void
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
        { ...job, status: 'processing', progress: 0, error: null, startedAt: Date.now(), finishedAt: null },
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
