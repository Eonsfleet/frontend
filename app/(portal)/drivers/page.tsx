"use client";

import React from "react";
import { DriverTable } from "@/components/drivers/DriverTable";
import { Button } from "@/components/ui/button";
import { Search, Upload, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AddDriverDialog } from "@/components/drivers/AddDriverDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDrivers } from "@/lib/api/drivers";
import { AssignVehicleDialog } from "@/components/drivers/AssignVehicleDialog";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { ExportDialog } from "@/components/shared/ExportDialog";
import { QueryError } from "@/components/shared/QueryError";
import { UserProfile } from "@/types";
import { DriverFilters } from "@/components/drivers/DriverFilters";

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedDriver, setSelectedDriver] =
    React.useState<UserProfile | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<{ status?: string }>({});
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isExportOpen, setIsExportOpen] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["drivers", search, page, filter],
    queryFn: () => getDrivers({ q: search, page, status: filter.status }),
  });

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleAssignVehicle = (driver: UserProfile) => {
    setSelectedDriver(driver);
    setIsAssignModalOpen(true);
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Drivers
          </h1>
          <p className="text-slate-500 mt-1">
            Manage driver registry, performance, and vehicle assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <AddDriverDialog />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name or ID..."
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-10"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <DriverFilters filters={filter} onFiltersChange={setFilter} />
      </div>

      {isError && (
        <QueryError message="Failed to load drivers." onRetry={refetch} />
      )}

      <DriverTable
        data={data?.data || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        onAssignVehicle={handleAssignVehicle}
      />

      {selectedDriver && (
        <AssignVehicleDialog
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedDriver(null);
          }}
          driverId={selectedDriver.id}
          driverName={selectedDriver.attributes.full_name}
        />
      )}

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entity="drivers"
        model="User"
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["drivers"] })}
      />

      <ExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        entity="drivers"
      />
    </div>
  );
}
