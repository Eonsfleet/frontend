"use client";

import React from "react";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GeofenceFilterState {
  status?: true | false;
}

interface GeofenceFiltersProps {
  filters: GeofenceFilterState;
  onFiltersChange: (filters: GeofenceFilterState) => void;
}

const STATUS_OPTIONS = [
  { value: true as const, label: "Active" },
  { value: false as const, label: "Inactive" },
];

export function GeofenceFilters({ filters, onFiltersChange }: GeofenceFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (value: true | false) => {
    onFiltersChange({ status: filters.status === value ? undefined : value });
    setIsOpen(false);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFiltersChange({});
  };

  const activeLabel = STATUS_OPTIONS.find((s) => s.value === filters.status)?.label;

  return (
    <div className="flex items-center gap-3" ref={ref}>
      {/* Filter button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest",
            isOpen || filters.status !== undefined
              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
              : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600"
          )}
        >
          <Filter className="h-3 w-3" />
          Filter
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-44 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 p-2 space-y-1">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-50 mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
              {filters.status !== undefined && (
                <button
                  onClick={handleReset}
                  className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear filter"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => { onFiltersChange({}); setIsOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors",
                filters.status === undefined
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              All
            </button>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors",
                  filters.status === opt.value
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active filter badge */}
      {filters.status !== undefined && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
            {activeLabel}
          </span>
          <button
            onClick={handleReset}
            className="text-blue-400 hover:text-blue-700 transition-colors ml-0.5"
            title="Remove filter"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}
