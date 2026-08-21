'use client'

import { useEffect, useRef } from 'react'
import { getBatchJobStatus } from '@/lib/api/import-export'
import { useImportExportStore } from '@/store/importExportStore'

const POLL_INTERVAL_MS = 2500
const MAX_CONSECUTIVE_ERRORS = 5
const MAX_JOB_DURATION_MS = 15 * 60 * 1000 // 15 minutes

// Polls every in-flight batch job in the global store until it completes or
// fails. Lives for as long as the widget is mounted (i.e. app-wide), so
// progress keeps updating across route changes.
export function useBatchJobPolling() {
  const jobs = useImportExportStore((s) => s.jobs)
  const updateJob = useImportExportStore((s) => s.updateJob)
  const timers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    const processingIds = new Set(jobs.filter((j) => j.status === 'processing').map((j) => j.id))

    // Stop polling anything that's no longer processing (completed/failed/
    // dismissed) or that dropped out of the store entirely.
    timers.current.forEach((timerId, jobId) => {
      if (!processingIds.has(jobId)) {
        clearInterval(timerId)
        timers.current.delete(jobId)
      }
    })

    jobs
      .filter((j) => j.status === 'processing')
      .forEach((job) => {
        if (timers.current.has(job.id)) return

        let consecutiveErrors = 0

        const timerId = setInterval(async () => {
          if (Date.now() - job.startedAt > MAX_JOB_DURATION_MS) {
            clearInterval(timerId)
            timers.current.delete(job.id)
            updateJob(job.id, {
              status: 'failed',
              error: 'Timed out waiting for the job to finish.',
              finishedAt: Date.now(),
            })
            return
          }

          try {
            const result = await getBatchJobStatus(job.batchId)
            consecutiveErrors = 0

            if (result.status === 'completed') {
              clearInterval(timerId)
              timers.current.delete(job.id)
              updateJob(job.id, { status: 'completed', progress: 100, finishedAt: Date.now() })
            } else if (result.status === 'failed') {
              clearInterval(timerId)
              timers.current.delete(job.id)
              updateJob(job.id, {
                status: 'failed',
                error: result.message || 'The job failed to complete.',
                finishedAt: Date.now(),
              })
            } else {
              updateJob(job.id, { progress: result.progress })
            }
          } catch {
            // Tolerate transient network blips, but don't poll forever if the
            // status endpoint keeps failing (e.g. batch id no longer valid).
            consecutiveErrors += 1
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              clearInterval(timerId)
              timers.current.delete(job.id)
              updateJob(job.id, {
                status: 'failed',
                error: 'Lost connection while checking progress.',
                finishedAt: Date.now(),
              })
            }
          }
        }, POLL_INTERVAL_MS)

        timers.current.set(job.id, timerId)
      })
  }, [jobs, updateJob])

  // Belt-and-braces: clear every outstanding timer if the widget itself
  // unmounts (e.g. hot reload), so nothing keeps polling in the background.
  useEffect(() => {
    const timerMap = timers.current
    return () => {
      timerMap.forEach((timerId) => clearInterval(timerId))
      timerMap.clear()
    }
  }, [])
}
