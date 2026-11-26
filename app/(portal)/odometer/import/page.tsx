'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ReadingImport } from '@/components/odometer/ReadingImport'

export default function OdometerImportPage() {
    return (
        <div className="max-w-4xl space-y-4 p-6">
            <Link href="/odometer/reviews" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                <ChevronLeft className="h-4 w-4" /> Odometer reviews
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Import dashboard readings</h1>
            <ReadingImport />
        </div>
    )
}
