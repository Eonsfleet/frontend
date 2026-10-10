'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Download, Upload, CheckCircle2, XCircle, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { downloadTemplate, importFile, getDataImportStatus, EntityType, ImportModel, ImportRowCounts } from '@/lib/api/import-export'
import { toast } from 'sonner'

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entity: EntityType
    model: ImportModel
    onComplete?: () => void
}

type Step = 'template' | 'upload' | 'processing'
// 'finished' = every row created/updated. 'finished-partial' = some rows made it
// in but others were skipped/failed/duplicates. 'finished-empty' = the job
// completed but nothing was actually created or updated (e.g. every row was a
// duplicate) -- distinct from both success and failure so the user isn't told
// "imported" when nothing changed.
type BatchStatus = 'running' | 'finished' | 'finished-partial' | 'finished-empty' | 'failed'

const ENTITY_LABELS: Record<EntityType, string> = {
    vehicles: 'Vehicles',
    drivers:  'Drivers',
    users:    'Users',
}

const ENTITY_NOTES: Record<EntityType, string[]> = {
    vehicles: [
        'IMEI column will auto-create a Device if not already in the system.',
        'Driver Email column will auto-assign the driver after vehicle creation (driver must be active).',
        'Delete the sample row before uploading.',
    ],
    drivers: [
        'A temporary password will be emailed to each driver.',
        'All imported drivers will be assigned the "driver" role automatically.',
        'Delete the sample row before uploading.',
    ],
    users: [
        'A temporary password will be emailed to each user.',
        'Set the Role column to one of: fleet_manager, dispatcher, mechanic, finance, compliance.',
        'Delete the sample row before uploading.',
    ],
}

