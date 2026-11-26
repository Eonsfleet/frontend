'use client'

import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { confirmOdometerImport, previewOdometerImport } from '@/lib/api/odometer'
import { extractApiError } from '@/lib/utils'
import type { ImportConfirmResult, ImportPreview } from '@/types/odometer'

const MAX_BYTES = 10 * 1024 * 1024

/** CSV import: upload, preview with per-row validity, confirm, summary. Invalid rows never block valid rows. */
export function ReadingImport() {
    const [file, setFile] = React.useState<File | null>(null)
    const [preview, setPreview] = React.useState<ImportPreview | null>(null)
    const [result, setResult] = React.useState<ImportConfirmResult | null>(null)
    const [fileError, setFileError] = React.useState<string | null>(null)

    const previewMutation = useMutation({
        mutationFn: (f: File) => previewOdometerImport(f),
        onSuccess: p => { setPreview(p); setResult(null) },
        onError: e => toast.error(extractApiError(e, 'The file could not be read')),
    })
    const confirmMutation = useMutation({
        mutationFn: (id: string) => confirmOdometerImport(id),
        onSuccess: r => { setResult(r); setPreview(null) },
        onError: e => toast.error(extractApiError(e, 'The import could not be completed')),
    })

    const reset = () => { setFile(null); setPreview(null); setResult(null); setFileError(null) }

    if (result) {
        const s = result.summary
        return (
            <div className="space-y-4" data-testid="import-summary">
                <h2 className="text-base font-semibold">Import finished</h2>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        ['Accepted', s.accepted],
                        ['Waiting to sync', s.pending_sync],
                        ['Pending review', s.pending_review],
                        ['Failed', s.failed],
                    ].map(([label, n]) => (
                        <div key={label as string} className="rounded-md border border-slate-200 p-3">
                            <dt className="text-xs text-slate-500">{label}</dt>
                            <dd className="text-xl font-bold">{n as number}</dd>
                        </div>
                    ))}
                </dl>
                {result.failed_rows.length > 0 && (
                    <div>
                        <h3 className="mb-1 text-sm font-semibold">Rows that failed</h3>
                        <ul className="space-y-1 text-sm text-red-700">
                            {result.failed_rows.map(r => <li key={r.row}>Row {r.row}: {r.errors.join('; ')}</li>)}
                        </ul>
                    </div>
                )}
                <Button variant="outline" onClick={reset}>Import another file</Button>
            </div>
        )
    }

    if (preview) {
        const { total, valid, invalid } = preview.summary
        return (
            <div className="space-y-4">
                <p className="text-sm" data-testid="preview-summary">
                    {total} rows: <span className="font-semibold text-emerald-700">{valid} valid</span>
                    {invalid > 0 && <>, <span className="font-semibold text-red-700">{invalid} with errors</span></>}.
                    {invalid > 0 && ' Rows with errors will be skipped; the rest are still imported.'}
                </p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Row</TableHead><TableHead>Vehicle</TableHead><TableHead>Reading</TableHead>
                            <TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Errors</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {preview.rows.map(r => (
                            <TableRow key={r.row} data-testid={`import-row-${r.row}`}>
                                <TableCell>{r.row}</TableCell>
                                <TableCell>{r.registration_number ?? (r.vehicle_id != null ? `#${r.vehicle_id}` : '—')}</TableCell>
                                <TableCell>{r.value != null ? `${r.value.toLocaleString()} ${r.unit ?? ''}`.trim() : '—'}</TableCell>
                                <TableCell>{r.effective_at ? new Date(r.effective_at).toLocaleString() : '—'}</TableCell>
                                <TableCell>
                                    <Badge variant={r.status === 'valid' ? 'secondary' : 'destructive'}>{r.status === 'valid' ? 'Valid' : 'Invalid'}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-red-700">{r.errors.join('; ')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="flex gap-2">
                    <Button onClick={() => confirmMutation.mutate(preview.import_id)} disabled={valid === 0 || confirmMutation.isPending}>
                        {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import {valid} valid {valid === 1 ? 'row' : 'rows'}
                    </Button>
                    <Button variant="outline" onClick={reset} disabled={confirmMutation.isPending}>Cancel</Button>
                </div>
            </div>
        )
    }

    return (
        <form
            className="space-y-3"
            onSubmit={e => {
                e.preventDefault()
                if (!file) { setFileError('Choose a CSV file first.'); return }
                previewMutation.mutate(file)
            }}
        >
            <p className="text-sm text-slate-600">
                CSV with the header <code>registration_number,reading,unit,reading_date,note</code>. <code>unit</code> and <code>note</code> are optional;
                a <code>vehicle_id</code> column may replace <code>registration_number</code>. Every row goes through the same checks as a reading entered by hand.
            </p>
            <div className="space-y-1.5">
                <Label htmlFor="csv-file">CSV file</Label>
                <Input
                    id="csv-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={e => {
                        const f = e.target.files?.[0] ?? null
                        if (f && f.size > MAX_BYTES) { setFile(null); setFileError('The file is larger than 10 MB.'); return }
                        setFile(f); setFileError(null)
                    }}
                />
                {fileError && <p role="alert" className="text-xs text-red-600">{fileError}</p>}
            </div>
            <Button type="submit" disabled={previewMutation.isPending}>
                {previewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview
            </Button>
        </form>
    )
}
