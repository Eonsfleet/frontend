"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Cpu,
  Eye,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TX_TYPE_META,
  type FuelTransactionFilters,
  type ReconciliationStatus,
  type TransactionRow,
  type TxType,
} from "./useFuelTransactions";
import { useReverseGeocode } from "./useReverseGeocode";
import type { FuelPagination } from "@/lib/api/fuel";

function LocationCell({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  const { address, isLoading } = useReverseGeocode(lat, lng);

  if (lat == null || lng == null)
    return <span className="text-slate-400">No location</span>;

  const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      title={address ?? coords}
      className="inline-flex min-w-[260px] max-w-[360px] items-start gap-1.5 text-blue-600 hover:text-blue-700"
    >
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {isLoading ? (
        <span className="inline-flex items-center gap-1 text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Resolving...
        </span>
      ) : (
        <span className="whitespace-normal break-words">
          {address ?? coords}
        </span>
      )}
    </a>
  );
}

interface TransactionsTableProps {
  rows: TransactionRow[];
  isLoading?: boolean;
  filters: FuelTransactionFilters;
  pagination: FuelPagination;
  onFiltersChange: (filters: FuelTransactionFilters) => void;
  onViewRow: (row: TransactionRow) => void;
  onEditRow: (row: TransactionRow) => void;
  onDeleteRows: (rows: TransactionRow[]) => void;
  onBulkEditRows: (rows: TransactionRow[]) => void;
}

const PILLS: { key: "all" | TxType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "refill", label: "Refills" },
  { key: "theft", label: "Theft" },
  { key: "leakage", label: "Leakage" },
];

