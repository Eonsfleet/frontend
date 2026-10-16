"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  CreditCard,
  Clock,
  ReceiptText,
  Truck,
  SlidersHorizontal,
  MoreHorizontal,
  Link2Off,
  Trash2,
  ExternalLink,
  GitCompare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api/fuel";
import { getVehicles } from "@/lib/api/vehicles";
import { format } from "date-fns";
import { toast } from "sonner";
import axios from "axios";
import { FuelExpense } from "@/types";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { extractApiError } from "@/lib/utils";
import { useImportExportStore } from "@/store/importExportStore";
import { QueryError } from "@/components/shared/QueryError";
import { useAuthStore } from "@/store/authStore";
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_DROPDOWN } from "@/lib/config";
import { FuelTabs } from "../components/FuelTabs";
import {
  formatVehicleMakeModel,
  formatVehicleRegistration,
} from "../components/formatVehicleText";

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 gap-1">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-0 gap-1">
          <XCircle className="w-3 h-3" /> Rejected
        </Badge>
      );
    case "reimbursed":
      return (
        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 gap-1">
          <CreditCard className="w-3 h-3" /> Reimbursed
        </Badge>
      );
    case "flagged_for_review":
      return (
        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-0 gap-1">
          <AlertCircle className="w-3 h-3" /> Review
        </Badge>
      );
    default:
      return (
        <Badge
          variant="secondary"
          className="bg-amber-50 text-amber-700 border-0 gap-1"
        >
          <AlertCircle className="w-3 h-3" /> Pending
        </Badge>
      );
  }
}

function ReconciliationBadge({ status }: { status?: string }) {
  switch (status) {
    case "matched":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Matched
        </Badge>
      );
    case "flagged_variance":
      return (
        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-0 gap-1">
          <AlertCircle className="h-3 w-3" /> Variance
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0 gap-1">
          <Clock className="h-3 w-3" /> Unmatched
        </Badge>
      );
  }
}

function sourceLabel(source?: string) {
  if (source === "card") return "Fleet card";
  return "Manual entry";
}

function expenseTotal(expense: FuelExpense) {
  const amount = expense.attributes.amount ?? expense.attributes.cost_per_volume;
  return amount && expense.attributes.volume ? amount * expense.attributes.volume : 0;
}

// ── Standardized Table Pagination ───────────────────────────────────────────

interface TablePaginationProps {
  pagination?: {
    current: number;
    lastPage: number;
    total: number;
  };
  onPageChange: (page: number) => void;
  variant?: "default" | "simple";
}

