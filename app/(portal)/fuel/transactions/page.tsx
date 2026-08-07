"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  GitCompare,
  AlertTriangle,
  ImageUp,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QueryError } from "@/components/shared/QueryError";
import { FuelTabs } from "../components/FuelTabs";
import { TxKpiCards } from "../components/TxKpiCards";
import { TransactionsTable } from "../components/TransactionsTable";
import { TransactionFilters } from "../components/TransactionFilters";
import {
  useFuelTransactions,
  type EditableFuelExpenseStatus,
  type FuelTransactionFilters,
  type TransactionRow,
} from "../components/useFuelTransactions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  deleteFuelExpense,
  exportFuelTransactions,
  getFuelVehicles,
  updateFuelExpense,
  type CreateFuelExpensePayload,
} from "@/lib/api/fuel";
import { getDrivers } from "@/lib/api/drivers";
import { uploadFile } from "@/lib/api/documents";
import { extractApiError } from "@/lib/utils";
import * as api from "@/lib/api/fuel";

interface ExpenseForm {
  vehicleId: string;
  userId: string;
  volume: string;
  costPerVolume: string;
  entryDate: string;
  currency: string;
  purchaseFrom: string;
  receiptUrl: string;
  referenceNumber: string;
  status: EditableFuelExpenseStatus;
}

const STATUS_OPTIONS: Array<{
  value: EditableFuelExpenseStatus;
  label: string;
}> = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "reimbursed", label: "Reimbursed" },
];

const defaultExpenseForm = (): ExpenseForm => ({
  vehicleId: "",
  userId: "",
  volume: "",
  costPerVolume: "",
  entryDate: format(new Date(), "yyyy-MM-dd"),
  currency: "NGN",
  purchaseFrom: "",
  receiptUrl: "",
  referenceNumber: "",
  status: "pending_approval",
});

function inputDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? format(new Date(), "yyyy-MM-dd")
    : format(date, "yyyy-MM-dd");
}

function rowToForm(row: TransactionRow): ExpenseForm {
  return {
    vehicleId: row.vehicleId ? String(row.vehicleId) : "",
    userId: row.userId ? String(row.userId) : "",
    volume: row.volumeLiters != null ? String(Math.abs(row.volumeLiters)) : "",
    costPerVolume: row.pricePerLiter != null ? String(row.pricePerLiter) : "",
    entryDate: row.occurredAt
      ? inputDate(row.occurredAt)
      : format(new Date(), "yyyy-MM-dd"),
    currency: row.currency || "NGN",
    purchaseFrom: row.station === "-" ? "" : row.station,
    receiptUrl: row.receiptUrl,
    referenceNumber: row.referenceNumber,
    status: row.status,
  };
}

