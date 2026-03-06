'use client'

import React from 'react'
import { MaintenanceKanban } from '@/components/maintenance/MaintenanceKanban'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { useQuery } from '@tanstack/react-query'
import { getMaintenanceJobs } from '@/lib/api/maintenance'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft, Filter, Search } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

export default function MaintenanceJobsPage() {
    const [search, setSearch] = React.useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['maintenance-jobs'],
        queryFn: () => getMaintenanceJobs(),
    })

    const filteredJobs = React.useMemo(() => {
        if (!data?.data?.jobs) return []
        if (!search) return data.data.jobs

        return data.data.jobs.filter(job =>
            job.attributes.reference_number.toLowerCase().includes(search.toLowerCase()) ||
            job.attributes.description.toLowerCase().includes(search.toLowerCase()) ||
            job.relationships.vehicle?.data?.id.toLowerCase().includes(search.toLowerCase())
        )
    }, [data, search])

    return (
        <UpgradeGate
            module="maintenance"
            featureName="Maintenance Workflows"
            description="Advanced maintenance tracking with job approval boards, parts tracking, cost summaries, and discussion threads. Stay organized and minimize vehicle downtime."
            requiredPlan="growth"
        >
            <div className="p-8 space-y-6 bg-slate-50 min-h-full">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="rounded-full">
                            <Link href="/maintenance">
                                <ArrowLeft className="h-5 w-5 text-slate-500" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Board</h1>
                            <p className="text-slate-500 mt-1">Manage maintenance tasks through their lifecycle.</p>
                        </div>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> Create Job
                    </Button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search reference, description, or vehicle..."
                            className="pl-9 bg-slate-50 border-transparent focus:bg-white transition-colors h-10 w-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" className="w-full sm:w-auto text-slate-600 border-slate-200">
                            <Filter className="mr-2 h-4 w-4" /> Priority
                        </Button>
                        <Button variant="outline" className="w-full sm:w-auto text-slate-600 border-slate-200">
                            Mechanic
                        </Button>
                    </div>
                </div>

                {/* Kanban Board Area */}
                <div className="mt-4">
                    <MaintenanceKanban
                        jobs={filteredJobs}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </UpgradeGate>
    )
}
