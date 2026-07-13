'use client'

import React from 'react'
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    CheckCircle2,
    CircleAlert,
    AlertTriangle,
    Info
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichAlertItem } from './AlertsDrawer'

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
}

const SEVERITY_BG: Record<string, string> = {
    critical: '#fef2f2',
    warning: '#fffbeb',
    info: '#eff6ff',
}

function SeverityIcon({ severity, className = '' }: { severity: string; className?: string }) {
    if (severity === 'critical') {
        return (
            <div className={`w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 ${className}`}>
                <CircleAlert className="w-4 h-4 text-red-500" />
            </div>
        )
    }
    if (severity === 'warning') {
        return (
            <div className={`w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 ${className}`}>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
        )
    }
    return (
        <div className={`w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 ${className}`}>
            <Info className="w-4 h-4 text-blue-500" />
        </div>
    )
}

interface AlertsListProps {
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
    onMarkAllAsRead: () => void
}

export function AlertsList({
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
    onMarkAllAsRead
}: AlertsListProps) {
    return (
        <div className="w-[42%] flex flex-col h-full bg-white rounded-xl overflow-hidden shrink-0">
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

            {/* List controls */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0">
                <span className="text-[13px] font-semibold text-slate-800">
                    {filteredAlerts.length} Alerts
                </span>
                <div className="flex items-center gap-2">
                    {selectedTab === 'active' && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="text-[12px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            Mark all as read
                        </button>
                    )}
                    <div className="flex items-center gap-1 text-[12px] text-slate-500 cursor-pointer select-none">
                        <span>Sort by:</span>
                        <span className="font-medium text-slate-700">Newest First</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Alert items */}
            <div className="flex-grow overflow-y-auto">
                {paginatedAlerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-600">No active alerts</p>
                        <p className="text-xs text-slate-400 mt-1">All clean! No alerts match your filters.</p>
                    </div>
                ) : (
                    paginatedAlerts.map((alert) => {
                        const isSelected = alert.id === selectedAlertId
                        return (
                            <div
                                key={alert.id}
                                onClick={() => onSelectAlert(alert)}
                                className={`cursor-pointer px-4 py-3 flex items-start gap-3 border-b border-slate-50 transition-colors ${
                                    isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'
                                }`}
                            >
                                <SeverityIcon severity={alert.severity} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h4 className="text-[13px] font-semibold text-slate-900 leading-tight truncate">{alert.title}</h4>
                                            <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                                                {alert.vehicleName} • {alert.vehiclePlate}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <Badge
                                                style={{
                                                    color: SEVERITY_COLORS[alert.severity],
                                                    backgroundColor: SEVERITY_BG[alert.severity]
                                                }}
                                                className="text-[10px] font-medium border-none px-2 py-0.5 rounded capitalize"
                                            >
                                                {alert.severity}
                                            </Badge>
                                            <span className="text-[11px] text-slate-400 mt-1">{alert.time}</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{alert.relativeTime}</p>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 shrink-0 bg-white">
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-md border-slate-200 cursor-pointer"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    {[...Array(totalPages)].map((_, idx) => {
                        const page = idx + 1
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
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
                        }
                        if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="text-slate-400 px-0.5 text-xs">...</span>
                        }
                        return null
                    })}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-md border-slate-200 cursor-pointer"
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Showing {filteredAlerts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} alerts</span>
                    <div className="flex items-center gap-1 cursor-pointer select-none">
                        <span>{itemsPerPage} / page</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AlertsList
