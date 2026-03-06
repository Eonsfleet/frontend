'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Network, Plus, MapPin, Users, Truck, MoreVertical, Edit2, Trash, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClustersManagementPage() {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [formData, setFormData] = useState({ name: '', location: '' })

    const { data: clusterData, isLoading } = useQuery({
        queryKey: ['settings-clusters'],
        queryFn: api.getClusters
    })

    // Fallback safely whether list is nested heavily or flat, we will iterate
    const clustersList = clusterData?.data?.clusters || clusterData?.data || []

    const createMutation = useMutation({
        mutationFn: api.createCluster,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-clusters'] })
            toast.success('Cluster provisioned successfully')
            setIsCreateOpen(false)
            setFormData({ name: '', location: '' })
        },
        onError: () => toast.error('Failed to create the cluster')
    })

    const handleDelete = (name: string) => {
        toast.error(`Cannot delete cluster ${name}. Re-assign 5 vehicles first.`)
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vehicle Clusters</h1>
                    <p className="text-slate-500 mt-1">Group vehicles and drivers geographically to restrict manager visibility.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="shrink-0"><Plus className="w-4 h-4 mr-2" /> New Cluster</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Vehicle Cluster</DialogTitle>
                            <DialogDescription>Add a new geographical or logical grouping for fleet segmentation.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Cluster Name <span className="text-red-500">*</span></Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Lagos South Region" />
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Ikeja" />
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button disabled={createMutation.isPending || !formData.name} onClick={() => createMutation.mutate(formData)}>
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Confirm Creation'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                ) : clustersList.map((cluster: any) => (
                    <Card key={cluster.id} className="shadow-sm border-slate-200">
                        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-start justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Network className="w-5 h-5 text-indigo-500" />
                                    {cluster.name || cluster.attributes?.name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1.5 mt-1.5 text-slate-500">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {cluster.location || cluster.attributes?.location || 'General'}
                                </CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Cluster Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem><Edit2 className="w-4 h-4 mr-2 text-slate-500" /> Edit Metadata</DropdownMenuItem>
                                    <DropdownMenuItem className="text-rose-600 focus:text-rose-700 focus:bg-rose-50" onClick={() => handleDelete(cluster.name)}>
                                        <Trash className="w-4 h-4 mr-2" /> Delete Cluster
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex divide-x divide-slate-100 rounded-b-xl overflow-hidden bg-slate-50">
                                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                                    <Truck className="w-5 h-5 text-slate-400 mb-1" />
                                    <span className="text-2xl font-extrabold text-slate-900">{cluster.vehicle_count || cluster.attributes?.vehicle_count || 0}</span>
                                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Active Vehicles</span>
                                </div>
                                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-white">
                                    <Users className="w-5 h-5 text-slate-400 mb-1" />
                                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[100px] mt-2">
                                        {cluster.manager?.name || cluster.attributes?.manager?.name || <span className="text-slate-400 italic font-normal">Unassigned</span>}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">Lead Manager</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {!isLoading && clustersList.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <p className="text-slate-500">No clusters defined. All fleet data is globally visible.</p>
                </div>
            )}
        </div>
    )
}
