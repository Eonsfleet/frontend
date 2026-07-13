'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * DateRangePicker
 *
 * Trigger button + popover range calendar. Fully controlled — parent owns the
 * `value`, this component only proposes changes via `onChange` (fired on Apply,
 * not on every click, so callers aren't re-fetching data mid-selection).
 *
 * Timezone note: this operates on local Date objects (browser timezone). If
 * you're querying trips against telemetry stored in UTC / af-south-1, convert
 * at the API boundary, not here — this component should stay timezone-naive
 * and just reflect what the user clicked.
 */

export interface DateRange {
    start: Date;
    end: Date;
}

export interface DateRangePreset {
    label: string;
    getRange: () => DateRange;
}

export interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    presets?: DateRangePreset[];
}

// ---- date helpers (no external date lib — see tradeoff note in the writeup) ----

function startOfDay(d: Date): Date {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
}
function endOfDay(d: Date): Date {
    const r = new Date(d);
    r.setHours(23, 59, 0, 0);
    return r;
}
function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}
function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
    return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isWithin(d: Date, a: Date, b: Date): boolean {
    const t = startOfDay(d).getTime();
    return t >= startOfDay(a).getTime() && t <= startOfDay(b).getTime();
}
function formatDateTime(d: Date): string {
    const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateFmt.format(d)} ${timeFmt.format(d)}`;
}
function toTimeInputValue(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function applyTimeString(d: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const r = new Date(d);
    r.setHours(h ?? 0, m ?? 0, 0, 0);
    return r;
}

function getMonthWeeks(year: number, month: number): (Date | null)[][] {
    const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [
        ...Array(firstWeekday).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}

const DEFAULT_PRESETS: DateRangePreset[] = [
    { label: 'Today', getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
    { label: 'Yesterday', getRange: () => ({ start: startOfDay(addDays(new Date(), -1)), end: endOfDay(addDays(new Date(), -1)) }) },
    { label: 'Last 7 days', getRange: () => ({ start: startOfDay(addDays(new Date(), -6)), end: endOfDay(new Date()) }) },
    { label: 'Last 30 days', getRange: () => ({ start: startOfDay(addDays(new Date(), -29)), end: endOfDay(new Date()) }) },
    { label: 'This month', getRange: () => ({ start: startOfMonth(new Date()), end: endOfDay(new Date()) }) },
    {
        label: 'Last month',
        getRange: () => {
            const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
            return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        },
    },
];

export function DateRangePicker({ value, onChange, presets = DEFAULT_PRESETS }: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [draftStart, setDraftStart] = useState<Date>(value.start);
    const [draftEnd, setDraftEnd] = useState<Date>(value.end);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [selecting, setSelecting] = useState<'start' | 'end'>('start');
    const [viewMonth, setViewMonth] = useState(new Date(value.start.getFullYear(), value.start.getMonth(), 1));

    const containerRef = useRef<HTMLDivElement>(null);

    // reset draft state whenever the popover opens, so a cancelled edit doesn't leak
    useEffect(() => {
        if (open) {
            setDraftStart(value.start);
            setDraftEnd(value.end);
            setSelecting('start');
            setViewMonth(new Date(value.start.getFullYear(), value.start.getMonth(), 1));
        }
    }, [open, value.start, value.end]);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    function handleDayClick(day: Date) {
        if (selecting === 'start') {
            // preserve whatever time-of-day was already set
            const withTime = applyTimeString(day, toTimeInputValue(draftStart));
            setDraftStart(withTime);
            setDraftEnd(withTime);
            setSelecting('end');
        } else {
            const withTime = applyTimeString(day, toTimeInputValue(draftEnd));
            if (withTime.getTime() < draftStart.getTime()) {
                // clicked before the start date — treat it as the new start
                setDraftStart(withTime);
                setDraftEnd(draftStart);
            } else {
                setDraftEnd(withTime);
            }
            setSelecting('start');
        }
    }

    function handleApply() {
        onChange({ start: draftStart, end: draftEnd });
        setOpen(false);
    }

    function handlePreset(preset: DateRangePreset) {
        const range = preset.getRange();
        setDraftStart(range.start);
        setDraftEnd(range.end);
        setViewMonth(new Date(range.start.getFullYear(), range.start.getMonth(), 1));
    }

    const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    const rangeStart = draftStart < draftEnd ? draftStart : draftEnd;
    const rangeEnd = draftStart < draftEnd ? draftEnd : draftStart;
    const previewEnd = hoverDate && selecting === 'end' && hoverDate > rangeStart ? hoverDate : rangeEnd;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
                {formatDateTime(value.start)} - {formatDateTime(value.end)}
                <CalendarIcon className="h-4 w-4 text-gray-400" />
            </button>

            {open && (
                <div className="absolute left-0 z-30 mt-2 flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    {/* Presets */}
                    <div className="w-40 border-r border-gray-100 py-2">
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => handlePreset(preset)}
                                className="block w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-4">
                        {/* Month navigation */}
                        <div className="mb-2 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                                className="rounded p-1 hover:bg-gray-100"
                                aria-label="Previous month"
                            >
                                <ChevronLeft className="h-4 w-4 text-gray-500" />
                            </button>
                            <div className="flex gap-16 text-sm font-medium text-gray-900">
                                <span>{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                <span>{nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                                className="rounded p-1 hover:bg-gray-100"
                                aria-label="Next month"
                            >
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Two-month grid */}
                        <div className="flex gap-6">
                            {[viewMonth, nextMonth].map((month) => (
                                <table key={month.toISOString()} className="border-collapse text-sm">
                                    <thead>
                                        <tr>
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                                <th key={i} className="w-8 pb-1 text-xs font-normal text-gray-400">
                                                    {d}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getMonthWeeks(month.getFullYear(), month.getMonth()).map((week, wi) => (
                                            <tr key={wi}>
                                                {week.map((day, di) => {
                                                    if (!day) return <td key={di} className="h-8 w-8" />;
                                                    const isStart = isSameDay(day, rangeStart);
                                                    const isEnd = isSameDay(day, previewEnd);
                                                    const inRange = isWithin(day, rangeStart, previewEnd);
                                                    return (
                                                        <td key={di} className="h-8 w-8 p-0 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDayClick(day)}
                                                                onMouseEnter={() => setHoverDate(day)}
                                                                className={[
                                                                    'h-8 w-8 rounded-full text-sm transition-colors',
                                                                    isStart || isEnd
                                                                        ? 'bg-blue-600 text-white'
                                                                        : inRange
                                                                            ? 'bg-blue-50 text-blue-700'
                                                                            : 'text-gray-700 hover:bg-gray-100',
                                                                ].join(' ')}
                                                            >
                                                                {day.getDate()}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ))}
                        </div>

                        {/* Time inputs + actions */}
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                            <div className="flex items-center gap-3 text-sm">
                                <label className="flex items-center gap-1.5 text-gray-500">
                                    Start
                                    <input
                                        type="time"
                                        value={toTimeInputValue(draftStart)}
                                        onChange={(e) => setDraftStart(applyTimeString(draftStart, e.target.value))}
                                        className="rounded border border-gray-200 px-2 py-1 text-gray-700"
                                    />
                                </label>
                                <label className="flex items-center gap-1.5 text-gray-500">
                                    End
                                    <input
                                        type="time"
                                        value={toTimeInputValue(draftEnd)}
                                        onChange={(e) => setDraftEnd(applyTimeString(draftEnd, e.target.value))}
                                        className="rounded border border-gray-200 px-2 py-1 text-gray-700"
                                    />
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DateRangePicker;