export function ImportDialog({ open, onOpenChange, entity, model, onComplete }: ImportDialogProps) {
    const [step, setStep] = useState<Step>('template')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadPct, setUploadPct] = useState(0)
    const [batchProgress, setBatchProgress] = useState(0)
    const [batchStatus, setBatchStatus] = useState<BatchStatus>('running')
    const [resultCounts, setResultCounts] = useState<ImportRowCounts | null>(null)
    const [resultMessage, setResultMessage] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const label = ENTITY_LABELS[entity]
    const notes = ENTITY_NOTES[entity]

    const reset = () => {
        setStep('template')
        setSelectedFile(null)
        setUploadPct(0)
        setBatchProgress(0)
        setBatchStatus('running')
        setResultCounts(null)
        setResultMessage(null)
        setIsUploading(false)
        if (pollRef.current) clearInterval(pollRef.current)
    }

    const handleClose = () => {
        if (pollRef.current) clearInterval(pollRef.current)
        reset()
        onOpenChange(false)
    }

    const handleTemplateDownload = async () => {
        try {
            await downloadTemplate(entity)
            setStep('upload')
        } catch {
            toast.error('Failed to download template.')
        }
    }

    const handleFileSelect = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
            toast.error('Only CSV, XLS, and XLSX files are accepted.')
            return
        }
        setSelectedFile(file)
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFileSelect(file)
    }, [])

    const startPolling = (id: string) => {
        pollRef.current = setInterval(async () => {
            try {
                const status = await getDataImportStatus(id)
                setBatchProgress(status.progress ?? 0)

                if (status.status === 'completed') {
                    clearInterval(pollRef.current!)
                    setResultCounts(status.counts)
                    setResultMessage(status.message)
                    setBatchStatus(
                        status.outcome === 'empty' ? 'finished-empty' :
                        status.outcome === 'partial' ? 'finished-partial' :
                        'finished'
                    )
                    onComplete?.()
                } else if (status.status === 'failed') {
                    clearInterval(pollRef.current!)
                    setResultMessage(status.message)
                    setBatchStatus('failed')
                }
            } catch {
                // ignore transient errors
            }
        }, 2000)
    }

    const handleUpload = async () => {
        if (!selectedFile) return
        setIsUploading(true)
        setStep('processing')
        setBatchProgress(0)
        try {
            const result = await importFile(model, selectedFile, setUploadPct)
            startPolling(String(result.data_import_id))
        } catch {
            toast.error('Upload failed. Please check the file format and try again.')
            setIsUploading(false)
            setStep('upload')
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
            <DialogContent className="sm:max-w-[520px] rounded-3xl border-slate-200 shadow-2xl">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base font-black uppercase italic tracking-wide text-slate-900">
                        Import {label}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-slate-400 uppercase tracking-widest">
                        {step === 'template' ? 'Step 1 of 3 — Download template' :
                         step === 'upload'   ? 'Step 2 of 3 — Upload file' :
                                              'Step 3 of 3 — Processing'}
                    </DialogDescription>
                </DialogHeader>

                {step === 'template' && (
                    <div className="space-y-5 pt-2">
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                            {notes.map((note, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-slate-600">{note}</p>
                                </div>
                            ))}
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl" onClick={handleTemplateDownload}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Template &amp; Continue
                        </Button>
                        <button
                            className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2"
                            onClick={() => setStep('upload')}
                        >
                            Skip — I already have the template
                        </button>
                    </div>
                )}

                {step === 'upload' && (
                    <div className="space-y-4 pt-2">
                        <div
                            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                                isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileSelect(file)
                                }}
                            />
                            {selectedFile ? (
                                <div className="space-y-2">
                                    <FileSpreadsheet className="h-10 w-10 text-blue-500 mx-auto" />
                                    <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                                    <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB · Click to change</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="h-10 w-10 text-slate-300 mx-auto" />
                                    <p className="text-sm font-bold text-slate-600">Drop your file here</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">CSV · XLSX · XLS accepted</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep('template')}>
                                Back
                            </Button>
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl"
                                disabled={!selectedFile || isUploading}
                                onClick={handleUpload}
                            >
                                {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {isUploading ? 'Uploading...' : 'Start Import'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="space-y-6 pt-2">
                        {batchStatus === 'running' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center h-16">
                                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Processing records</span>
                                        <span>{batchProgress}%</span>
                                    </div>
                                    <Progress value={batchProgress} className="h-2 rounded-full" />
                                </div>
                                <p className="text-center text-[11px] text-slate-400">
                                    This runs in the background. You can close this dialog and the import will continue.
                                </p>
                            </div>
                        )}

                        {batchStatus === 'finished' && (
                            <div className="space-y-4 text-center">
                                <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
                                <div>
                                    <p className="font-black text-slate-900 uppercase italic">{label} Imported</p>
                                    <p className="text-[11px] text-slate-400 mt-1">All records have been processed successfully.</p>
                                </div>
                                <Badge className="bg-emerald-50 text-emerald-700 border-none">Import Complete</Badge>
                                {resultCounts && <ImportResultBreakdown counts={resultCounts} />}
                                <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleClose}>
                                    Done
                                </Button>
                            </div>
                        )}

                        {batchStatus === 'finished-partial' && (
                            <div className="space-y-4 text-center">
                                <AlertTriangle className="h-14 w-14 text-amber-500 mx-auto" />
                                <div>
                                    <p className="font-black text-slate-900 uppercase italic">{label} Partially Imported</p>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {resultMessage ?? 'Some records were created or updated, others were skipped or failed.'}
                                    </p>
                                </div>
                                <Badge className="bg-amber-50 text-amber-700 border-none">Completed with issues</Badge>
                                {resultCounts && <ImportResultBreakdown counts={resultCounts} />}
                                <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleClose}>
                                    Done
                                </Button>
                            </div>
                        )}

                        {batchStatus === 'finished-empty' && (
                            <div className="space-y-4 text-center">
                                <AlertTriangle className="h-14 w-14 text-amber-500 mx-auto" />
                                <div>
                                    <p className="font-black text-slate-900 uppercase italic">Nothing Was Imported</p>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {resultMessage ?? 'The file was processed, but no records were created or updated — every row was skipped or invalid.'}
                                    </p>
                                </div>
                                <Badge className="bg-amber-50 text-amber-700 border-none">0 records imported</Badge>
                                {resultCounts && <ImportResultBreakdown counts={resultCounts} />}
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={handleClose}>
                                        Close
                                    </Button>
                                    <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={reset}>
                                        Try a different file
                                    </Button>
                                </div>
                            </div>
                        )}

                        {batchStatus === 'failed' && (
                            <div className="space-y-4 text-center">
                                <XCircle className="h-14 w-14 text-rose-500 mx-auto" />
                                <div>
                                    <p className="font-black text-slate-900 uppercase italic">Import Failed</p>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {resultMessage ?? 'Some or all records could not be processed. Check the file and try again.'}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={handleClose}>
                                        Close
                                    </Button>
                                    <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={reset}>
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

// Row-count breakdown shown under the result banner so "completed" always comes
// with a concrete tally of what actually happened, not just a status word.
function ImportResultBreakdown({ counts }: { counts: ImportRowCounts }) {
    const items: { label: string; value: number }[] = [
        { label: 'Created', value: counts.createdCount },
        { label: 'Updated', value: counts.updatedCount },
        { label: 'Skipped', value: counts.skippedRows },
        { label: 'Duplicates', value: counts.duplicateRows },
        { label: 'Failed', value: counts.failedRows },
    ].filter((item) => item.value > 0)

    if (items.length === 0) return null

    return (
        <div className="flex flex-wrap justify-center gap-2">
            {items.map((item) => (
                <span
                    key={item.label}
                    className="text-[10px] font-bold uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1"
                >
                    {item.value} {item.label}
                </span>
            ))}
        </div>
    )
}
