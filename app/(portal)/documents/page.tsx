'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isPast, isWithinInterval, addDays } from 'date-fns'
import {
    FileText,
    Upload,
    Search,
    Download,
    Eye,
    Trash2,
    Car,
    Users,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Filter,
    Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getAllDocuments, downloadDocument, deleteDocument } from '@/lib/api/documents'
import type { Document } from '@/lib/api/documents'
import { QueryError } from '@/components/shared/QueryError'
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog'

const CATEGORY_LABELS: Record<string, string> = {
    registration: 'Registration',
    insurance: 'Insurance',
    inspection: 'Inspection',
    license: 'License',
    other: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
    registration: 'bg-blue-50 text-blue-700 border-blue-100',
    insurance: 'bg-violet-50 text-violet-700 border-violet-100',
    inspection: 'bg-amber-50 text-amber-700 border-amber-100',
    license: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    other: 'bg-slate-50 text-slate-700 border-slate-100',
}

function getDocumentStatus(doc: Document): 'active' | 'expired' | 'expiring_soon' {
    const expiry = doc.attributes.expiry_at
    if (!expiry) return 'active'
    const expiryDate = new Date(expiry)
    if (isPast(expiryDate)) return 'expired'
    if (isWithinInterval(new Date(), { start: new Date(), end: addDays(expiryDate, 0) }) &&
        isWithinInterval(expiryDate, { start: new Date(), end: addDays(new Date(), 30) })) {
        return 'expiring_soon'
    }
    return 'active'
}

export default function DocumentsPage() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [uploadOpen, setUploadOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['documents'],
        queryFn: () => getAllDocuments(),
    })

    const { mutate: doDelete, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => deleteDocument(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] })
            queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] })
            toast.success('Document deleted')
            setDeleteTarget(null)
        },
        onError: () => toast.error('Failed to delete document'),
    })

    const allDocs: Document[] = data?.data?.documents ?? []

    const filtered = useMemo(() => {
        return allDocs.filter((doc) => {
            const docStatus = getDocumentStatus(doc)
            const title = doc.attributes.title?.toLowerCase() ?? ''
            const category = doc.attributes.category?.toLowerCase() ?? ''
            const entityType = doc.attributes.type?.toLowerCase() ?? ''

            if (search && !title.includes(search.toLowerCase()) && !category.includes(search.toLowerCase())) return false
            if (typeFilter !== 'all' && entityType !== typeFilter) return false
            if (categoryFilter !== 'all' && category !== categoryFilter) return false
            if (statusFilter !== 'all') {
                if (statusFilter === 'expiring_soon' && docStatus !== 'expiring_soon') return false
                if (statusFilter === 'expired' && docStatus !== 'expired') return false
                if (statusFilter === 'active' && docStatus !== 'active') return false
            }
            return true
        })
    }, [allDocs, search, typeFilter, categoryFilter, statusFilter])

    const stats = useMemo(() => {
        const total = allDocs.length
        const expired = allDocs.filter(d => getDocumentStatus(d) === 'expired').length
        const expiring = allDocs.filter(d => getDocumentStatus(d) === 'expiring_soon').length
        const active = allDocs.filter(d => getDocumentStatus(d) === 'active').length
        return { total, expired, expiring, active }
    }, [allDocs])

    return (
        <div className="space-y-6 p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage vehicle and driver documents across your fleet
                    </p>
                </div>
                <Button onClick={() => setUploadOpen(true)} className="shrink-0">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Documents"
                    value={stats.total}
                    icon={FileText}
                    color="blue"
                />
                <StatCard
                    label="Active"
                    value={stats.active}
                    icon={CheckCircle2}
                    color="emerald"
                />
                <StatCard
                    label="Expiring Soon"
                    value={stats.expiring}
                    icon={Clock}
                    color="amber"
                    onClick={() => setStatusFilter('expiring_soon')}
                    clickable
                />
                <StatCard
                    label="Expired"
                    value={stats.expired}
                    icon={AlertTriangle}
                    color="rose"
                    onClick={() => setStatusFilter('expired')}
                    clickable
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search documents…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-36">
                            <Filter className="mr-1 h-3 w-3 text-slate-400" />
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="vehicle">Vehicle</SelectItem>
                            <SelectItem value="driver">Driver</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="registration">Registration</SelectItem>
                            <SelectItem value="insurance">Insurance</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                            <SelectItem value="license">License</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                    </Select>

                    {(typeFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all' || search) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch('')
                                setTypeFilter('all')
                                setCategoryFilter('all')
                                setStatusFilter('all')
                            }}
                            className="text-slate-500"
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Document List */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
            ) : isError ? (
                <QueryError message="Failed to load documents." onRetry={refetch} />
            ) : filtered.length === 0 ? (
                <EmptyState hasFilters={!!(search || typeFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all')} onUpload={() => setUploadOpen(true)} />
            ) : (
                <div className="grid gap-3">
                    {filtered.map((doc) => (
                        <DocumentRow
                            key={doc.id}
                            doc={doc}
                            onDelete={() => setDeleteTarget(doc)}
                        />
                    ))}
                </div>
            )}

            {/* Upload Dialog */}
            <DocumentUploadDialog
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
            />

            {/* Delete Confirmation */}
            <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Document</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deleteTarget?.attributes.title || 'this document'}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteTarget && doDelete(deleteTarget.id)}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function StatCard({
    label,
    value,
    icon: Icon,
    color,
    onClick,
    clickable,
}: {
    label: string
    value: number
    icon: React.ElementType
    color: 'blue' | 'emerald' | 'amber' | 'rose'
    onClick?: () => void
    clickable?: boolean
}) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 ring-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        amber: 'bg-amber-50 text-amber-600 ring-amber-100',
        rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    }
    return (
        <Card
            className={cn('shadow-sm border-slate-200', clickable && 'cursor-pointer hover:border-slate-300 transition-colors')}
            onClick={onClick}
        >
            <CardContent className="p-5 flex items-center gap-4">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center ring-4', colors[color])}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-2xl font-black text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                </div>
            </CardContent>
        </Card>
    )
}

