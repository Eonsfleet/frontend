"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A pill used for filters and toggles; `active` is the selected one. */
export function Chip({ active, onClick, children, className }: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 px-3.5 rounded-full text-xs font-bold border transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
        active
          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, children, action }: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14 px-6">
      <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">{icon}</div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {children && <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{children}</p>}
      {action}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  queued: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-slate-100 text-slate-500 border-slate-200",
};

/** Status as a word as well as a color, so it never rests on color alone. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize", STATUS_STYLE[status] ?? STATUS_STYLE.paused)}>
      {status}
    </span>
  );
}

export function PrimaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold",
        "hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        className,
      )}
    />
  );
}

export function GhostButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold",
        "hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        className,
      )}
    />
  );
}

export const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