function formToPayload(form: ExpenseForm): CreateFuelExpensePayload {
  const vehicleId = Number(form.vehicleId);
  const userId = Number(form.userId);
  const volume = Number(form.volume);
  const costPerVolume = Number(form.costPerVolume);

  if (!vehicleId || !userId || !volume || !costPerVolume || !form.entryDate) {
    throw new Error(
      "Vehicle, driver, volume, cost per litre, and date are required.",
    );
  }

  return {
    vehicle_id: vehicleId,
    user_id: userId,
    volume,
    cost_per_volume: costPerVolume,
    entry_date: form.entryDate,
    currency: form.currency.trim() || null,
    purchase_from: form.purchaseFrom.trim() || null,
    receipt_url: form.receiptUrl.trim() || null,
    reference_number: form.referenceNumber.trim() || null,
    status: form.status,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function TransactionExpenseDialog({
  open,
  mode,
  row,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  row?: TransactionRow | null;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: ExpenseForm) => void;
}) {
  const [form, setForm] = useState<ExpenseForm>(() =>
    mode === "edit" && row ? rowToForm(row) : defaultExpenseForm(),
  );

  const vehiclesQuery = useQuery({
    queryKey: ["fuel-transaction-form-vehicles"],
    queryFn: () => getFuelVehicles({ per_page: 200 }),
    enabled: open,
  });
  const driversQuery = useQuery({
    queryKey: ["fuel-transaction-form-drivers"],
    queryFn: () => getDrivers({ per_page: 200 }),
    enabled: open,
  });

  const receiptUploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file),
    onSuccess: ({ url }) => {
      setForm((current) => ({ ...current, receiptUrl: url }));
      toast.success("Receipt image uploaded.");
    },
    onError: (error) =>
      toast.error(extractApiError(error, "Failed to upload receipt image.")),
  });

  const updateForm = (key: keyof ExpenseForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadReceipt = (file: File | undefined) => {
    if (!file) return;
    receiptUploadMutation.mutate(file);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setForm(defaultExpenseForm());
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Fuel Transaction" : "Add Fuel Transaction"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the selected fuel transaction record."
              : "Create a fuel expense transaction record."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Vehicle</Label>
            <select
              value={form.vehicleId}
              onChange={(event) => updateForm("vehicleId", event.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
            >
              <option value="">Select vehicle...</option>
              {(vehiclesQuery.data?.data.vehicles ?? []).map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.attributes.registration_number} -{" "}
                  {vehicle.attributes.make} {vehicle.attributes.model}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Label>Driver</Label>
            <select
              value={form.userId}
              onChange={(event) => updateForm("userId", event.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
            >
              <option value="">Select driver...</option>
              {(driversQuery.data?.data ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.attributes.full_name ||
                    `${driver.attributes.first_name} ${driver.attributes.last_name}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Volume (L)</Label>
            <Input
              value={form.volume}
              onChange={(event) => updateForm("volume", event.target.value)}
              type="number"
              step="0.01"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Cost per Litre</Label>
            <Input
              value={form.costPerVolume}
              onChange={(event) =>
                updateForm("costPerVolume", event.target.value)
              }
              type="number"
              step="0.01"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Entry Date</Label>
            <Input
              value={form.entryDate}
              onChange={(event) => updateForm("entryDate", event.target.value)}
              type="date"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Input
              value={form.currency}
              onChange={(event) =>
                updateForm(
                  "currency",
                  event.target.value.toUpperCase().slice(0, 3),
                )
              }
              maxLength={3}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(event) => updateForm("status", event.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Purchase From</Label>
            <Input
              value={form.purchaseFrom}
              onChange={(event) =>
                updateForm("purchaseFrom", event.target.value)
              }
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Reference Number</Label>
            <Input
              value={form.referenceNumber}
              onChange={(event) =>
                updateForm("referenceNumber", event.target.value)
              }
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Receipt Image</Label>
            <div className="mt-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:text-blue-600">
                <span className="inline-flex items-center gap-2">
                  <ImageUp className="h-4 w-4 text-blue-500" />
                  {form.receiptUrl
                    ? "Replace receipt image"
                    : "Upload receipt image"}
                </span>
                {receiptUploadMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={receiptUploadMutation.isPending}
                  onChange={(event) => uploadReceipt(event.target.files?.[0])}
                />
              </label>
              <div className="mt-2 text-[12px] text-slate-500">
                {receiptUploadMutation.isPending
                  ? "Uploading receipt image..."
                  : form.receiptUrl
                    ? "Receipt image uploaded and ready."
                    : "Upload a receipt image before submitting."}
              </div>
              {form.receiptUrl && (
                <a
                  href={form.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex max-w-full truncate text-[12px] font-medium text-blue-600 hover:text-blue-700"
                >
                  {form.receiptUrl}
                </a>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={
              isPending ||
              receiptUploadMutation.isPending ||
              (mode === "create" && !form.receiptUrl)
            }
            onClick={() => onSubmit(form)}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransactionViewDialog({
  row,
  onClose,
}: {
  row: TransactionRow | null;
  onClose: () => void;
}) {
  const details: Array<[string, string]> = row
    ? [
        ["Vehicle", `${row.vehicle} (${row.vehicleModel})`],
        ["Date", `${row.date} ${row.time}`],
        ["Type", row.type],
        ["Source", row.source],
        ["Volume", row.volumeLiters != null ? `${row.volumeLiters} L` : "-"],
        [
          "Fuel Level",
          row.fuelLevelBefore != null && row.fuelLevelAfter != null
            ? `${row.fuelLevelBefore}% → ${row.fuelLevelAfter}%`
            : "-",
        ],
        [
          "Odometer",
          row.odometerKm != null
            ? `${row.odometerKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`
            : "-",
        ],
        [
          "Confidence",
          row.confidence != null ? `${Math.round(row.confidence * 100)}%` : "-",
        ],
        [
          "Location",
          row.lat != null && row.lng != null
            ? `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}`
            : row.station,
        ],
        // Cost/expense fields only appear when the transaction is linked to an expense.
        ...(row.amountNaira != null
          ? [
              ["Amount", `NGN ${row.amountNaira.toLocaleString()}`] as [
                string,
                string,
              ],
            ]
          : []),
        ...(row.pricePerLiter != null
          ? [
              ["Price / L", `NGN ${row.pricePerLiter.toLocaleString()}`] as [
                string,
                string,
              ],
            ]
          : []),
        ...(row.receiptUrl
          ? [["Receipt", row.receiptUrl] as [string, string]]
          : []),
      ]
    : [];

  return (
    <Dialog open={!!row} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Fuel Transaction Details</DialogTitle>
          <DialogDescription>
            Review the selected transaction record.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </dt>
              <dd className="mt-1 break-words text-sm font-medium capitalize text-slate-800">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTransactionsDialog({
  rows,
  isPending,
  onClose,
  onConfirm,
}: {
  rows: TransactionRow[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={rows.length > 0} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" /> Delete
            Transaction{rows.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            This will permanently delete {rows.length} selected fuel transaction
            {rows.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkEditDialog({
  rows,
  isPending,
  onClose,
  onConfirm,
}: {
  rows: TransactionRow[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (status: EditableFuelExpenseStatus) => void;
}) {
  const [status, setStatus] = useState<EditableFuelExpenseStatus>("approved");

  return (
    <Dialog open={rows.length > 0} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Edit Transactions</DialogTitle>
          <DialogDescription>
            Apply a status update to {rows.length} selected fuel transaction
            {rows.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Status</Label>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as EditableFuelExpenseStatus)
            }
            className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={isPending}
            onClick={() => onConfirm(status)}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FuelTransactionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewRow, setViewRow] = useState<TransactionRow | null>(null);
  const [editRow, setEditRow] = useState<TransactionRow | null>(null);
  const [deleteRows, setDeleteRows] = useState<TransactionRow[]>([]);
  const [bulkEditRows, setBulkEditRows] = useState<TransactionRow[]>([]);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileStartDate, setReconcileStartDate] = useState("");
  const [reconcileEndDate, setReconcileEndDate] = useState("");
  const [filters, setFilters] = useState<FuelTransactionFilters>({
    search: "",
    vehicleId: undefined,
    type: "all",
    reconciliationStatus: "all",
    startDate: "",
    endDate: "",
    page: 1,
    perPage: 10,
    exportLimit: 5000,
    sortBy: "occurred_at",
    orderBy: "desc",
  });

  const { rows, kpis, kpisLoading, pagination, isLoading, isError } =
    useFuelTransactions(filters);

  const refreshFuelTransactions = () => {
    queryClient.invalidateQueries({ queryKey: ["fuel-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["fuel-expense-metrics"] });
  };

  const { mutate: runEngine, isPending: isRunningEngine } = useMutation({
    mutationFn: () =>
      api.runReconciliationEngine({
        start_date: reconcileStartDate || undefined,
        end_date: reconcileEndDate || undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        `Reconciliation complete. ${res.data.matched_count} matched, ${res.data.unmatched_transactions_count} unmatched transactions.`,
      );
      queryClient.invalidateQueries({ queryKey: ["reconciliation-report"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-discrepancies"] });
      setReconcileOpen(false);
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: ({ row, form }: { row: TransactionRow; form: ExpenseForm }) =>
      updateFuelExpense(row.id, formToPayload(form)),
    onSuccess: () => {
      toast.success("Fuel transaction updated.");
      refreshFuelTransactions();
      setEditRow(null);
    },
    onError: (error) =>
      toast.error(extractApiError(error, "Failed to update fuel transaction.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (targetRows: TransactionRow[]) =>
      Promise.all(targetRows.map((row) => deleteFuelExpense(row.id))),
    onSuccess: (_, targetRows) => {
      toast.success(
        `${targetRows.length} fuel transaction${targetRows.length === 1 ? "" : "s"} deleted.`,
      );
      refreshFuelTransactions();
      setDeleteRows([]);
    },
    onError: (error) =>
      toast.error(extractApiError(error, "Failed to delete fuel transaction.")),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({
      targetRows,
      status,
    }: {
      targetRows: TransactionRow[];
      status: EditableFuelExpenseStatus;
    }) =>
      Promise.all(
        targetRows.map((row) => updateFuelExpense(row.id, { status })),
      ),
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.targetRows.length} transaction${variables.targetRows.length === 1 ? "" : "s"} updated.`,
      );
      refreshFuelTransactions();
      setBulkEditRows([]);
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, "Failed to update selected transactions."),
      ),
  });

  const exportMutation = useMutation({
    mutationFn: () => {
      const exportParams = {
        q: filters.search.trim() || undefined,
        vehicle_id: filters.vehicleId,
        type: filters.type && filters.type !== "all" ? filters.type : undefined,
        reconciliation_status:
          filters.reconciliationStatus && filters.reconciliationStatus !== "all"
            ? filters.reconciliationStatus
            : undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        limit: filters.exportLimit,
      };

      return exportFuelTransactions(exportParams);
    },
    onSuccess: (blob) => {
      downloadBlob(
        blob,
        `fuel-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
      toast.success("Fuel transactions export downloaded.");
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, "Failed to export fuel transactions."),
      ),
  });

  return (
    <div className="flex min-h-0 flex-col gap-5 xl:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fuel Transactions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and manage all fuel purchases, refills, drains and adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 shadow-none"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}{" "}
            Export
          </Button>
          <Popover open={reconcileOpen} onOpenChange={setReconcileOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                className="h-9 gap-2 bg-blue-600 text-white shadow-none hover:bg-blue-700 cursor-pointer"
              >
                <GitCompare className="h-4 w-4" /> Reconciliation
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Run Reconciliation
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    Choose a date range to match transactions against
                    expenses. Leave blank to reconcile everything.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      className="mt-1 h-9 text-sm"
                      value={reconcileStartDate}
                      onChange={(event) =>
                        setReconcileStartDate(event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      End Date
                    </Label>
                    <Input
                      type="date"
                      className="mt-1 h-9 text-sm"
                      value={reconcileEndDate}
                      onChange={(event) =>
                        setReconcileEndDate(event.target.value)
                      }
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-9 w-full gap-2 bg-blue-600 text-white shadow-none hover:bg-blue-700"
                  disabled={isRunningEngine}
                  onClick={() => runEngine()}
                >
                  {isRunningEngine ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitCompare className="h-4 w-4" />
                  )}
                  Run Reconciliation
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <FuelTabs active="Fuel Transactions" />

      {isError ? (
        <QueryError message="Failed to load fuel transactions." />
      ) : (
        <>
          <TxKpiCards kpis={kpis} isLoading={kpisLoading} />

          {/* Table + filters sidebar.
                        · < xl: single column, natural flow — filters first (so they're
                          reachable), then the table capped to a scrollable height.
                        · ≥ xl: side-by-side, both filling the fixed-height viewport column. */}
          <div className="grid min-h-0 grid-cols-1 items-stretch gap-4 xl:flex-1 xl:grid-cols-4">
            <div className="order-2 min-h-0 min-w-0 xl:order-1 xl:col-span-3">
              <div className="h-[60vh] min-w-0 xl:h-full">
                <TransactionsTable
                  rows={rows}
                  isLoading={isLoading}
                  filters={filters}
                  pagination={pagination}
                  onFiltersChange={setFilters}
                  onViewRow={setViewRow}
                  onDeleteRows={setDeleteRows}
                  onBulkEditRows={setBulkEditRows}
                />
              </div>
            </div>
            <div className="order-1 min-h-0 xl:order-2 xl:col-span-1">
              <TransactionFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        </>
      )}
      <TransactionExpenseDialog
        key={editRow?.id ?? "edit-transaction"}
        open={!!editRow}
        mode="edit"
        row={editRow}
        isPending={editMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
        onSubmit={(form) => {
          if (editRow) editMutation.mutate({ row: editRow, form });
        }}
      />
      <TransactionViewDialog row={viewRow} onClose={() => setViewRow(null)} />
      <DeleteTransactionsDialog
        rows={deleteRows}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteRows([])}
        onConfirm={() => deleteMutation.mutate(deleteRows)}
      />
      <BulkEditDialog
        key={
          bulkEditRows.map((row) => row.id).join("-") ||
          "bulk-edit-transactions"
        }
        rows={bulkEditRows}
        isPending={bulkStatusMutation.isPending}
        onClose={() => setBulkEditRows([])}
        onConfirm={(status) =>
          bulkStatusMutation.mutate({ targetRows: bulkEditRows, status })
        }
      />
    </div>
  );
}
