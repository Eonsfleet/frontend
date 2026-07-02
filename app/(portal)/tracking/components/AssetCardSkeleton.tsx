import { Skeleton } from "@/components/ui/skeleton";

export function AssetCardSkeleton() {
  return (
    <div className="flex flex-col p-3 rounded-xl border border-slate-50 bg-white gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2 w-28" />
          </div>
        </div>
        <Skeleton className="h-4 w-12 rounded-full shrink-0" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
        <Skeleton className="h-2 w-16" />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}
