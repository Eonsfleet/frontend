'use client'

import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Upload, Download, X, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useImportExportStore, type BatchJob } from '@/store/importExportStore'
import { useBatchJobPolling } from '@/hooks/useBatchJobPolling'

export function ImportExportProgress() {
  useBatchJobPolling()

  const jobs = useImportExportStore((s) => s.jobs)
  const isMinimized = useImportExportStore((s) => s.isMinimized)
  const setMinimized = useImportExportStore((s) => s.setMinimized)
  const dismissJob = useImportExportStore((s) => s.dismissJob)

  if (jobs.length === 0) return null

  const activeCount = jobs.filter((j) => j.status === 'processing').length
  // A finished job can still need attention (failed, or completed with nothing
  // actually imported) -- "complete" would overstate that, so the header only
  // claims success when every finished job's outcome backs it up.
  const needsAttention = jobs.some(
    (j) => j.status === 'failed' || (j.status === 'completed' && (j.outcome === 'empty' || j.outcome === 'partial')),
  )

  return (
    <div className="fixed bottom-5 right-5 z-[60] w-[340px] max-w-[calc(100vw-2.5rem)]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
        <button
          type="button"
          onClick={() => setMinimized(!isMinimized)}
          className="flex w-full items-center justify-between gap-2 bg-slate-50/70 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            {activeCount > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#0055FF]" />
            ) : needsAttention ? (
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-[11px] font-black uppercase italic tracking-wide text-slate-900">
              {activeCount > 0
                ? `${activeCount} job${activeCount > 1 ? 's' : ''} in progress`
                : needsAttention
                  ? 'Job Update'
                  : 'Jobs Complete'}
            </span>
          </div>
          {isMinimized ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {!isMinimized && (
          <div className="max-h-[320px] space-y-0.5 overflow-y-auto px-2 py-2">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onDismiss={() => dismissJob(job.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function JobRow({ job, onDismiss }: { job: BatchJob; onDismiss: () => void }) {
  const Icon = job.kind === 'import' ? Upload : Download
  // A completed job with outcome 'empty' or 'partial' did not fully succeed even
  // though it finished running, so it's flagged like a warning rather than a plain
  // success — same treatment as ImportDialog's result screens.
  const isWarning = job.status === 'completed' && (job.outcome === 'empty' || job.outcome === 'partial')

  return (
    <div className="rounded-xl px-2 py-2.5 hover:bg-slate-50">
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            job.status === 'failed'
              ? 'bg-rose-50 text-rose-500'
              : job.status === 'completed'
                ? isWarning
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
                : 'bg-blue-50 text-[#0055FF]',
          )}
        >
          {job.status === 'failed' ? (
            <XCircle className="h-3.5 w-3.5" />
          ) : job.status === 'completed' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-slate-900">{job.label}</p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="shrink-0 text-slate-300 hover:text-slate-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {job.status === 'processing' && (
            <div className="mt-1.5 space-y-1">
              <Progress value={job.progress} className="h-1.5 rounded-full" />
              <p className="text-[10px] text-slate-400">{job.progress}%</p>
            </div>
          )}

          {job.status === 'completed' && (
            <p className={cn('mt-0.5 text-[11px]', isWarning ? 'text-amber-600' : 'text-emerald-600')}>
              {job.error ?? (job.outcome === 'empty' ? 'Nothing was imported.' : 'Completed successfully.')}
            </p>
          )}

          {job.status === 'failed' && (
            <p className="mt-0.5 text-[11px] text-rose-600">{job.error ?? 'Something went wrong.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
