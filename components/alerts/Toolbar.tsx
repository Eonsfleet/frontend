'use client';

import { Filter, Share, Bell } from 'lucide-react';
import { DateRangePicker, type DateRange } from '../shared/DateRangePicker';

/**
 * Toolbar
 *
 * Action bar sitting under the page header — date range, filters, export, alerts.
 * Pure presentation + callbacks. Filter state and the actual export/alert logic
 * belong in the parent (or a page-level store) — this component doesn't know
 * what a "trip" is. Date range picking is delegated to DateRangePicker, which
 * owns its own popover/calendar state internally and only calls back on Apply.
 */

export type { DateRange };

export interface ToolbarProps {
    dateRange: DateRange;
    onDateRangeChange: (range: DateRange) => void;
    activeFilterCount?: number;
    onFiltersClick?: () => void;
    onExportClick?: () => void;
    exportDisabled?: boolean;
    onConfigureAlertsClick?: () => void;
}

export function Toolbar({
    dateRange,
    onDateRangeChange,
    activeFilterCount = 0,
    onFiltersClick,
    onExportClick,
    exportDisabled = false,
    onConfigureAlertsClick,
}: ToolbarProps) {
    return (
        <div className="flex items-center justify-end gap-2 px-6 py-3">
            <DateRangePicker value={dateRange} onChange={onDateRangeChange} />

            <div className="flex items-center gap-2">
                {/* Filters */}
                <button
                    type="button"
                    onClick={onFiltersClick}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-600 bg-white px-3 py-2 text-sm text-blue-600 hover:bg-gray-50"
                >
                    <Filter className="h-4 w-4 transition-colors text-blue-600" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {/* Export */}
                <button
                    type="button"
                    onClick={onExportClick}
                    disabled={exportDisabled}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Share className="h-4 w-4 text-gray-400" />
                    Export
                </button>

                {/* Configure alerts — primary action */}
                <button
                    type="button"
                    onClick={onConfigureAlertsClick}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Bell className="h-4 w-4" />
                    Configure Alerts
                </button>
            </div>
        </div>
    );
}

export default Toolbar;