"use client";

import { useMemo, useState } from "react";
import { DataCardTable } from "@/components/shared/data-card-table";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useLocations } from "@/hooks/use-locations";
import {
  STOCK_ADJUSTMENT_REASON_OPTIONS,
  stockAdjustmentReasonLabel,
} from "@/lib/inventory-adjustments";
import { buildInventoryAdjustmentsListPath } from "@/lib/list-query";
import { formatDate, formatQty } from "@/lib/format";
import type {
  StockAdjustment,
  StockAdjustmentDirection,
  StockAdjustmentReason,
} from "@/lib/types";

const ALL = "__all__";

export function InventoryAdjustmentsPanel() {
  const [locationId, setLocationId] = useState(ALL);
  const [direction, setDirection] = useState<StockAdjustmentDirection | "">(
    ""
  );
  const [reason, setReason] = useState<StockAdjustmentReason | "">("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: locations } = useLocations();

  const { rows, meta, setPage, setLimit, loading } =
    usePaginatedList<StockAdjustment>(
      (page, limit) =>
        buildInventoryAdjustmentsListPath(
          {
            locationId: locationId === ALL ? undefined : locationId,
            direction: direction || undefined,
            reason: reason || undefined,
            search: debouncedSearch || undefined,
            from: from || undefined,
            to: to || undefined,
          },
          page,
          limit
        ),
      [locationId, direction, reason, debouncedSearch, from, to]
    );

  const activeFilterCount = useMemo(
    () =>
      countActiveFilters([
        locationId !== ALL ? locationId : "",
        direction,
        reason,
        from,
        to,
      ]),
    [locationId, direction, reason, from, to]
  );

  function resetFilters() {
    setLocationId(ALL);
    setDirection("");
    setReason("");
    setFrom("");
    setTo("");
  }

  return (
    <DataCardTable
      storageKey="inventory-adjustments"
      rows={rows}
      loading={loading}
      emptyTitle="No adjustments"
      emptyDescription="Post an adjustment from a stock row to change quantity with an audit trail."
      filters={
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Search notes or reference…"
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
                    {loc.name} ({loc.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Direction">
            <Select
              value={direction || ALL}
              onValueChange={(v) =>
                setDirection(v === ALL ? "" : (v as StockAdjustmentDirection))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                <SelectItem value="in">In</SelectItem>
                <SelectItem value="out">Out</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Reason">
            <Select
              value={reason || ALL}
              onValueChange={(v) =>
                setReason(v === ALL ? "" : (v as StockAdjustmentReason))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All reasons</SelectItem>
                {STOCK_ADJUSTMENT_REASON_OPTIONS.map((option) => (
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
      pagination={{
        meta,
        onPageChange: setPage,
        onLimitChange: setLimit,
        disabled: loading,
      }}
      columns={[
        {
          key: "date",
          header: "Date",
          cell: (r) => formatDate(r.createdAt),
        },
        {
          key: "item",
          header: "Item",
          cell: (r) =>
            r.item?.description ??
            (r.itemId ? `${r.itemId.slice(0, 8)}…` : "—"),
        },
        {
          key: "location",
          header: "Location",
          cell: (r) => r.location?.name ?? "—",
        },
        {
          key: "direction",
          header: "Direction",
          cell: (r) => (
            <Badge variant={r.direction === "in" ? "outline" : "secondary"}>
              {r.direction === "in" ? "In" : "Out"}
            </Badge>
          ),
        },
        {
          key: "qty",
          header: "Qty",
          className: "text-right tabular-nums",
          cell: (r) =>
            `${r.direction === "out" ? "−" : "+"}${formatQty(r.quantity)}`,
        },
        {
          key: "before",
          header: "Before",
          className: "text-right tabular-nums",
          cell: (r) => formatQty(r.quantityBefore),
        },
        {
          key: "after",
          header: "After",
          className: "text-right tabular-nums",
          cell: (r) => formatQty(r.quantityAfter),
        },
        {
          key: "reason",
          header: "Reason",
          cell: (r) => stockAdjustmentReasonLabel(r.reason),
        },
        {
          key: "ref",
          header: "Reference",
          cell: (r) => r.reference || "—",
        },
        {
          key: "notes",
          header: "Notes",
          cell: (r) => r.notes || "—",
        },
        {
          key: "by",
          header: "By",
          cell: (r) => r.createdBy?.fullName ?? "—",
        },
      ]}
    />
  );
}
