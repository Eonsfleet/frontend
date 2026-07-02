"use client";

import { useMemo } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeAIInsights, type AIInsightsInput } from "@/lib/aiInsights";

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  critical: "bg-rose-50 text-rose-700 border-rose-100",
};

export function AIInsightsCard({ input }: { input: AIInsightsInput }) {
  const insights = useMemo(() => computeAIInsights(input), [input]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">AI Insights</span>
      </div>
      {insights.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-600">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[11px] font-bold">No anomalies detected</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "text-[10px] font-bold px-2.5 py-1.5 rounded-lg border",
                SEVERITY_STYLE[insight.severity],
              )}
            >
              {insight.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
