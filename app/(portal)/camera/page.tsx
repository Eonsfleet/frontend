'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, CameraOff } from 'lucide-react'

export default function CameraPage() {
    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Camera</h1>
                <p className="text-slate-500 mt-1">View live and recorded footage from fleet dashcams and installed cameras.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search cameras..."
                        className="pl-9 bg-slate-50 border-slate-200 h-10"
                        disabled
                    />
                </div>
            </div>

            <div className="py-20 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <CameraOff className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No cameras connected</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                    Connect a dashcam or fleet camera device to start viewing live and recorded footage here.
                </p>
                <Button className="mt-6" disabled title="Coming soon">
                    Connect Camera
                </Button>
                <p className="text-xs text-slate-400 mt-2">Coming soon</p>
            </div>
        </div>
    )
}
