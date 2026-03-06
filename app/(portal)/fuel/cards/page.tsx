'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, RefreshCw, Key, Settings2, Plus, CheckCircle2, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

export default function FuelCardsPage() {
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['fuel-card-providers'],
        queryFn: () => api.getFuelCardProviders(),
    })

    const { mutate: handleSync, isPending: isSyncing } = useMutation({
        mutationFn: (id: string) => api.syncFuelCardProvider(id),
        onSuccess: () => {
            toast.success('Synchronization triggered successfully.')
            queryClient.invalidateQueries({ queryKey: ['fuel-card-providers'] })
        },
        onError: () => toast.error('Failed to trigger synchronization.')
    })

    const getProviderLogo = (type: string) => {
        switch (type) {
            case 'total':
                return (
                    <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider shadow-inner">
                        Total
                    </div>
                )
            case 'ovh':
                return (
                    <div className="w-12 h-12 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider shadow-inner">
                        OVH
                    </div>
                )
            default:
                return (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-100 shadow-inner">
                        <CreditCard className="w-6 h-6" />
                    </div>
                )
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Card Providers</h1>
                    <p className="text-slate-500 mt-1">Configure and synchronize external fuel card accounts.</p>
                </div>
                <Button variant="outline" className="shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Provider
                </Button>
            </div>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center bg-transparent border border-dashed border-slate-300 rounded-xl">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
            ) : data?.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500">
                    <CreditCard className="h-10 w-10 text-slate-300 mb-4" />
                    <p className="font-medium text-slate-900">No Providers Configured</p>
                    <p className="text-sm mt-1">Integrate your first fuel card provider to start tracking expenses automatically.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {data?.data?.map((provider) => (
                        <Card key={provider.id} className="shadow-sm border-slate-200 flex flex-col hover:shadow-md transition-shadow">
                            <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-start justify-between pb-4">
                                <div className="flex items-center gap-4">
                                    {getProviderLogo(provider.attributes.provider_type)}
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-900">{provider.attributes.name}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className={`text-[10px] uppercase tracking-wider border-none px-2 py-0.5
                                                ${provider.attributes.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                {provider.attributes.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Automated Sync</span>
                                        <span className="text-sm font-medium text-slate-800">
                                            {provider.attributes.auto_sync_enabled ? 'Enabled (Nightly)' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">API Authentication</span>
                                        <span className="text-sm font-medium text-slate-800 flex items-center">
                                            {provider.attributes.api_key_configured ? (
                                                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> Configured</>
                                            ) : (
                                                <><AlertCircle className="w-3.5 h-3.5 text-rose-500 mr-1.5" /> Missing Keys</>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 text-sm">
                                    <p className="text-slate-500 flex items-center justify-between">
                                        <span>Last synchronized</span>
                                        <span className="font-medium text-slate-900">
                                            {provider.attributes.last_sync_at
                                                ? `${formatDistanceToNow(new Date(provider.attributes.last_sync_at))} ago`
                                                : 'Never'}
                                        </span>
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/80 border-t border-slate-100 p-4 flex gap-3">
                                <Button
                                    className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                                    variant="outline"
                                    onClick={() => handleSync(provider.id)}
                                    disabled={isSyncing || !provider.attributes.api_key_configured}
                                >
                                    {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                    Trigger Sync
                                </Button>
                                <Button size="icon" variant="outline" className="shrink-0 text-slate-500 hover:text-slate-900" title="Provider Settings">
                                    <Settings2 className="w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
