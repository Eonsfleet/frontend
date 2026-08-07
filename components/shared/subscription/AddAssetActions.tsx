'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Plus, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { extractApiError } from '@/lib/utils'
import * as api from '@/lib/api/billing-groups'
import type { ManualAssetInput } from '@/types/subscription'

function ManualAddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const queryClient = useQueryClient()
    const [form, setForm] = useState<ManualAssetInput>({ assetType: 'Vehicle', label: '', registrationNumber: '', vehicleType: '' })

    const { mutate, isPending } = useMutation({
        mutationFn: () => api.addManualAsset(form),
        onSuccess: () => {
            toast.success(`${form.label || 'Asset'} added — it's now eligible for billing.`)
            queryClient.invalidateQueries({ queryKey: ['eligible-assets'] })
            setForm({ assetType: 'Vehicle', label: '', registrationNumber: '', vehicleType: '' })
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err, 'Failed to add asset.')),
    })

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Asset Manually</DialogTitle>
                    <DialogDescription>Register a new asset that isn&apos;t billed anywhere yet.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Asset type</Label>
                        <select
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={form.assetType}
                            onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value as ManualAssetInput['assetType'] }))}
                        >
                            <option value="Vehicle">Vehicle</option>
                            <option value="Device">Device</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input placeholder="e.g. Delivery Van 12" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Registration number</Label>
                        <Input placeholder="e.g. ABC-123" value={form.registrationNumber} onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Vehicle type</Label>
                        <Input placeholder="e.g. Truck, Van" value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        disabled={isPending || !form.label.trim() || !form.registrationNumber.trim()}
                        onClick={() => mutate()}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Asset
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ImportAssetsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const queryClient = useQueryClient()
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { mutate, isPending } = useMutation({
        mutationFn: () => api.importEligibleAssets(file!),
        onSuccess: (res) => {
            toast.success(`${res.importedCount} asset${res.importedCount === 1 ? '' : 's'} imported — now eligible for billing.`)
            queryClient.invalidateQueries({ queryKey: ['eligible-assets'] })
            setFile(null)
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err, 'Import failed. Please check the file format and try again.')),
    })

    const selectFile = (nextFile: File | undefined) => {
        if (!nextFile) return
        const ext = nextFile.name.split('.').pop()?.toLowerCase()
        if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
            toast.error('Only CSV, XLS, and XLSX files are accepted.')
            return
        }
        setFile(nextFile)
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Assets</DialogTitle>
                    <DialogDescription>Upload a file of your own assets to bring them into EonsFleet unbilled.</DialogDescription>
                </DialogHeader>

                <div
                    className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                        isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); selectFile(e.dataTransfer.files[0]) }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => selectFile(e.target.files?.[0])}
                    />
                    {file ? (
                        <div className="space-y-2">
                            <FileSpreadsheet className="mx-auto h-10 w-10 text-blue-500" />
                            <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB &middot; Click to change</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Upload className="mx-auto h-10 w-10 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">Drop your file here</p>
                            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">CSV &middot; XLSX &middot; XLS accepted</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        disabled={!file || isPending}
                        onClick={() => mutate()}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Bring-your-own-asset entry points shared by the Add Assets and POC conversion
// wizards: users pick from already-unbilled eligible assets, or add new ones
// via import file / manual entry — never from the full billed fleet.
export function AddAssetActions() {
    const [importOpen, setImportOpen] = useState(false)
    const [manualOpen, setManualOpen] = useState(false)

    return (
        <>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4" /> Import
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setManualOpen(true)}>
                    <Plus className="h-4 w-4" /> Add Manually
                </Button>
            </div>
            <ImportAssetsDialog open={importOpen} onClose={() => setImportOpen(false)} />
            <ManualAddDialog open={manualOpen} onClose={() => setManualOpen(false)} />
        </>
    )
}
