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

export interface DriverFilters {
  status?: string;
}

interface DriverFiltersProps {
  filters: DriverFilters;
  onFiltersChange: (filters: DriverFilters) => void;
}

export function DriverFilters({
  filters,
  onFiltersChange,
}: DriverFiltersProps) {
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

  const getStatusLabel = (status?: string) => {
    if (!status) return "all";
    return status;
  };

  const statusLabel = getStatusLabel(filters.status);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full sm:w-auto text-slate-600 border-slate-200 h-10 relative"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filter
          {filters.status && (
            <Badge
              variant="default"
              className="ml-2 bg-blue-600 px-2 h-5 flex items-center justify-center rounded-full text-[10px] capitalize"
            >
              {statusLabel.replace("_", " ")}
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
            <button
              onClick={() => handleStatusChange("active")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                filters.status === "active"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleStatusChange("inactive")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                filters.status === "inactive"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => handleStatusChange("pending_activation")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                filters.status === "pending_approval"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Pending Activation
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
