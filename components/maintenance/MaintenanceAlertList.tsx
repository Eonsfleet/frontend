"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaintenanceAlert } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeMaintenanceAlert,
  createWorkOrderFromAlert,
} from "@/lib/api/maintenance";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Wrench,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface MaintenanceAlertListProps {
  alerts: MaintenanceAlert[];
  isLoading?: boolean;
}

export function MaintenanceAlertList({
  alerts,
  isLoading,
}: MaintenanceAlertListProps) {
  const queryClient = useQueryClient();

  const { mutate: handleAcknowledge, isPending: isAcknowledging } = useMutation(
    {
      mutationFn: (id: string) => acknowledgeMaintenanceAlert(id),
      onSuccess: () => {
        toast.success("Alert acknowledged");
        queryClient.invalidateQueries({ queryKey: ["maintenance-alerts"] });
      },
      onError: () => toast.error("Failed to acknowledge alert"),
    },
  );

  const { mutate: handleCreateWO, isPending: isCreatingWO } = useMutation({
    mutationFn: (id: string) => createWorkOrderFromAlert(id),
    onSuccess: (data) => {
      toast.success("Work order created automatically");
      queryClient.invalidateQueries({ queryKey: ["maintenance-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-jobs"] });
    },
    onError: () => toast.error("Failed to create work order"),
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-500">Loading alerts...</div>
    );
  }

  if (!alerts?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
        <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
        <p className="text-sm font-medium text-slate-900">All caught up!</p>
        <p className="text-xs text-slate-500 mt-1">
          No active maintenance alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const isCritical = alert.attributes.severity === "critical";
        const isWarning = alert.attributes.severity === "warning";
        const Icon = isCritical
          ? AlertCircle
          : isWarning
            ? AlertTriangle
            : Info;
        const colorClass = isCritical
          ? "text-rose-500 bg-rose-50 border-rose-200"
          : isWarning
            ? "text-amber-500 bg-amber-50 border-amber-200"
            : "text-blue-500 bg-blue-50 border-blue-200";

        return (
          <Card
            key={alert.id}
            className={`border ${colorClass} shadow-sm transition-all hover:shadow-md`}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3 items-start">
                <div className={`p-2 rounded-full bg-white/50 shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {alert?.attributes?.type?.replace("_", " ").toUpperCase()}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase border-${colorClass.split(" ")[0].split("-")[1]}-200`}
                    >
                      {alert.relationships.vehicle.data.id}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700">
                    {alert?.attributes?.message}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {formatDistanceToNow(
                      new Date(alert?.attributes?.created_at),
                      { addSuffix: true },
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200/50">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full sm:w-auto text-slate-600 hover:text-slate-900 bg-white"
                  onClick={() => handleAcknowledge(alert.id)}
                  // Make sure we type narrow correctly if handling loading state per row,
                  // but for simplicity we rely on the global loading overlay inside button if needed
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={() => handleCreateWO(alert.id)}
                >
                  <Wrench className="h-3.5 w-3.5 mr-1.5" />
                  Create WO
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
