import { useCallback, useRef, useState } from 'react'
import { apiErrorCode, submitReadingWithEvidence, type ReadingAttempt } from '@/lib/api/odometer'
import { extractApiError } from '@/lib/utils'
import type { PendingReading } from '@/lib/odometerDraft'
import type { SubmitReadingResult } from '@/types/odometer'

/** Which confirmation the server asked for before it will take the reading. */
export type ReadingPrompt = 'large_jump' | 'zero'

export const PROMPT_CODES: Record<string, ReadingPrompt> = {
    confirmation_required: 'large_jump',
    zero_requires_confirmation: 'zero',
}

/**
 * Submits one reading (photo upload, Idempotency-Key, retry) and handles the server's two confirmation
 * answers: 422 `confirmation_required` (resend with confirm_large_jump) and `zero_requires_confirmation`
 * (resend with confirm_zero). The caller shows `prompt` and calls `confirm()` or `dismiss()`.
 */
export function useReadingSubmit() {
    const [isPending, setPending] = useState(false)
    const [result, setResult] = useState<SubmitReadingResult | null>(null)
    const [error, setError] = useState<{ message: string; code: string | null } | null>(null)
    const [prompt, setPrompt] = useState<ReadingPrompt | null>(null)
    const current = useRef<{ uuid: string; reading: PendingReading; attempt: ReadingAttempt } | null>(null)

    const send = useCallback(async (flags: { confirm_large_jump?: boolean; confirm_zero?: boolean }) => {
        const c = current.current
        if (!c) return null
        setPending(true)
        setError(null)
        setPrompt(null)
        // Flags the user already gave stay on the payload for later resends.
        c.reading = { ...c.reading, payload: { ...c.reading.payload, ...flags } }
        try {
            const res = await submitReadingWithEvidence(c.uuid, c.reading.payload, c.reading.photo, c.attempt)
            setResult(res)
            return res
        } catch (e) {
            const code = apiErrorCode(e)
            if (code && PROMPT_CODES[code]) setPrompt(PROMPT_CODES[code])
            else setError({ message: extractApiError(e, 'The reading could not be submitted'), code })
            return null
        } finally {
            setPending(false)
        }
    }, [])

    const run = useCallback(
        (uuid: string, reading: PendingReading) => {
            current.current = { uuid, reading, attempt: {} }
            setResult(null)
            return send({})
        },
        [send],
    )

    const confirm = useCallback(
        () => send(prompt === 'zero' ? { confirm_zero: true } : { confirm_large_jump: true }),
        [prompt, send],
    )

    const dismiss = useCallback(() => setPrompt(null), [])
    const reset = useCallback(() => {
        current.current = null
        setResult(null)
        setError(null)
        setPrompt(null)
    }, [])

    return { run, confirm, dismiss, reset, isPending, result, error, prompt }
}