function DocumentRow({ doc, onDelete }: { doc: Document; onDelete: () => void }) {
    const docStatus = getDocumentStatus(doc)
    const isVehicle = doc.attributes.type === 'vehicle'
    const category = doc.attributes.category ?? 'other'
    const expiryDate = doc.attributes.expiry_at ? new Date(doc.attributes.expiry_at) : null

    const statusStyle = {
        active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        expiring_soon: 'bg-amber-50 text-amber-700 border-amber-100',
        expired: 'bg-rose-50 text-rose-700 border-rose-100',
    }[docStatus]

    const statusLabel = {
        active: 'Active',
        expiring_soon: 'Expiring Soon',
        expired: 'Expired',
    }[docStatus]

    const entityLabel = isVehicle
        ? doc.relationships?.belong_to
            ? `${doc.relationships.belong_to.make} ${doc.relationships.belong_to.model} · ${doc.relationships.belong_to.registration_number}`
            : 'Vehicle'
        : doc.relationships?.uploaded_by
            ? `${doc.relationships.uploaded_by.f_name} ${doc.relationships.uploaded_by.l_name}`
            : 'Driver'

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
            {/* Icon */}
            <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                <FileText className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-900 truncate">
                        {doc.attributes.title || CATEGORY_LABELS[category] || 'Document'}
                    </p>
                    <Badge variant="outline" className={cn('text-[10px] font-bold uppercase h-4 px-1.5', CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other)}>
                        {CATEGORY_LABELS[category] ?? category}
                    </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        {isVehicle ? <Car className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                        {entityLabel}
                    </span>
                    {expiryDate && (
                        <span className="text-[11px] text-slate-400">
                            Expires {format(expiryDate, 'dd MMM yyyy')}
                        </span>
                    )}
                    {doc.attributes.issued_at && (
                        <span className="text-[11px] text-slate-400">
                            Issued {format(new Date(doc.attributes.issued_at), 'dd MMM yyyy')}
                        </span>
                    )}
                </div>
            </div>

            {/* Status + Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={cn('text-[10px] font-bold uppercase', statusStyle)}>
                    {statusLabel}
                </Badge>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                        title="View"
                        onClick={() => doc.attributes.file_path && window.open(doc.attributes.file_path, '_blank')}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                        title="Download"
                        onClick={() => downloadDocument(doc.id, doc.attributes.title || undefined)}
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        title="Delete"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function EmptyState({ hasFilters, onUpload }: { hasFilters: boolean; onUpload: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
                {hasFilters ? 'No documents match your filters' : 'No documents yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-xs">
                {hasFilters
                    ? 'Try adjusting your search or filters.'
                    : 'Upload vehicle registrations, insurance certificates, and inspection reports.'}
            </p>
            {!hasFilters && (
                <Button onClick={onUpload}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload First Document
                </Button>
            )}
        </div>
    )
}
