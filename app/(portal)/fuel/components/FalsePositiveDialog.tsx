'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface FalsePositiveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Vehicle/plate label of the alert being flagged, for context. */
    label?: string
    onConfirm: (notes?: string) => Promise<unknown> | void
}

export function FalsePositiveDialog({ open, onOpenChange, label, onConfirm }: FalsePositiveDialogProps) {
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Reset the note whenever the dialog reopens.
    useEffect(() => { if (open) setNotes('') }, [open])

    const submit = async () => {
        setSubmitting(true)
        try {
            await onConfirm(notes.trim() || undefined)
            onOpenChange(false)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o) }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Mark as False Positive</DialogTitle>
                    <p className="text-sm text-slate-500">
                        {label ? `Flag the alert for ${label} as a false positive.` : 'Flag this alert as a false positive.'} Add an optional note explaining why.
                    </p>
                </DialogHeader>

                <div>
                    <label htmlFor="fp-notes" className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                        Note <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                        id="fp-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="e.g. Sensor recalibrated; reading was a known glitch."
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={submit} disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mark as False Positive
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
