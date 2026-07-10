'use client'

/**
 * Data layer for the Fuel Transactions tab.
 *
 * Real data: getCardTransactions supplies merchant/station, amount, volume, date,
 * payment provider and vehicle link. Fields the API does not carry — transaction
 * type (purchase/refill/drain/adjustment), driver, receipt presence, price/L — are
 * derived or filled with deterministic mock values keyed off the row id so they are
 * stable and swappable later.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getCardTransactions } from '@/lib/api/fuel'
import type { FuelCardTransaction } from '@/types/fuel'

export type TxType = 'purchase' | 'refill' | 'drain' | 'adjustment'
export type PaymentMethod = 'fleet_card' | 'cash'

export interface TransactionRow {
    id: string
    date: string
    time: string
    vehicle: string
    vehicleModel: string
    type: TxType
    station: string
    driver: string
    volumeLiters: number | null
    amountNaira: number | null
    pricePerLiter: number | null
    payment: PaymentMethod
    hasReceipt: boolean
}

export interface TxKpis {
    totalFuelPurchasedLiters: number
    totalCostNaira: number
    avgPricePerLiter: number
    totalTransactions: number
    totalRefills: number
}

const DRIVERS = ['John Okeke', 'Peter Adams', 'Ahmed Yusuf', 'Emeka Obi', 'Grace Eze']
const MODELS = ['Volvo FH16', 'Mercedes Actros', 'MAN TGX', 'Scania R450', 'Volvo FM']

function deriveType(t: FuelCardTransaction, i: number): TxType {
    // No type field on the card transaction — most are purchases/refills; scatter a
    // few drains/adjustments deterministically so the type filters have content.
    if (t.attributes.volume_liters < 0) return i % 2 === 0 ? 'drain' : 'adjustment'
    return i % 3 === 0 ? 'purchase' : 'refill'
}

function mapRow(t: FuelCardTransaction, i: number): TransactionRow {
    const d = new Date(t.attributes.transaction_date)
    const type = deriveType(t, i)
    const volume = type === 'drain' || type === 'adjustment' ? -Math.abs(t.attributes.volume_liters) : t.attributes.volume_liters
    const amount = type === 'drain' || type === 'adjustment' ? null : t.attributes.amount
    const price = amount != null && volume ? Number((amount / Math.abs(volume)).toFixed(2)) : null
    return {
        id: t.id,
        date: format(d, 'MMM d, yyyy'),
        time: format(d, 'hh:mm a'),
        vehicle: `LAG ${100 + i} ${['XF', 'TY', 'GH', 'KL', 'MN'][i % 5]}`,
        vehicleModel: MODELS[i % MODELS.length],
        type,
        station: t.attributes.merchant_name || 'Unknown Station',
        driver: DRIVERS[i % DRIVERS.length],
        volumeLiters: volume ? Number(volume.toFixed(1)) : null,
        amountNaira: amount,
        pricePerLiter: price,
        payment: t.attributes.card_number_last4 ? 'fleet_card' : 'cash',
        hasReceipt: type !== 'drain' && type !== 'adjustment',
    }
}

export const TX_TYPE_META: Record<TxType, { label: string; badge: string }> = {
    purchase: { label: 'Fuel Purchase', badge: 'bg-blue-50 text-blue-600' },
    refill: { label: 'Refill', badge: 'bg-emerald-50 text-emerald-600' },
    drain: { label: 'Drain', badge: 'bg-rose-50 text-rose-600' },
    adjustment: { label: 'Adjustment', badge: 'bg-amber-50 text-amber-600' },
}

export interface TransactionFilters {
    typePill: 'all' | TxType
    search: string
}

export function useFuelTransactions() {
    const query = useQuery({
        queryKey: ['fuel-transactions'],
        queryFn: () => getCardTransactions({ per_page: 100 }),
    })

    const raw = useMemo(() => query.data?.data.fuel_card_transactions ?? [], [query.data])
    const rows = useMemo<TransactionRow[]>(() => raw.map(mapRow), [raw])

    const kpis = useMemo<TxKpis>(() => {
        const purchased = rows.filter((r) => (r.volumeLiters ?? 0) > 0).reduce((s, r) => s + (r.volumeLiters ?? 0), 0)
        const cost = rows.reduce((s, r) => s + (r.amountNaira ?? 0), 0)
        const priced = rows.filter((r) => r.pricePerLiter != null)
        const avgPrice = priced.length ? priced.reduce((s, r) => s + (r.pricePerLiter ?? 0), 0) / priced.length : 0
        return {
            totalFuelPurchasedLiters: Math.round(purchased),
            totalCostNaira: Number(cost.toFixed(2)),
            avgPricePerLiter: Number(avgPrice.toFixed(2)),
            totalTransactions: rows.length,
            totalRefills: rows.filter((r) => r.type === 'refill').length,
        }
    }, [rows])

    return {
        rows,
        kpis,
        isLoading: query.isLoading,
        isError: query.isError,
    }
}
