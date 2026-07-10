'use client'

import { Calendar, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">{label}</label>
            {children}
        </div>
    )
}

function SelectBox({ placeholder }: { placeholder: string }) {
    return (
        <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
        >
            {placeholder}
            <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
    )
}

/**
 * Visual filter sidebar matching the design. Controls are presentational for now;
 * wire them to useFuelTransactions filter state when the API supports server-side
 * filtering by driver/station/payment/amount.
 */
export function TransactionFilters() {
    return (
        <Card className="rounded-2xl border-slate-100 p-4 shadow-none">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Filters</h2>
                <button type="button" className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">
                    Clear All
                </button>
            </div>

            <div className="mt-4 space-y-3.5">
                <Field label="Date Range">
                    <button
                        type="button"
                        className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                    >
                        May 1 – May 16, 2024
                        <Calendar className="h-4 w-4 text-slate-400" />
                    </button>
                </Field>

                <Field label="Transaction Type"><SelectBox placeholder="All Types" /></Field>
                <Field label="Vehicle"><SelectBox placeholder="All Vehicles" /></Field>
                <Field label="Driver"><SelectBox placeholder="All Drivers" /></Field>
                <Field label="Fuel Station"><SelectBox placeholder="All Stations" /></Field>
                <Field label="Payment Method"><SelectBox placeholder="All Methods" /></Field>

                <Field label="Amount Range">
                    <div className="flex items-center gap-2">
                        <Input placeholder="Min Amount" className="h-9 border-slate-200 text-[13px]" aria-label="Minimum amount" />
                        <span className="text-slate-400">–</span>
                        <Input placeholder="Max Amount" className="h-9 border-slate-200 text-[13px]" aria-label="Maximum amount" />
                    </div>
                </Field>

                <div className="flex items-center justify-between pt-1">
                    <span className="text-[12px] font-semibold text-slate-600">Has Receipt</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked="false"
                        className="relative h-5 w-9 rounded-full bg-slate-200 transition-colors duration-200"
                    >
                        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200" />
                    </button>
                </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
                <button
                    type="button"
                    className="h-9 flex-1 rounded-lg bg-slate-100 text-[13px] font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-200"
                >
                    Reset
                </button>
                <button
                    type="button"
                    className="h-9 flex-1 rounded-lg bg-blue-600 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
                >
                    Apply Filters
                </button>
            </div>
        </Card>
    )
}
