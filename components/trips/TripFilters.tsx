"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface TripFilters {
  status?: string;
}

interface TripFiltersProps {
  filters: TripFilters;
  onFiltersChange: (filters: TripFilters) => void;
}

const TRIP_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
];

export function TripFilters({ filters, onFiltersChange }: TripFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      status: status === "all" ? undefined : status,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    onFiltersChange({});
    setIsOpen(false);
  };

  const activeLabel = TRIP_STATUSES.find((s) => s.value === filters.status)?.label;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full sm:w-auto text-slate-600 border-slate-200 h-10 relative"
        >
          <Filter className="mr-2 h-4 w-4" />
          All Statuses
          {filters.status && (
            <Badge
              variant="default"
              className="ml-2 bg-blue-600 px-2 h-5 flex items-center justify-center rounded-full text-[10px] capitalize"
            >
              {activeLabel}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">Status</span>
            {filters.status && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-6 w-6 p-0 hover:bg-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleStatusChange("all")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                !filters.status
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              All Statuses
            </button>
            {TRIP_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  filters.status === s.value
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
