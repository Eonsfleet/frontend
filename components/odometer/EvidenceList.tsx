'use client'

import React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { apiErrorCode, fetchEvidenceBlob } from '@/lib/api/odometer'
import { extractApiError } from '@/lib/utils'
import type { OdometerEvidence } from '@/types/odometer'

const KIND_LABEL: Record<string, string> = { dashboard_photo: 'Dashboard photo', document: 'Document' }

/**
 * Attachments of a reading or review. Opening one fetches it as a blob with the auth header
 * (never a public URL), then opens it in a new tab or, for non-viewable types, downloads it.
 */
export function EvidenceList({ evidence }: { evidence: Pick<OdometerEvidence, 'id' | 'kind' | 'mime' | 'created_at'>[] | null | undefined }) {
    const [busy, setBusy] = React.useState<number | null>(null)
    if (!evidence || evidence.length === 0) return <span className="text-slate-500">None</span>

    const open = async (ev: (typeof evidence)[number]) => {
        setBusy(ev.id)
        try {
            const blob = await fetchEvidenceBlob(ev.id)
            const url = URL.createObjectURL(blob)
            const viewable = (ev.mime ?? blob.type ?? '').startsWith('image/') || (ev.mime ?? blob.type) === 'application/pdf'
            if (viewable) {
                window.open(url, '_blank', 'noopener')
            } else {
                const a = document.createElement('a')
                a.href = url
                a.download = `odometer-evidence-${ev.id}`
                a.click()
            }
            setTimeout(() => URL.revokeObjectURL(url), 60_000)
        } catch (e) {
            const code = apiErrorCode(e)
            toast.error(`${extractApiError(e, 'The attachment could not be opened')}${code ? ` (${code})` : ''}`)
        } finally {
            setBusy(null)
        }
    }

    return (
        <ul className="space-y-1" data-testid="evidence-list">
            {evidence.map(ev => (
                <li key={ev.id} className="flex items-center gap-2 text-sm">
                    <span>{KIND_LABEL[ev.kind] ?? ev.kind}</span>
                    <span className="text-xs text-slate-400">{new Date(ev.created_at).toLocaleDateString()}</span>
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs" disabled={busy === ev.id} onClick={() => open(ev)}>
                        {busy === ev.id ? 'Opening...' : 'Open'}
                    </Button>
                </li>
            ))}
        </ul>
    )
}
