"use client";

import React, { useMemo, useState } from "react";
import { FileDown, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { VISIBLE_REPORTS, CATEGORIES, categoryOf, getReport, type ReportEntry } from "@/lib/reports/registry";
import { Chip, EmptyState } from "./ui";

interface Props {
  favorites: string[];
  recent: string[];
  onOpen: (type: string) => void;
  onToggleFavorite: (type: string) => void;
}

function ReportCard({ entry, favorite, onOpen, onToggleFavorite }: {
  entry: ReportEntry;
  favorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left p-4 pr-12 rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="text-[11px] font-bold text-blue-600">{categoryOf(entry)}</span>
        <span className="block text-sm font-bold text-slate-900 mt-1 leading-snug">{entry.label}</span>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <FileDown className="h-3.5 w-3.5" aria-hidden />
          Export
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={favorite ? `Remove ${entry.label} from favorites` : `Add ${entry.label} to favorites`}
        aria-pressed={favorite}
        className="absolute top-1.5 right-1.5 h-10 w-10 inline-flex items-center justify-center rounded-xl cursor-pointer hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Star className={cn("h-4 w-4", favorite ? "fill-amber-400 text-amber-400" : "text-slate-300 group-hover:text-slate-400")} />
      </button>
    </div>
  );
}

export function CatalogTab({ favorites, recent, onOpen, onToggleFavorite }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VISIBLE_REPORTS.filter((r) => {
      if (category && categoryOf(r) !== category) return false;
      if (!q) return true;
      return `${r.label} ${r.type} ${r.group}`.toLowerCase().includes(q);
    });
  }, [query, category]);

  const grid = (items: ReportEntry[]) => (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((entry) => (
        <ReportCard
          key={entry.type}
          entry={entry}
          favorite={favorites.includes(entry.type)}
          onOpen={() => onOpen(entry.type)}
          onToggleFavorite={() => onToggleFavorite(entry.type)}
        />
      ))}
    </div>
  );

  const pick = (types: string[]) => types.map(getReport).filter((r): r is ReportEntry => !!r && VISIBLE_REPORTS.includes(r));
  const browsing = !query && !category;
  const favoriteEntries = pick(favorites);
  const recentEntries = pick(recent);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports, for example fuel, trips, maintenance"
            aria-label="Search reports"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Report categories">
          <Chip active={!category} onClick={() => setCategory(null)}>All</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>{c}</Chip>
          ))}
        </div>
      </div>

      {browsing && recentEntries.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900">Recently run</h2>
          {grid(recentEntries)}
        </section>
      )}
      {browsing && favoriteEntries.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900">Favorites</h2>
          {grid(favoriteEntries)}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-black text-slate-900">
          {browsing ? "All reports" : `${matches.length} ${matches.length === 1 ? "report" : "reports"}`}
        </h2>
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white">
            <EmptyState icon={<Search className="h-5 w-5" />} title="No report matches your search">
              Try a shorter word, or clear the category filter.
            </EmptyState>
          </div>
        ) : (
          grid(matches)
        )}
      </section>
    </div>
  );
}
