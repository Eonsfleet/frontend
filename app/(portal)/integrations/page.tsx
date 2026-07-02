'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getWebhooks, WebhookEndpoint } from '@/lib/api/webhooks'
import { WebhookTable } from '@/components/integrations/WebhookTable'
import { WebhookFormDialog } from '@/components/integrations/WebhookFormDialog'
import { QueryError } from '@/components/shared/QueryError'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plug, Plus } from 'lucide-react'

export default function IntegrationsPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingWebhook, setEditingWebhook] = React.useState<WebhookEndpoint | null>(null)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['webhooks'],
        queryFn: () => getWebhooks(),
    })

    const webhooks = data?.data ?? []

    const handleAdd = () => {
        setEditingWebhook(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (webhook: WebhookEndpoint) => {
        setEditingWebhook(webhook)
        setIsDialogOpen(true)
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integrations</h1>
                    <p className="text-slate-500 mt-1">Send real-time fleet events to external systems via webhooks.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" /> Add Webhook
                </Button>
            </div>

            {isError && <QueryError message="Failed to load webhooks." onRetry={refetch} />}

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            ) : !isError && webhooks.length === 0 ? (
                <div className="py-20 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Plug className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">No integrations yet</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                        Add a webhook to notify your own systems in real time when trips, incidents, maintenance, or
                        device events happen in your fleet.
                    </p>
                    <Button className="mt-6 bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>
                        <Plus className="mr-2 h-4 w-4" /> Add Webhook
                    </Button>
                </div>
            ) : (
                <WebhookTable data={webhooks} onEdit={handleEdit} />
            )}

            <WebhookFormDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false)
                    setEditingWebhook(null)
                }}
                initialData={editingWebhook}
            />
        </div>
    )
}
