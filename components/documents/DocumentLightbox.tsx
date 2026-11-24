'use client'

import React, { useEffect, useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
    Download,
    ExternalLink,
    FileQuestion,
    FileText,
    RotateCw,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadDocument } from '@/lib/api/documents'
import type { Document } from '@/lib/api/documents'

type PreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'unsupported'

const EXTENSION_KINDS: Record<string, PreviewKind> = {
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', avif: 'image', bmp: 'image',
    pdf: 'pdf',
    mp4: 'video', webm: 'video', mov: 'video', ogv: 'video',
    mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio',
    txt: 'text', csv: 'text', json: 'text', log: 'text', md: 'text',
}

function getExtension(path?: string | null): string {
    if (!path) return ''
    const clean = path.split('?')[0].split('#')[0]
    const dot = clean.lastIndexOf('.')
    return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase()
}

function resolveKind(path?: string | null): PreviewKind {
    return EXTENSION_KINDS[getExtension(path)] ?? 'unsupported'
}

const MAX_TEXT_BYTES = 2 * 1024 * 1024

interface DocumentLightboxProps {
    doc: Document | null
    onClose: () => void
}

export function DocumentLightbox({ doc, onClose }: DocumentLightboxProps) {
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [text, setText] = useState<string | null>(null)
    const [failed, setFailed] = useState(false)
    const [attempt, setAttempt] = useState(0)

    // The document is displayed straight from its stored file path.
    const filePath = doc?.attributes.file_path || null
    const kind = resolveKind(filePath)
    // PDF/text are embedded or fetched, which the storage host blocks; route those through our proxy.
    const proxiedPath = filePath ? `/api/document-file?url=${encodeURIComponent(filePath)}` : null

    // Reset view state whenever a different document is opened.
    useEffect(() => {
        setZoom(1)
        setRotation(0)
        setText(null)
        setFailed(false)
        setAttempt(0)
    }, [doc?.id])

    useEffect(() => {
        if (!filePath || !proxiedPath || kind !== 'text') return
        let cancelled = false
        fetch(proxiedPath!)
            .then((r) => {
                if (!r.ok) throw new Error(String(r.status))
                return r.text()
            })
            .then((t) => {
                if (cancelled) return
                setText(t.length > MAX_TEXT_BYTES ? `${t.slice(0, MAX_TEXT_BYTES)}\n\n… preview truncated, download for the full file` : t)
            })
            .catch(() => !cancelled && setFailed(true))
        return () => {
            cancelled = true
        }
    }, [filePath, kind, attempt])

    const markFailed = () => setFailed(true)

    const title = doc?.attributes.title || 'Document'
    const isImage = kind === 'image'

    return (
        <DialogPrimitive.Root open={!!doc} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    className="fixed inset-0 z-50 flex flex-col outline-none"
                >
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 px-4 py-3 text-white shrink-0">
                        <FileText className="h-4 w-4 shrink-0 opacity-70" />
                        <DialogPrimitive.Title className="text-sm font-semibold truncate flex-1">{title}</DialogPrimitive.Title>

                        {isImage && !failed && (
                            <>
                                <ToolbarButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
                                    <ZoomOut className="h-4 w-4" />
                                </ToolbarButton>
                                <span className="text-xs tabular-nums w-10 text-center opacity-80">{Math.round(zoom * 100)}%</span>
                                <ToolbarButton label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
                                    <ZoomIn className="h-4 w-4" />
                                </ToolbarButton>
                                <ToolbarButton label="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)}>
                                    <RotateCw className="h-4 w-4" />
                                </ToolbarButton>
                            </>
                        )}
                        {filePath && (kind === 'pdf' || isImage) && (
                            <ToolbarButton label="Open in new tab" onClick={() => window.open(filePath, '_blank', 'noopener')}>
                                <ExternalLink className="h-4 w-4" />
                            </ToolbarButton>
                        )}
                        {doc && (
                            <ToolbarButton
                                label="Download"
                                onClick={() => downloadDocument(doc.id, doc.attributes.title || undefined)}
                            >
                                <Download className="h-4 w-4" />
                            </ToolbarButton>
                        )}
                        <DialogPrimitive.Close asChild>
                            <ToolbarButton label="Close">
                                <X className="h-5 w-5" />
                            </ToolbarButton>
                        </DialogPrimitive.Close>
                    </div>

                    {/* Stage: clicking the backdrop (outside the media) closes */}
                    <div
                        className="flex-1 min-h-0 flex items-center justify-center px-4 pb-4"
                        onClick={(e) => e.target === e.currentTarget && onClose()}
                    >
                        {!filePath ? (
                            <Message title="This document has no file attached" />
                        ) : failed ? (
                            <Message
                                title="Couldn't display this document"
                                action={
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setFailed(false)
                                                setAttempt((n) => n + 1)
                                            }}
                                        >
                                            Try again
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => window.open(filePath, '_blank', 'noopener')}>
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open in new tab
                                        </Button>
                                    </div>
                                }
                            />
                        ) : kind === 'image' ? (
                            <div className="w-full h-full overflow-auto flex" onClick={(e) => e.target === e.currentTarget && onClose()}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    key={attempt}
                                    src={filePath}
                                    alt={title}
                                    draggable={false}
                                    onError={markFailed}
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transition: 'transform 150ms ease',
                                    }}
                                    className="m-auto max-w-full max-h-full object-contain rounded-md"
                                />
                            </div>
                        ) : kind === 'pdf' ? (
                            <iframe
                                key={attempt}
                                src={proxiedPath ?? undefined}
                                title={title}
                                className="w-full h-full max-w-5xl rounded-md bg-white"
                            />
                        ) : kind === 'video' ? (
                            <video key={attempt} src={filePath} controls autoPlay onError={markFailed} className="max-w-full max-h-full rounded-md" />
                        ) : kind === 'audio' ? (
                            <audio key={attempt} src={filePath} controls autoPlay onError={markFailed} />
                        ) : kind === 'text' ? (
                            <pre className="w-full h-full max-w-4xl overflow-auto rounded-md bg-white p-4 text-xs text-slate-800 whitespace-pre-wrap break-words">
                                {text ?? 'Loading…'}
                            </pre>
                        ) : (
                            <Message
                                title="No preview available for this file type"
                                description={getExtension(filePath) ? `.${getExtension(filePath)} files can't be previewed in the browser.` : undefined}
                                action={
                                    doc && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => downloadDocument(doc.id, doc.attributes.title || undefined)}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    )
                                }
                            />
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}

const ToolbarButton = React.forwardRef<
    HTMLButtonElement,
    { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ToolbarButton({ label, children, ...props }, ref) {
    return (
        <button
            ref={ref}
            type="button"
            title={label}
            aria-label={label}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            {...props}
        >
            {children}
        </button>
    )
})

function Message({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-3 text-center text-white">
            <FileQuestion className="h-10 w-10 opacity-60" />
            <p className="text-sm font-semibold">{title}</p>
            {description && <p className="text-xs opacity-70">{description}</p>}
            {action}
        </div>
    )
}
