'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import * as settingsApi from '@/lib/api/settings'
import { useClusterVehicles } from '@/hooks/useClusterFleetStats'
import { ClusterSummary } from '@/components/clusters/ClusterSummary'
import { ClusterAssetList } from '@/components/clusters/ClusterAssetList'
import { ClusterStaffList } from '@/components/clusters/ClusterStaffList'
import { matchesStatusBucket } from '@/lib/vehicleStatus'
import type { UserProfile } from '@/types/user'

export default function ClusterDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const { data: clusterResponse, isLoading: isClusterLoading, error } = useQuery({
        queryKey: ['cluster', id],
        queryFn: () => settingsApi.getCluster(id),
        enabled: !!id,
    })

    const { vehicles, isLoading: isVehiclesLoading } = useClusterVehicles(id)

    const { data: usersResponse, isLoading: isStaffLoading } = useQuery({
        queryKey: ['cluster-staff-pool'],
        queryFn: () => settingsApi.getUsers({ per_page: 100 }),
    })

    const cluster = clusterResponse?.data?.cluster
    const attr = cluster?.attributes

    const staff: UserProfile[] = (usersResponse?.data?.users || []).filter(
        (u) => String(u.relationships?.cluster?.id) === String(id),
    )

    const online = vehicles.filter((v) =>
        matchesStatusBucket('online', {
            status: v.attributes?.status,
            is_online: v.attributes?.is_online ?? false,
            speed: Number(v.relationships?.current_location?.speed ?? v.attributes?.speed ?? 0) || 0,
        }),
    ).length
    const total = vehicles.length
    const offline = total - online

    const isLoading = isClusterLoading || isVehiclesLoading

    if (isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-slate-500 font-medium text-sm">Loading cluster...</p>
            </div>
        )
    }

    if (error || !cluster) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="bg-rose-50 text-rose-600 p-4 rounded-lg inline-block font-medium">
                    Failed to load cluster data. It may have been deleted or moved.
                </div>
                <br />
                <Button onClick={() => router.back()} variant="outline">Go Back</Button>
            </div>
        )
    }

    return (
        <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/clusters')}
                    className="rounded-full hover:bg-white shadow-sm border border-transparent hover:border-slate-200"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        {attr?.name}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">{attr?.description || 'No regional description'}</p>
                </div>
            </div>

            <ClusterSummary
                total={total}
                online={online}
                offline={offline}
                totalStaff={attr?.total_users ?? staff.length}
                manager={attr?.manager ?? null}
            />

            <Tabs defaultValue="assets" className="w-full">
                <TabsList className="h-11 bg-slate-100 p-1 gap-1 rounded-full w-fit">
                    <TabsTrigger
                        value="assets"
                        className="rounded-full px-4 h-full text-slate-500 font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                    >
                        Assets ({total})
                    </TabsTrigger>
                    <TabsTrigger
                        value="staff"
                        className="rounded-full px-4 h-full text-slate-500 font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                    >
                        Staff ({staff.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="assets" className="pt-6 outline-none">
                    <ClusterAssetList vehicles={vehicles} />
                </TabsContent>

                <TabsContent value="staff" className="pt-6 outline-none">
                    {isStaffLoading ? (
                        <div className="py-16 flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <ClusterStaffList staff={staff} managerName={attr?.manager ?? null} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
