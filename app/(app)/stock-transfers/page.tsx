"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PermissionGate } from "@/components/permission-gate";
import { FrappeButtonPrimary } from "@/components/frappe";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { buildStockTransfersListPath } from "@/lib/list-query";
import type { TransferStatus } from "@/lib/types";
import { useLocations } from "@/hooks/use-locations";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { PlusIcon } from "lucide-react";

interface TransferRow {
  id: string;
  status: string;
  fromLocation?: { name: string };
  toLocation?: { name: string };
  createdAt?: string;
}

export default function StockTransfersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TransferStatus | "">("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: locations } = useLocations();

  const { rows, meta, setPage, setLimit, loading } =
    usePaginatedList<TransferRow>(
      (page, limit) =>
        buildStockTransfersListPath(
          {
            from: from || undefined,
            to: to || undefined,
            search: debouncedSearch || undefined,
            status: status || undefined,
            fromLocationId: fromLocationId || undefined,
            toLocationId: toLocationId || undefined,
          },
          page,
          limit,
        ),
      [from, to, debouncedSearch, status, fromLocationId, toLocationId],
    );

  const activeFilterCount = useMemo(
    () =>
      countActiveFilters([from, to, status, fromLocationId, toLocationId]),
    [from, to, status, fromLocationId, toLocationId],
  );

  function resetFilters() {
    setFrom("");
    setTo("");
    setStatus("");
    setFromLocationId("");
    setToLocationId("");
  }

  return (
    <AppShell
      title="Stock Transfers"
      actions={
        <PermissionGate permission="stock_transfer.write">
          <FrappeButtonPrimary asChild>
            <Link href="/stock-transfers/new">
              <PlusIcon className="size-3.5" />
              New transfer
            </Link>
          </FrappeButtonPrimary>
        </PermissionGate>
      }
    >
      <PermissionGate permission="stock_transfer.read" showDenied>
        <DataCardTable
          storageKey="stock-transfers-list"
          rows={rows}
          loading={loading}
          filters={
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search transfers..."
            />
          }
          toolbar={
            <TableFiltersSheet
              activeCount={activeFilterCount}
              onReset={resetFilters}
            >
              <FilterField label="Date range">
                <DateRangeFilter
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                  compact={false}
                />
              </FilterField>
              <FilterField label="Status">
                <Select
                  value={status || "__all__"}
                  onValueChange={(v) =>
                    setStatus(v === "__all__" ? "" : (v as TransferStatus))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_TRANSIT">In transit</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="From location">
                <Select
                  value={fromLocationId || "__all__"}
                  onValueChange={(v) =>
                    setFromLocationId(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="From location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">From any location</SelectItem>
                    {(locations ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="To location">
                <Select
                  value={toLocationId || "__all__"}
                  onValueChange={(v) =>
                    setToLocationId(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="To location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">To any location</SelectItem>
                    {(locations ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </TableFiltersSheet>
          }
          emptyTitle="No transfers"
          pagination={{
            meta,
            onPageChange: setPage,
            onLimitChange: setLimit,
            disabled: loading,
          }}
          columns={[
            {
              key: "id",
              header: "ID",
              cell: (r) => (
                <Link
                  href={`/stock-transfers/${r.id}`}
                  className="font-medium text-[var(--frappe-primary)] hover:underline"
                >
                  {r.id.slice(0, 8)}…
                </Link>
              ),
            },
            {
              key: "from",
              header: "From",
              cell: (r) => r.fromLocation?.name ?? "—",
            },
            {
              key: "to",
              header: "To",
              cell: (r) => r.toLocation?.name ?? "—",
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <Badge variant="outline">{r.status}</Badge>,
            },
            {
              key: "date",
              header: "Date",
              cell: (r) =>
                r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—",
            },
          ]}
        />
      </PermissionGate>
    </AppShell>
  );
}