const RECONCILIATION_META: Record<
  Exclude<ReconciliationStatus, "all">,
  {
    label: string;
    description: string;
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  matched: {
    label: "Matched",
    description: "Linked to an expense/import record",
    className: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  flagged_variance: {
    label: "Variance",
    description: "Matched, but volume differs",
    className: "bg-amber-50 text-amber-700",
    icon: AlertTriangle,
  },
  unmatched: {
    label: "Unmatched",
    description: "No expense record linked yet",
    className: "bg-slate-100 text-slate-600",
    icon: CircleDashed,
  },
};

function sourceLabel(source: string) {
  const normalized = source.toLowerCase();
  if (normalized === "device") return "Device event";
  if (normalized.includes("import")) return "Imported record";
  if (normalized.includes("manual")) return "Manual entry";
  return source === "-" ? "Unknown source" : source;
}

function formatPercent(value: number) {
  return `${Number(value.toFixed(2))}%`;
}

export function TransactionsTable({
  rows,
  isLoading,
  filters,
  pagination,
  onFiltersChange,
  onViewRow,
  onEditRow,
  onDeleteRows,
  onBulkEditRows,
}: TransactionsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const totalPages = Math.max(1, pagination.last_page);
  const clampedPage = Math.min(filters.page, totalPages);
  const pageWindowStart = Math.max(
    1,
    Math.min(clampedPage - 2, Math.max(1, totalPages - 4)),
  );
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages - pageWindowStart + 1) },
    (_, index) => pageWindowStart + index,
  );
  const manageableRows = useMemo(
    () => rows.filter((row) => row.canManage),
    [rows],
  );
  const selectedRows = useMemo(
    () => manageableRows.filter((row) => selectedIds.includes(row.id)),
    [manageableRows, selectedIds],
  );
  const allRowsSelected =
    manageableRows.length > 0 &&
    manageableRows.every((row) => selectedIds.includes(row.id));
  const someRowsSelected = selectedRows.length > 0 && !allRowsSelected;
  const showSelectColumn = manageableRows.length > 0;
  const selectedCount = selectedRows.length;

  const pageStats = useMemo(
    () => ({
      matched: rows.filter((row) => row.reconciliationStatus === "matched")
        .length,
      variance: rows.filter(
        (row) => row.reconciliationStatus === "flagged_variance",
      ).length,
      unmatched: rows.filter(
        (row) => row.reconciliationStatus === "unmatched",
      ).length,
      editable: manageableRows.length,
    }),
    [manageableRows.length, rows],
  );

  const updateFilters = (next: Partial<FuelTransactionFilters>) => {
    onFiltersChange({ ...filters, ...next });
  };

  const toggleRow = (row: TransactionRow) => {
    if (!row.canManage) return;
    setSelectedIds((current) =>
      current.includes(row.id)
        ? current.filter((id) => id !== row.id)
        : [...current, row.id],
    );
  };

  const toggleAllRows = () => {
    setSelectedIds((current) => {
      if (allRowsSelected)
        return current.filter(
          (id) => !manageableRows.some((row) => row.id === id),
        );
      const next = new Set(current);
      manageableRows.forEach((row) => next.add(row.id));
      return Array.from(next);
    });
  };

  return (
    <Card className="flex h-full min-h-[620px] flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-none">
      <div className="flex flex-col gap-3 bg-slate-50/70 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {PILLS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => updateFilters({ type: p.key, page: 1 })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-200",
                  filters.type === p.key
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-white hover:text-slate-800",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-slate-500">
            <span className="rounded-md bg-white px-2 py-1">
              {pageStats.matched} matched
            </span>
            <span className="rounded-md bg-white px-2 py-1">
              {pageStats.variance} variance
            </span>
            <span className="rounded-md bg-white px-2 py-1">
              {pageStats.unmatched} unmatched
            </span>
            <span className="rounded-md bg-white px-2 py-1">
              {pageStats.editable} editable
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1">
              <span className="text-[12px] font-medium text-slate-600">
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={() => onBulkEditRows(selectedRows)}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-blue-600 hover:bg-blue-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteRows(selectedRows)}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
          <div className="relative w-full lg:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(e) =>
                updateFilters({ search: e.target.value, page: 1 })
              }
              placeholder="Search plate, model, type, source..."
              className="h-9 border-0 bg-white pl-8 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
              aria-label="Search transactions"
            />
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-4 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-5 bg-gradient-to-l from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-5 bg-gradient-to-t from-white to-transparent" />
        <div className="fuel-record-scroll h-full overflow-auto overscroll-contain">
          <table className="w-full min-w-[1240px] table-fixed whitespace-nowrap text-left text-[13px]">
            <colgroup>
              {showSelectColumn && <col className="w-12" />}
              <col className="w-[230px]" />
              <col className="w-[220px]" />
              <col className="w-[150px]" />
              <col className="w-[180px]" />
              <col className="w-[190px]" />
              <col className="w-[330px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
            </colgroup>
          <thead className="sticky top-0 z-30 bg-white/95 backdrop-blur">
            <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {showSelectColumn && (
                  <th className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      aria-label="Select all editable transactions on this page"
                      checked={allRowsSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someRowsSelected;
                      }}
                      onChange={toggleAllRows}
                      className="h-4 w-4 rounded accent-blue-600"
                    />
                  </th>
                )}
                <th className="px-4 py-3.5">Event</th>
                <th className="px-4 py-3.5">Vehicle</th>
                <th className="px-4 py-3.5">Volume</th>
                <th className="px-4 py-3.5">Fuel Level</th>
                <th className="px-4 py-3.5">Reconciliation</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Confidence</th>
                <th className="sticky right-0 z-40 bg-white/95 px-4 py-3.5 text-right backdrop-blur">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={showSelectColumn ? 9 : 8} className="px-4 py-3">
                    <div className="h-14 w-full animate-pulse rounded-lg bg-slate-50" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={showSelectColumn ? 9 : 8}
                  className="px-4 py-16 text-center text-slate-400"
                >
                  No fuel transactions match the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((r, index) => {
                const meta = TX_TYPE_META[r.type];
                const recon = RECONCILIATION_META[r.reconciliationStatus];
                const ReconciliationIcon = recon.icon;
                const negative = (r.volumeLiters ?? 0) < 0;
                const selected = selectedIds.includes(r.id);
                const isEvenRow = index % 2 === 1;
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "group align-middle transition-colors duration-200 hover:bg-slate-50/80",
                      selected ? "bg-blue-50/60" : "even:bg-slate-50/35",
                    )}
                  >
                    {showSelectColumn && (
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          aria-label={`Select transaction for ${r.vehicle}`}
                          checked={selected}
                          onChange={() => toggleRow(r)}
                          disabled={!r.canManage}
                          className="h-4 w-4 rounded accent-blue-600 disabled:opacity-30"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                            meta.badge,
                          )}
                        >
                          {meta.label}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {r.date}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.time}
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            {r.source.toLowerCase() === "device" ? (
                              <Cpu className="h-3 w-3 text-slate-400" />
                            ) : (
                              <ReceiptText className="h-3 w-3 text-slate-400" />
                            )}
                            {sourceLabel(r.source)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold uppercase text-slate-900">
                            {r.vehicle}
                          </div>
                          <div className="truncate text-[11px] text-slate-400">
                            {r.vehicleModel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3.5 font-semibold",
                        negative ? "text-rose-600" : "text-slate-800",
                      )}
                    >
                      {r.volumeLiters != null ? `${r.volumeLiters} L` : "-"}
                      {r.amountNaira != null && (
                        <div className="text-[11px] font-medium text-slate-400">
                          NGN {r.amountNaira.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.fuelLevelBefore != null && r.fuelLevelAfter != null ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <span className="text-slate-400">
                            {formatPercent(r.fuelLevelBefore)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-300" />
                          <span
                            className={cn(
                              "font-semibold",
                              r.fuelLevelAfter >= r.fuelLevelBefore
                                ? "text-emerald-600"
                                : "text-rose-600",
                            )}
                          >
                            {formatPercent(r.fuelLevelAfter)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          No level reading
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold",
                          recon.className,
                        )}
                      >
                        <ReconciliationIcon className="h-3.5 w-3.5" />
                        {recon.label}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {recon.description}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <LocationCell lat={r.lat} lng={r.lng} />
                    </td>
                    <td className="px-4 py-3.5">
                      {r.confidence != null ? (
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                            r.confidence >= 0.9
                              ? "bg-emerald-50 text-emerald-700"
                              : r.confidence >= 0.7
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {Math.round(r.confidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "sticky right-0 z-10 px-4 py-3.5",
                        selected
                          ? "bg-blue-50/95"
                          : isEvenRow
                            ? "bg-slate-50/95 group-hover:bg-slate-50/95"
                            : "bg-white/95 group-hover:bg-slate-50/95",
                      )}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`View ${r.vehicle}`}
                          onClick={() => onViewRow(r)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {r.canManage ? (
                          <>
                            <button
                              type="button"
                              aria-label={`Edit ${r.vehicle}`}
                              onClick={() => onEditRow(r)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${r.vehicle}`}
                              onClick={() => onDeleteRows([r])}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-400"
                            title="Read-only"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-slate-50/70 px-4 py-3 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-medium text-slate-700">
            {pagination.total === 0
              ? 0
              : (clampedPage - 1) * pagination.per_page + 1}
            -
            {Math.min(clampedPage * pagination.per_page, pagination.total)}
          </span>{" "}
          of {pagination.total} transactions
          <span className="ml-2 text-slate-400">
            Page {clampedPage} of {totalPages}
          </span>
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            aria-label="Previous page"
            disabled={clampedPage <= 1}
            onClick={() =>
              updateFilters({ page: Math.max(1, clampedPage - 1) })
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 transition-colors duration-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => updateFilters({ page: pageNumber })}
              aria-current={clampedPage === pageNumber ? "page" : undefined}
              className={cn(
                "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-2 text-[12px] font-semibold transition-colors duration-200",
                clampedPage === pageNumber
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:text-slate-900",
              )}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next page"
            disabled={clampedPage >= totalPages}
            onClick={() =>
              updateFilters({ page: Math.min(totalPages, clampedPage + 1) })
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 transition-colors duration-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
