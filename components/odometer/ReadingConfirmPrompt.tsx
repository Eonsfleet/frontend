import React from 'react'
import { Button } from '@/components/ui/button'
import type { ReadingPrompt } from '@/hooks/useReadingSubmit'

const COPY: Record<ReadingPrompt, { title: string; body: string; action: string }> = {
    large_jump: {
        title: 'This reading is far above what the tracker recorded',
        body: 'Check the dashboard again. If the number is right, confirm it and it will be checked and recorded.',
        action: 'Yes, the reading is correct',
    },
    zero: {
        title: 'The reading is 0',
        body: 'A reading of 0 is only valid when the dashboard really shows 0.',
        action: 'Yes, the dashboard shows 0',
    },
}

/** The server asked for a confirmation before taking the reading. */
export function ReadingConfirmPrompt({
    prompt, onConfirm, onCancel, busy,
}: { prompt: ReadingPrompt; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
    const c = COPY[prompt]
    return (
        <div role="alertdialog" aria-label={c.title} data-testid="reading-confirm" className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">{c.title}</p>
            <p className="text-xs">{c.body}</p>
            <div className="flex gap-2">
                <Button size="sm" onClick={onConfirm} disabled={busy}>{c.action}</Button>
                <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
            </div>
        </div>
    )
}
