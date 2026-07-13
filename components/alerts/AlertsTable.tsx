'use client'

import React from 'react'
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    CheckCircle2,
    MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichAlertItem } from './AlertsDrawer'

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
}

interface AlertsTableProps {
    filteredAlerts: RichAlertItem[]
    paginatedAlerts: RichAlertItem[]
    selectedAlertId: string
    onSelectAlert: (alert: RichAlertItem) => void
    selectedTab: 'active' | 'acknowledged' | 'resolved'
    setSelectedTab: (tab: 'active' | 'acknowledged' | 'resolved') => void
    currentPage: number
    setCurrentPage: (page: number) => void
    totalPages: number
    itemsPerPage: number
    selectedRows: string[]
    handleSelectAllRows: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleSelectRow: (id: string, checked: boolean) => void
    handleBulkResolve: () => void
    onExportClick?: () => void
}

export function AlertsTable({
    filteredAlerts,
    paginatedAlerts,
    selectedAlertId,
    onSelectAlert,
    selectedTab,
    setSelectedTab,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    selectedRows,
    handleSelectAllRows,
    handleSelectRow,
    handleBulkResolve,
    onExportClick
}: AlertsTableProps) {
    return (
        <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="px-4 pt-3 flex gap-5 border-b border-slate-100 shrink-0">
                {(['active', 'acknowledged', 'resolved'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => {
                            setSelectedTab(tab)
                            setCurrentPage(1)
                        }}
                        className={`pb-2.5 text-[13px] font-medium capitalize relative transition-colors cursor-pointer ${
                            selectedTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {tab}
                        {selectedTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Table controls */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        checked={filteredAlerts.length > 0 && selectedRows.length === filteredAlerts.length}
                        onChange={handleSelectAllRows}
                    />
                    {selectedTab === 'acknowledged' ? (
                        <Button
                            onClick={handleBulkResolve}
                            disabled={selectedRows.length === 0}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-7 disabled:opacity-40 cursor-pointer"
                        >
                            Mark as Resolved
                        </Button>
                    ) : (
                        <Button
                            onClick={onExportClick}
                            disabled={selectedRows.length === 0}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-7 disabled:opacity-40 cursor-pointer"
                        >
                            Bulk Export
                        </Button>
                    )}
                    <div className="flex items-center gap-1 text-[12px] text-slate-500 cursor-pointer select-none">
                        <span>Sort by:</span>
                        <span className="font-medium text-slate-700">Newest First</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                </div>
                <span className="text-xs text-slate-400 select-none">{selectedRows.length} selected</span>
            </div>

            {/* Table */}
            <div className="flex-grow overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-medium uppercase text-slate-400 tracking-wider sticky top-0">
                        <tr>
                            <th className="w-10 py-3 pl-4"></th>
                            <th className="py-3">Alert</th>
                            <th className="py-3">Vehicle / Asset</th>
                            <th className="py-3">Alert Time</th>
                            {selectedTab === 'acknowledged' ? (
                                <>
                                    <th className="py-3">Acknowledged By</th>
                                    <th className="py-3">Acknowledged At</th>
                                </>
                            ) : (
                                <>
                                    <th className="py-3">Resolved By</th>
                                    <th className="py-3">Resolved At</th>
                                </>
                            )}
                            <th className="w-10 py-3 pr-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[13px] text-slate-700">
                        {paginatedAlerts.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center p-4 select-none">
                                        <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
                                        <p className="text-sm font-medium text-slate-600">No {selectedTab} alerts found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedAlerts.map((alert) => {
                                const isChecked = selectedRows.includes(alert.id)
                                const isSelected = alert.id === selectedAlertId
                                return (
                                    <tr
                                        key={alert.id}
                                        onClick={() => onSelectAlert(alert)}
                                        className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${
                                            isSelected ? 'bg-blue-50/30' : ''
                                        }`}
                                    >
                                        <td className="py-2.5 pl-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                                checked={isChecked}
                                                onChange={(e) => handleSelectRow(alert.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }} className="w-1.5 h-1.5 rounded-full shrink-0" />
                                                <div>
                                                    <div className="text-slate-800 font-medium text-[13px] leading-tight">{alert.title}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        {alert.details.speed ? `Speed: ${alert.details.speed} km/h (Limit: ${alert.details.speedLimit} km/h)` : 'Alert rule breach'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-6 bg-slate-100 rounded overflow-hidden shrink-0">
                                                    <img src={alert.details.imageUrl || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=100"} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div>
                                                    <div className="text-slate-700 font-medium leading-tight">{alert.vehicleName}</div>
                                                    <div className="font-mono text-[10px] text-slate-400">{alert.vehiclePlate}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-slate-500">{alert.time}</td>
                                        {selectedTab === 'acknowledged' ? (
                                            <>
                                                <td className="py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-blue-50 text-[9px] font-medium text-blue-600 flex items-center justify-center">
                                                            {alert.ackByInitials || 'YO'}
                                                        </span>
                                                        <span className="font-medium">{alert.ackBy || 'You'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 text-slate-500">{alert.ackAt || 'May 20, 2024'}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-medium text-slate-500 flex items-center justify-center">
                                                            {alert.ackByInitials || 'YO'}
                                                        </span>
                                                        <span className="font-medium">{alert.resBy || 'You'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 text-slate-500">{alert.resAt || 'May 20, 2024'}</td>
                                            </>
                                        )}
                                        <td className="py-2.5 pr-4" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => onSelectAlert(alert)}
                                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 cursor-pointer"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 shrink-0 bg-white">
                <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-md border-slate-200 cursor-pointer" disabled={currentPage === 1} onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}>
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    {[...Array(Math.min(totalPages, 5))].map((_, idx) => {
                        const page = idx + 1
                        return (
                            <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                className={`h-7 w-7 rounded-md text-xs cursor-pointer ${
                                    currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200'
                                }`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </Button>
                        )
                    })}
                    {totalPages > 5 && <span className="text-slate-400 px-0.5 text-xs">...</span>}
                    {totalPages > 5 && (
                        <Button variant="outline" className="h-7 w-7 rounded-md text-xs border-slate-200 cursor-pointer" onClick={() => setCurrentPage(totalPages)}>
                            {totalPages}
                        </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-md border-slate-200 cursor-pointer" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
                <div className="text-[11px] text-slate-500">
                    Showing {filteredAlerts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} {selectedTab} alerts
                </div>
            </div>
        </div>
    )
}

export default AlertsTable