function TablePagination({
  pagination,
  onPageChange,
  variant = "default",
}: TablePaginationProps) {
  if (!pagination || pagination.lastPage <= 1) return null;

  if (variant === "simple") {
    return (
      <div className="flex items-center justify-between bg-slate-50/60 px-4 py-3">
        <p className="text-xs text-slate-500 font-medium">
          Page {pagination.current} of {pagination.lastPage}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs border-0 bg-white shadow-none"
            disabled={pagination.current <= 1}
            onClick={() => onPageChange(pagination.current - 1)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs border-0 bg-white shadow-none"
            disabled={pagination.current >= pagination.lastPage}
            onClick={() => onPageChange(pagination.current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-50/60">
      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
        Page {pagination.current} of {pagination.lastPage} &nbsp;·&nbsp;{" "}
        {pagination.total} records
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs font-bold uppercase tracking-wider border-0 bg-white shadow-none"
          disabled={pagination.current <= 1}
          onClick={() => onPageChange(pagination.current - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs font-bold uppercase tracking-wider border-0 bg-white shadow-none"
          disabled={pagination.current >= pagination.lastPage}
          onClick={() => onPageChange(pagination.current + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ── Reject reason dialog ─────────────────────────────────────────────────────

const rejectSchema = z.object({
  reason: z.string().min(3, "Please provide a reason."),
});

function RejectDialog({
  expenseId,
  onClose,
}: {
  expenseId: string | number | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ reason: string }>({
    resolver: zodResolver(rejectSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      api.rejectFuelExpense(expenseId!, reason),
    onSuccess: () => {
      toast.success("Expense rejected.");
      queryClient.invalidateQueries({ queryKey: ["fuel-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-expense-metrics"] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <Dialog
      open={!!expenseId}
      onOpenChange={() => {
        reset();
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
          <div>
            <Label htmlFor="reason">Rejection Reason</Label>
            <textarea
              id="reason"
              {...register("reason")}
              rows={3}
              placeholder="e.g. Receipt not attached."
              className="mt-1.5 w-full resize-none rounded-md bg-slate-50 px-3 py-2 text-sm focus:outline-none"
            />
            {errors.reason && (
              <p className="text-xs text-rose-500 mt-1">
                {errors.reason.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-0 bg-slate-100 shadow-none"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{" "}
              Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteExpenseDialog({
  expense,
  isPending,
  onClose,
  onConfirm,
}: {
  expense: FuelExpense | null;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!expense} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            Delete Expense
          </DialogTitle>
          <DialogDescription>
            This will permanently delete{" "}
            {expense?.attributes.reference_number || `EXP-${expense?.id}`} from
            the fuel expense ledger.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-0 bg-slate-100 shadow-none"
            onClick={onClose}
          >
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

// ── Log Expense dialog ───────────────────────────────────────────────────────

const logSchema = z.object({
  vehicle_id: z.string().min(1, "Vehicle is required"),
  cost_per_volume: z.coerce.number().positive("Enter cost per litre"),
  volume: z.coerce.number().positive("Enter volume"),
  entry_date: z.string().min(1, "Date is required"),
  purchase_from: z.string().optional(),
  reference_number: z.string().optional(),
});
type LogForm = z.infer<typeof logSchema>;

function LogExpenseDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LogForm>({
    resolver: zodResolver(logSchema) as Resolver<LogForm>,
    defaultValues: { entry_date: format(new Date(), "yyyy-MM-dd") },
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles", 1, ""],
    queryFn: () => getVehicles({ per_page: PAGE_SIZE_DROPDOWN }),
    enabled: open,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (d: LogForm) =>
      api.createFuelExpense({
        vehicle_id: Number(d.vehicle_id),
        user_id: Number(user?.id),
        cost_per_volume: d.cost_per_volume,
        volume: d.volume,
        entry_date: d.entry_date,
        purchase_from: d.purchase_from,
        reference_number: d.reference_number,
        status: "pending_approval",
      }),
    onSuccess: () => {
      toast.success("Expense logged successfully.");
      queryClient.invalidateQueries({ queryKey: ["fuel-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-expense-metrics"] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        reset();
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Fuel Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Vehicle</Label>
              <select
                {...register("vehicle_id")}
                className="mt-1.5 w-full rounded-md bg-slate-50 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">Select vehicle...</option>
                {vehiclesData?.data?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatVehicleRegistration(
                      v.attributes.registration_number,
                    )}{" "}
                    — {formatVehicleMakeModel(
                      v.attributes.make,
                      v.attributes.model,
                    )}
                  </option>
                ))}
              </select>
              {errors.vehicle_id && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.vehicle_id.message}
                </p>
              )}
            </div>
            <div>
              <Label>Volume (L)</Label>
              <Input
                {...register("volume")}
                type="number"
                step="0.1"
                placeholder="e.g. 35.0"
                className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
              />
              {errors.volume && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.volume.message}
                </p>
              )}
            </div>
            <div>
              <Label>Cost per Litre (₦)</Label>
              <Input
                {...register("cost_per_volume")}
                type="number"
                step="0.01"
                placeholder="e.g. 765.00"
                className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
              />
              {errors.cost_per_volume && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.cost_per_volume.message}
                </p>
              )}
            </div>
            <div>
              <Label>Date</Label>
              <Input
                {...register("entry_date")}
                type="date"
                className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
              />
              {errors.entry_date && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.entry_date.message}
                </p>
              )}
            </div>
            <div>
              <Label>
                Reference No. <span className="text-slate-400">(optional)</span>
              </Label>
              <Input
                {...register("reference_number")}
                placeholder="REF-00001"
                className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
              />
            </div>
            <div className="col-span-2">
              <Label>
                Purchase From <span className="text-slate-400">(optional)</span>
              </Label>
              <Input
                {...register("purchase_from")}
                placeholder="e.g. Total Energy Station VI"
                className="mt-1.5 border-0 bg-slate-50 shadow-none focus-visible:border-0 focus-visible:ring-0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-0 bg-slate-100 shadow-none"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{" "}
              Log Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Import dialog ────────────────────────────────────────────────────────────

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

function ImportFuelTransactionsDialog({
  open,
  isPending,
  onClose,
  onImport,
}: {
  open: boolean;
  isPending?: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  const templateMutation = useMutation({
    mutationFn: api.downloadFuelTransactionImportTemplate,
    onSuccess: (blob) =>
      downloadBlob(blob, "fuel-transactions-import-template.xlsx"),
    onError: (error) =>
      toast.error(extractApiError(error, "Failed to download template.")),
  });

  const close = () => {
    setFile(null);
    onClose();
  };

  const selectFile = (nextFile: File | undefined) => {
    if (!nextFile) return;
    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(extension ?? "")) {
      toast.error("Only Excel (.xlsx/.xls) and CSV files are accepted.");
      return;
    }
    setFile(nextFile);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Fuel Expenses</DialogTitle>
          <DialogDescription>
            Upload a filled fuel expense template. Column headers are matched
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50/60 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Start with the import template
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Use the expected columns before uploading fuel expense data.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-2 border-0 bg-white shadow-none"
                disabled={templateMutation.isPending}
                onClick={() => templateMutation.mutate()}
              >
                {templateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}{" "}
                Template
              </Button>
            </div>
          </div>

          <div>
            <Label>Expense File</Label>
            <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-8 text-center transition-colors hover:bg-blue-50/40">
              <FileSpreadsheet className="h-9 w-9 text-blue-500" />
              <span className="text-sm font-semibold text-slate-700">
                {file ? file.name : "Choose Excel or CSV file"}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                XLSX, XLS or CSV, max 10 MB
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                disabled={isPending}
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
            </label>
          </div>

          <p className="text-[12px] text-slate-500">
            Rows are reconciled in the background. You’ll receive an email
            report when the import completes.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="border-0 bg-slate-100 shadow-none" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={!file || isPending}
            onClick={() => file && onImport(file)}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function FuelExpensesPage() {
  const queryClient = useQueryClient();
  const addImportExportJob = useImportExportStore((s) => s.addJob);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reconciliationFilter, setReconciliationFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rejectId, setRejectId] = useState<string | number | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<FuelExpense | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "fuel-expenses",
      { page, search, statusFilter, reconciliationFilter, startDate, endDate },
    ],
    queryFn: () =>
      api.getFuelExpenses({
        page,
        per_page: PAGE_SIZE_DEFAULT,
        q: search || undefined,
        status: statusFilter || undefined,
        reconciliation_status: reconciliationFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const { data: metricsData } = useQuery({
    queryKey: ["fuel-expense-metrics"],
    queryFn: () => api.getFuelExpenseMetrics(),
  });

  const activeFilterCount = [
    search,
    statusFilter,
    reconciliationFilter,
    startDate,
    endDate,
  ].filter(Boolean).length;

  const refreshFuelExpenses = () => {
    queryClient.invalidateQueries({ queryKey: ["fuel-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["fuel-expense-metrics"] });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setReconciliationFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const { mutate: handleApprove, isPending: isApproving } = useMutation({
    mutationFn: (id: string | number) => api.approveFuelExpense(id),
    onSuccess: () => {
      toast.success("Expense approved.");
      refreshFuelExpenses();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const { mutate: handleUnlink, isPending: isUnlinking } = useMutation({
    mutationFn: (id: string | number) => api.unlinkExpenseTransaction(id),
    onSuccess: () => {
      toast.success("Matched transaction unlinked.");
      refreshFuelExpenses();
    },
    onError: (err) =>
      toast.error(extractApiError(err, "Failed to unlink transaction.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (expense: FuelExpense) => api.deleteFuelExpense(expense.id),
    onSuccess: () => {
      toast.success("Expense deleted.");
      refreshFuelExpenses();
      setDeleteExpense(null);
    },
    onError: (err) =>
      toast.error(extractApiError(err, "Failed to delete expense.")),
  });

  const importMutation = useMutation({
    mutationFn: ({ file, reprocess }: { file: File; reprocess?: boolean }) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.importFuelTransactions(formData, reprocess);
    },
    onSuccess: (response) => {
      const dataImportId =
        (response.data?.data_import_id ?? response.data?.fuel_import_id) != null
          ? String(response.data?.data_import_id ?? response.data?.fuel_import_id)
          : null;

      // Only ever show progress once the API confirms a pollable import exists —
      // a 2xx with no import id has nothing to track. This is the import
      // record's id, polled at /data-imports/{id}: it is not a batch id, and
      // sending it to /batch/{id} is what used to 404 the progress widget.
      if (dataImportId) {
        addImportExportJob({
          id: `fuel-import-${dataImportId}`,
          source: "data_import",
          sourceId: dataImportId,
          kind: "import",
          label: "Fuel transactions import",
        });
      }

      // The request only queued the file — reconciliation hasn't run yet, so
      // this can't claim success. The progress widget (and email report) is
      // what tells the user whether it actually succeeded.
      toast.message(
        response.message ||
          "Import queued. You’ll get an email report when reconciliation completes.",
      );
      queryClient.invalidateQueries({ queryKey: ["fuel-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-expense-metrics"] });
      setImportOpen(false);
    },
    // The request failed before any batch job could exist (e.g. the 422 file
    // validation error) — there is nothing to poll, so just surface the
    // error. No progress entry is ever created for a failed trigger request.
    onError: (error, variables) => {
      // 409 means the backend recognizes this exact file as already imported.
      // The message names the earlier import and explicitly invites a
      // reprocess=true resend, so offer that instead of a dead-end error.
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.error(extractApiError(error, "This file was already imported."), {
          action: {
            label: "Import anyway",
            onClick: () => importMutation.mutate({ file: variables.file, reprocess: true }),
          },
          duration: 15000,
        });
        return;
      }
      toast.error(
        extractApiError(error, "Failed to import fuel transactions."),
      );
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      api.exportFuelExpenses({
        q: search || undefined,
        status: statusFilter || undefined,
        reconciliation_status: reconciliationFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
    onSuccess: (blob) => {
      downloadBlob(
        blob,
        `fuel-expenses-${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
      toast.success("Fuel expenses export downloaded.");
    },
    onError: (error) =>
      toast.error(extractApiError(error, "Failed to export fuel expenses.")),
  });

  const m = metricsData?.data;
  const expenses: FuelExpense[] = data?.data?.fuel_expenses ?? [];
  const paginationData = data?.data?.pagination as
    | {
        current?: number;
        current_page?: number;
        lastPage?: number;
        last_page?: number;
        total?: number;
      }
    | undefined;

  // Map API pagination to component expectations (API uses camelCase, type uses snake_case)
  const pagination = paginationData
    ? {
        current: paginationData.current ?? paginationData.current_page ?? 1,
        lastPage: paginationData.lastPage ?? paginationData.last_page ?? 1,
        total: paginationData.total ?? 0,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Expense Ledger
          </h1>
          <p className="text-slate-500 mt-1">
            Log, review, and approve manual fuel purchase records.
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
            disabled={importMutation.isPending}
            onClick={() => setImportOpen(true)}
            className="border-0 bg-slate-100 shadow-none"
          >
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}{" "}
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="border-0 bg-slate-100 shadow-none"
          >
            {exportMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}{" "}
            Export CSV
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-0 bg-slate-100 shadow-none"
          >
            <Link href="/fuel/reconciliation">
              <GitCompare className="mr-2 h-4 w-4" /> Review Matches
            </Link>
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-none"
            onClick={() => setLogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Transaction
          </Button>
        </div>
      </div>

      <FuelTabs active="Fuel Expenses" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Volume
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {m ? Number(m.total_fuel_purchased.current).toFixed(1) : "—"}{" "}
              <span className="text-sm font-medium text-slate-500">L</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Cost
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {m
                ? `₦${m.total_cost.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Avg Cost / L
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {m ? `₦${Number(m.avg_price_per_litre.current).toFixed(2)}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Pending Approval
            </p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-amber-600">
                {m ? m.pending_approval.current : "—"}
              </p>
              {m && m.pending_approval.current > 0 && (
                <Clock className="h-4 w-4 text-amber-500 mb-1" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm text-left">
              <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4">Expense</th>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">Date & Source</th>
                  <th className="px-6 py-4 whitespace-nowrap">Volume</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Reconciliation</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
                        <div className="h-3 w-24 bg-slate-100 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-slate-200 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-24 bg-slate-200 rounded mb-1" />
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-24 bg-slate-200 rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-20 bg-slate-200 rounded-full" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-8 w-20 bg-slate-200 rounded ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-6">
                      <QueryError
                        message="Failed to load fuel expenses."
                        onRetry={refetch}
                      />
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-20 text-center text-slate-400"
                    >
                      No fuel expenses found.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const vehicle = exp.relationships.vehicle;
                    const driver = exp.relationships.driver;
                    const unitPrice =
                      exp.attributes.amount ?? exp.attributes.cost_per_volume;
                    return (
                      <tr
                        key={exp.id}
                        className="transition-colors even:bg-slate-50/40 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2.5">
                            <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <div>
                              <div className="font-bold text-slate-900">
                                {exp.attributes.reference_number ||
                                  `EXP-${exp.id}`}
                              </div>
                              <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                                {exp.attributes.purchase_from ||
                                  "No station recorded"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                              <Truck className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 uppercase">
                                {vehicle
                                  ? formatVehicleRegistration(
                                      vehicle.registration_number,
                                    )
                                  : "UNKNOWN"}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                {vehicle
                                  ? formatVehicleMakeModel(
                                      vehicle.make,
                                      vehicle.model,
                                    ) || "No model"
                                  : "No vehicle details"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="font-semibold text-slate-800">
                            {format(
                              new Date(exp.attributes.entry_date),
                              "MMM dd, yyyy",
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {sourceLabel(exp.attributes.source)} ·{" "}
                            {driver?.name ?? "No driver"}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-800">
                          {(exp.attributes.volume ?? 0).toFixed(1)} L
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono font-bold text-slate-900 text-base">
                            {exp.attributes.currency || "NGN"}{" "}
                            {expenseTotal(exp).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {unitPrice
                              ? `${exp.attributes.currency || "NGN"} ${unitPrice.toFixed(2)}/L`
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <ReconciliationBadge
                            status={exp.attributes.reconciliation_status}
                          />
                          {exp.attributes.reason && (
                            <div className="mt-1 max-w-56 whitespace-normal text-[11px] leading-4 text-slate-400">
                              {exp.attributes.reason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={exp.attributes.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                aria-label={`Open actions for expense ${exp.attributes.reference_number || exp.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-52 border-0 shadow-lg"
                            >
                              {["pending_approval", "flagged_for_review"].includes(
                                exp.attributes.status,
                              ) && (
                                <>
                                  <DropdownMenuItem
                                    disabled={isApproving}
                                    onSelect={() => handleApprove(exp.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Approve expense
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => setRejectId(exp.id)}
                                  >
                                    <XCircle className="h-4 w-4 text-rose-600" />
                                    Reject expense
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {exp.attributes.receipt_url && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={exp.attributes.receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4 text-blue-600" />
                                    Open receipt
                                  </a>
                                </DropdownMenuItem>
                              )}
                              {exp.relationships.fuel_transaction && (
                                <DropdownMenuItem
                                  disabled={isUnlinking}
                                  onSelect={() => handleUnlink(exp.id)}
                                >
                                  <Link2Off className="h-4 w-4 text-amber-600" />
                                  Unlink transaction
                                </DropdownMenuItem>
                              )}
                              {(exp.attributes.receipt_url ||
                                exp.relationships.fuel_transaction) && (
                                <DropdownMenuSeparator />
                              )}
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleteExpense(exp)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete expense
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination pagination={pagination} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="w-full border-0 p-0 shadow-none sm:max-w-md"
        >
          <SheetHeader className="px-5 pt-5 text-left">
            <SheetTitle>Fuel Expense Filters</SheetTitle>
            <SheetDescription>
              Refine the expense ledger by status, reconciliation, date, and
              search terms.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-4">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Search
              </Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search vehicle, driver, reference..."
                  className="h-9 border-0 bg-slate-50 pl-9 shadow-none focus-visible:border-0 focus-visible:ring-0"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Status
              </Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md bg-slate-50 px-3 text-sm focus:outline-none"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="pending_approval">Pending</option>
                <option value="flagged_for_review">Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="reimbursed">Reimbursed</option>
              </select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reconciliation
              </Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md bg-slate-50 px-3 text-sm focus:outline-none"
                value={reconciliationFilter}
                onChange={(event) => {
                  setReconciliationFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Records</option>
                <option value="matched">Matched</option>
                <option value="flagged_variance">Variance</option>
                <option value="unmatched">Unmatched</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  From
                </Label>
                <Input
                  type="date"
                  className="mt-1.5 h-9 border-0 bg-slate-50 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  To
                </Label>
                <Input
                  type="date"
                  className="mt-1.5 h-9 border-0 bg-slate-50 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full border-0 bg-slate-100 shadow-none"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <LogExpenseDialog open={logOpen} onClose={() => setLogOpen(false)} />
      <RejectDialog expenseId={rejectId} onClose={() => setRejectId(null)} />
      <DeleteExpenseDialog
        expense={deleteExpense}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteExpense(null)}
        onConfirm={() => {
          if (deleteExpense) deleteMutation.mutate(deleteExpense);
        }}
      />
      <ImportFuelTransactionsDialog
        open={importOpen}
        isPending={importMutation.isPending}
        onClose={() => setImportOpen(false)}
        onImport={(file) => importMutation.mutate({ file })}
      />
    </div>
  );
}
