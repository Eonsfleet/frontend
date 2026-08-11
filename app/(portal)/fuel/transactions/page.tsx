"use client";

import { useState } from "react";
import {
  Loader2,
  GitCompare,
  AlertTriangle,
  ImageUp,
  Download,
  SlidersHorizontal,
  Banknote,
  CalendarClock,
  ExternalLink,
  Fuel,
  Gauge,
  MapPin,
  ReceiptText,
  UserRound,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QueryError } from "@/components/shared/QueryError";
import { FuelTabs } from "../components/FuelTabs";
import { TxKpiCards } from "../components/TxKpiCards";
import { TransactionsTable } from "../components/TransactionsTable";
import { TransactionFilters } from "../components/TransactionFilters";
import { useReverseGeocode } from "../components/useReverseGeocode";
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

function isCoordinateLabel(value: string) {
  return /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

function formatFuelPercent(value: number) {
  return `${Number(value.toFixed(2))}%`;
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
              className="mt-1.5 h-10 w-full rounded-md bg-slate-50 px-3 text-sm outline-none"
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
              className="mt-1.5 h-10 w-full rounded-md bg-slate-50 px-3 text-sm outline-none"
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
              className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
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
              className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          </div>
          <div>
            <Label>Entry Date</Label>
            <Input
              value={form.entryDate}
              onChange={(event) => updateForm("entryDate", event.target.value)}
              type="date"
              className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
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
              className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(event) => updateForm("status", event.target.value)}
              className="mt-1.5 h-10 w-full rounded-md bg-slate-50 px-3 text-sm outline-none"
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
              className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          </div>
          <div>
            <Label>Reference Number</Label>
            <Input
              value={form.referenceNumber}
              onChange={(event) =>
                updateForm("referenceNumber", event.target.value)
              }
              className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Receipt Image</Label>
            <div className="mt-1.5 rounded-lg bg-slate-50 p-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-blue-600">
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
  const { address, isLoading: isLocationLoading } = useReverseGeocode(
    row?.lat ?? null,
    row?.lng ?? null,
  );

  if (!row) return null;

  const stationAddress =
    row.station && row.station !== "-" && !isCoordinateLabel(row.station)
      ? row.station
      : null;
  const locationLabel =
    address ??
    stationAddress ??
    (isLocationLoading ? "Resolving location..." : "Location not available");
  const mapUrl =
    row.lat != null && row.lng != null
      ? `https://www.google.com/maps?q=${row.lat},${row.lng}`
      : null;
  const amountLabel =
    row.amountNaira != null
      ? `${row.currency || "NGN"} ${row.amountNaira.toLocaleString()}`
      : "-";
  const priceLabel =
    row.pricePerLiter != null
      ? `${row.currency || "NGN"} ${row.pricePerLiter.toLocaleString()}`
      : "-";
  const fuelLevelLabel =
    row.fuelLevelBefore != null && row.fuelLevelAfter != null
      ? `${formatFuelPercent(row.fuelLevelBefore)} to ${formatFuelPercent(row.fuelLevelAfter)}`
      : "-";
  const reconciliationLabel =
    row.reconciliationStatus === "flagged_variance"
      ? "Variance"
      : row.reconciliationStatus;

  const receiptLines = [
    ["Transaction type", row.type],
    ["Source", row.source],
    ["Reference", row.referenceNumber || "-"],
    ["Driver", row.driver || "-"],
    ["Status", row.status.replaceAll("_", " ")],
    ["Reconciliation", reconciliationLabel.replaceAll("_", " ")],
  ];

  return (
    <Dialog open={!!row} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-0 p-0 shadow-none sm:max-w-3xl">
        <DialogHeader className="bg-slate-950 px-6 py-5 text-white">
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <ReceiptText className="h-5 w-5 text-blue-300" />
            Fuel Receipt
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {row.vehicle} · {row.date} at {row.time}
          </DialogDescription>
        </DialogHeader>

        <div className="fuel-record-scroll max-h-[calc(90vh-9rem)] overflow-y-auto bg-white px-6 py-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <Fuel className="h-3.5 w-3.5" />
                    Volume
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {row.volumeLiters != null ? `${row.volumeLiters} L` : "-"}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <Banknote className="h-3.5 w-3.5" />
                    Amount
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {amountLabel}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <Gauge className="h-3.5 w-3.5" />
                    Fuel Level
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {fuelLevelLabel}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Location
                    </div>
                    <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                      {locationLabel}
                    </div>
                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Open map
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Date & Time
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {row.date} · {row.time}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <UserRound className="h-3.5 w-3.5" />
                    Vehicle
                  </div>
                  <div className="mt-1 text-sm font-semibold uppercase text-slate-900">
                    {row.vehicle}
                  </div>
                  <div className="text-[12px] text-slate-500">
                    {row.vehicleModel}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Transaction Breakdown
                </div>
                <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                  {receiptLines.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-medium text-slate-400">
                        {label}
                      </dt>
                      <dd className="mt-0.5 break-words text-sm font-semibold capitalize text-slate-800">
                        {value}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-[11px] font-medium text-slate-400">
                      Price / L
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                      {priceLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium text-slate-400">
                      Odometer
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                      {row.odometerKm != null
                        ? `${row.odometerKm.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })} km`
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium text-slate-400">
                      Confidence
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                      {row.confidence != null
                        ? `${Math.round(row.confidence * 100)}%`
                        : "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <aside className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <ReceiptText className="h-3.5 w-3.5" />
                Receipt
              </div>
              {row.receiptUrl ? (
                <div className="mt-3 space-y-3">
                  <a
                    href={row.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.receiptUrl}
                      alt={`Receipt for ${row.vehicle}`}
                      className="max-h-72 w-full object-contain"
                    />
                  </a>
                  <a
                    href={row.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View receipt
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-white p-4 text-sm text-slate-500">
                  No receipt image is attached to this transaction.
                </div>
              )}
            </aside>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
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
            className="mt-1.5 h-10 w-full rounded-md bg-slate-50 px-3 text-sm outline-none"
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
  const queryClient = useQueryClient();
  const [viewRow, setViewRow] = useState<TransactionRow | null>(null);
  const [editRow, setEditRow] = useState<TransactionRow | null>(null);
  const [deleteRows, setDeleteRows] = useState<TransactionRow[]>([]);
  const [bulkEditRows, setBulkEditRows] = useState<TransactionRow[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const activeFilterCount = [
    filters.vehicleId,
    filters.type && filters.type !== "all" ? filters.type : undefined,
    filters.reconciliationStatus && filters.reconciliationStatus !== "all"
      ? filters.reconciliationStatus
      : undefined,
    filters.startDate,
    filters.endDate,
    filters.perPage !== 10 ? filters.perPage : undefined,
    filters.sortBy !== "occurred_at" ? filters.sortBy : undefined,
    filters.orderBy !== "desc" ? filters.orderBy : undefined,
    filters.exportLimit !== 5000 ? filters.exportLimit : undefined,
  ].filter(Boolean).length;

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
      updateFuelExpense(row.fuelExpenseId ?? row.id, formToPayload(form)),
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
      Promise.all(
        targetRows.map((row) => deleteFuelExpense(row.fuelExpenseId ?? row.id)),
      ),
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
        targetRows.map((row) =>
          updateFuelExpense(row.fuelExpenseId ?? row.id, { status }),
        ),
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
            className="h-9 gap-2 border-0 bg-slate-100 shadow-none hover:bg-slate-200"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
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

          <div className="min-h-0 min-w-0 xl:flex-1">
            <div className="h-[60vh] min-w-0 xl:h-full">
              <TransactionsTable
                rows={rows}
                isLoading={isLoading}
                filters={filters}
                pagination={pagination}
                onFiltersChange={setFilters}
                onViewRow={setViewRow}
                onEditRow={setEditRow}
                onDeleteRows={setDeleteRows}
                onBulkEditRows={setBulkEditRows}
              />
            </div>
          </div>
        </>
      )}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="w-full border-0 p-0 shadow-none sm:max-w-md"
        >
          <SheetHeader className="px-5 pt-5 text-left">
            <SheetTitle>Fuel Transaction Filters</SheetTitle>
            <SheetDescription>
              Refine the ledger by vehicle, reconciliation state, date, and
              table settings.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <TransactionFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        </SheetContent>
      </Sheet>
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
