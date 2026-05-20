"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClusterFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusters: any[];
  selectedClusterIds: string[];
  setSelectedClusterIds: (
    ids: string[] | ((prev: string[]) => string[]),
  ) => void;
}

export function ClusterFilterModal({
  open,
  onOpenChange,
  clusters,
  selectedClusterIds,
  setSelectedClusterIds,
}: ClusterFilterModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100">
          <DialogTitle className="text-sm font-black uppercase tracking-tight italic flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            Filter by <span className="text-blue-600">Cluster</span>
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {clusters.length === 0 ? (
            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-8">
              No clusters found
            </p>
          ) : (
            clusters.map((c: any) => {
              const id = String(c.id);
              const isSelected = selectedClusterIds.includes(id);
              return (
                <button
                  key={id}
                  onClick={() =>
                    setSelectedClusterIds((prev) =>
                      isSelected
                        ? prev.filter((x) => x !== id)
                        : [...prev, id],
                    )
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left",
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-100 text-slate-700 hover:border-blue-200",
                  )}
                >
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {c.attributes?.name || c.name || `Cluster ${id}`}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={() => setSelectedClusterIds([])}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
          >
            Clear All
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all"
          >
            Apply ({selectedClusterIds.length})
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
