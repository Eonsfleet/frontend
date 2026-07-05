'use client'

import { Fuel } from 'lucide-react'

export function FuelTab() {
  return (
    <div className="text-center py-10">
      <Fuel className="h-6 w-6 text-slate-200 mx-auto mb-2" />
      <p className="text-[10px] font-bold text-slate-400">Fuel data isn't available for this device yet.</p>
    </div>
  )
}
