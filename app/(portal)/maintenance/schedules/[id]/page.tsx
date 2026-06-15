'use client'

import { useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScheduleDetailContent } from '@/components/maintenance/ScheduleDetailContent'

export default function MaintenanceScheduleDetailPage() {
    const { id } = useParams<{ id: string }>()

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* ── Top nav bar ── */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-3 flex items-center gap-3 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" asChild>
                    <Link href="/maintenance/schedules">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-1.5">
                    <Link href="/maintenance" className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                        Maintenance
                    </Link>
                    <ChevronRight className="h-3 w-3 text-slate-200" />
                    <Link href="/maintenance/schedules" className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                        Schedules
                    </Link>
                    <ChevronRight className="h-3 w-3 text-slate-200" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        Detail
                    </span>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 flex flex-col">
                <ScheduleDetailContent scheduleId={id} mode="page" />
            </div>
        </div>
    )
}
