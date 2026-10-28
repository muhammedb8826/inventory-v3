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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildProductionOrdersListPath } from "@/lib/list-query";
import { formatDate, formatQty } from "@/lib/format";
import {
  PRODUCTION_STATUS_OPTIONS,
  productionStatusLabel,
} from "@/lib/production";
import type { ProductionOrder, ProductionOrderStatus } from "@/lib/types";
import { useLocations } from "@/hooks/use-locations";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { PlusIcon } from "lucide-react";

const ALL = "__all__";

export default function ProductionOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductionOrderStatus | "">("");
  const [locationId, setLocationId] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: locations } = useLocations();

  const { rows, meta, setPage, setLimit, loading } =
    usePaginatedList<ProductionOrder>(
      (page, limit) =>
        buildProductionOrdersListPath(
          {
            search: debouncedSearch || undefined,
            status: status || undefined,
            locationId: locationId === ALL ? undefined : locationId,
            from: from || undefined,
            to: to || undefined,
          },
          page,
          limit,
        ),
      [debouncedSearch, status, locationId, from, to],
    );

  const activeFilterCount = useMemo(
    () =>
      countActiveFilters([
        status,
        locationId !== ALL ? locationId : "",
        from,
        to,
      ]),
    [status, locationId, from, to],
  );

  function resetFilters() {
    setStatus("");
    setLocationId(ALL);
    setFrom("");
    setTo("");
  }

  return (
    <AppShell
      title="Production Orders"
      subtitle="Release, issue materials, and receive finished goods"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Production" },
      ]}
      actions={
        <PermissionGate permission="production.write">
          <FrappeButtonPrimary asChild>
            <Link href="/production-orders/new">
              <PlusIcon className="size-3.5" />
              New order
            </Link>
          </FrappeButtonPrimary>
        </PermissionGate>
      }
    >
      <PermissionGate permission="production.read" showDenied>
        <DataCardTable
          storageKey="production-orders-list"
          rows={rows}
          loading={loading}
          filters={
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search orders?"
            />
          }
          toolbar={
            <TableFiltersSheet
              activeCount={activeFilterCount}
              onReset={resetFilters}
            >
              <FilterField label="Location">
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All locations</SelectItem>
                    {(locations ?? []).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Status">
                <Select
                  value={status || ALL}
                  onValueChange={(v) =>
                    setStatus(v === ALL ? "" : (v as ProductionOrderStatus))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All statuses</SelectItem>
                    {PRODUCTION_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Date range">
                <DateRangeFilter
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                  compact={false}
                />
              </FilterField>
            </TableFiltersSheet>
          }
          emptyTitle="No production orders"
          emptyDescription="Create an order from an active BOM."
          pagination={{
            meta,
            onPageChange: setPage,
            onLimitChange: setLimit,
            disabled: loading,
          }}
          columns={[
            {
              key: "id",
              header: "Order",
              cell: (r) => (
                <Link
                  href={`/production-orders/${r.id}`}
                  className="font-medium text-[var(--frappe-primary)] hover:underline"
                >
                  {r.id.slice(0, 8)}?
                </Link>
              ),
            },
            {
              key: "bom",
              header: "BOM",
              cell: (r) => r.bom?.name ?? "?",
            },
            {
              key: "finished",
              header: "Finished item",
              cell: (r) =>
                r.finishedItem?.description ??
                r.bom?.finishedItem?.description ??
                "?",
            },
            {
              key: "location",
              header: "Location",
              cell: (r) => r.location?.name ?? "?",
            },
            {
              key: "qty",
              header: "Planned",
              className: "text-right tabular-nums",
              cell: (r) => formatQty(r.quantityPlanned),
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => (
                <Badge variant="outline">
                  {productionStatusLabel(r.status)}
                </Badge>
              ),
            },
            {
              key: "date",
              header: "Created",
              cell: (r) => formatDate(r.createdAt),
            },
          ]}
        />
      </PermissionGate>
    </AppShell>
  );
}
