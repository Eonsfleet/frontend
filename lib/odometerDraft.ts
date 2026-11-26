import { unitToKm } from '@/lib/odometer'
import type { DistanceUnit, ReadingKind, SubmitReadingPayload } from '@/types/odometer'

/** The contract's ceiling after conversion to km. */
export const MAX_READING_KM = 5_000_000
/** The contract: effective_at may not be more than 5 minutes in the future. */
export const MAX_FUTURE_MS = 5 * 60 * 1000

export interface ReadingDraft {
    value: string
    unit: DistanceUnit
    /** `datetime-local` value (local time, no zone). */
    effectiveAt: string
    kind: ReadingKind
    reason: string
    note: string
    photo: File | null
    /** Zero is accepted only when the user explicitly confirms it. */
    confirmZero: boolean
}

/** A reading ready to send, with the photo to upload first. */
export interface PendingReading {
    payload: SubmitReadingPayload
    photo: File | null
}

export type DraftErrors = Partial<Record<'value' | 'effectiveAt' | 'reason' | 'photo', string>>

const pad = (n: number) => String(n).padStart(2, '0')

export function toLocalInputValue(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function emptyDraft(unit: DistanceUnit = 'km', now: Date = new Date()): ReadingDraft {
    return { value: '', unit, effectiveAt: toLocalInputValue(now), kind: 'reading', reason: '', note: '', photo: null, confirmZero: false }
}

/** True when the user has entered a value; an untouched draft submits nothing. */
export function hasReadingValue(draft: ReadingDraft): boolean {
    return draft.value.trim() !== ''
}

/** Kinds that always need a dashboard photo, per the contract's high-risk cases. */
export const PHOTO_REQUIRED_KINDS: ReadingKind[] = ['dashboard_replacement', 'reset']

export type DraftResult =
    | { ok: true; reading: PendingReading | null }
    | { ok: false; errors: DraftErrors }

/**
 * Validates a draft and builds the request. Returns `reading: null` when no value was entered, which is how
 * an ordinary vehicle edit avoids ever submitting a reading.
 */
export function buildReading(draft: ReadingDraft, acceptedKm: number | null, now: Date = new Date()): DraftResult {
    if (!hasReadingValue(draft)) return { ok: true, reading: null }

    const errors: DraftErrors = {}
    const n = Number(draft.value)
    if (!Number.isFinite(n) || n < 0) {
        errors.value = 'Enter a number that is 0 or more.'
    } else if (unitToKm(n, draft.unit) > MAX_READING_KM) {
        errors.value = 'That reading is higher than any odometer can show.'
    } else if (n === 0 && !draft.confirmZero) {
        errors.value = 'Confirm that the dashboard really shows 0.'
    }

    let effectiveIso: string | undefined
    if (draft.effectiveAt) {
        const t = new Date(draft.effectiveAt)
        if (Number.isNaN(t.getTime())) errors.effectiveAt = 'Enter a valid date and time.'
        else if (t.getTime() - now.getTime() > MAX_FUTURE_MS) errors.effectiveAt = 'The reading time cannot be in the future.'
        else effectiveIso = t.toISOString()
    }

    const lower = acceptedKm !== null && Number.isFinite(n) && unitToKm(n, draft.unit) < acceptedKm
    if ((lower || draft.kind !== 'reading') && !draft.reason.trim()) {
        errors.reason = lower
            ? 'This is lower than the current odometer. Give the reason.'
            : 'Give the reason for this kind of reading.'
    }
    if (PHOTO_REQUIRED_KINDS.includes(draft.kind) && !draft.photo) {
        errors.photo = 'A dashboard photo is required for this kind of reading.'
    }

    if (Object.keys(errors).length) return { ok: false, errors }

    const payload: SubmitReadingPayload = {
        value: n,
        unit: draft.unit,
        ...(effectiveIso ? { effective_at: effectiveIso } : {}),
        kind: draft.kind,
        ...(draft.reason.trim() ? { reason: draft.reason.trim() } : {}),
        ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
    }
    return { ok: true, reading: { payload, photo: draft.photo } }
}
