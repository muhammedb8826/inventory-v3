"use client";

import { useState } from "react";
import { DataCardTable } from "@/components/shared/data-card-table";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import { FrappeFilterBar, FrappeListToolbar } from "@/components/frappe";
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
  STOCK_MOVEMENT_TYPE_OPTIONS,
  stockMovementTypeLabel,
} from "@/lib/inventory-movements";
import { buildInventoryMovementsListPath } from "@/lib/list-query";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import type { StockMovement, StockMovementType } from "@/lib/types";

const ALL = "__all__";

export function InventoryMovementsPanel() {
  const [locationId, setLocationId] = useState(ALL);
  const [type, setType] = useState<StockMovementType | "">("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: locations } = useLocations();

  const { rows, meta, setPage, setLimit, loading } =
    usePaginatedList<StockMovement>(
      (page, limit) =>
        buildInventoryMovementsListPath(
          {
            locationId: locationId === ALL ? undefined : locationId,
            type: type || undefined,
            search: debouncedSearch || undefined,
            from: from || undefined,
            to: to || undefined,
          },
          page,
          limit
        ),
      [locationId, type, debouncedSearch, from, to]
    );

  return (
    <DataCardTable
      storageKey="inventory-movements"
      rows={rows}
      loading={loading}
      emptyTitle="No stock movements"
      emptyDescription="Sales, purchases, transfers, production, and adjustments appear here as an immutable ledger."
      leading={
        <FrappeListToolbar>
          <span>
            {meta.total} movement{meta.total === 1 ? "" : "s"}
          </span>
        </FrappeListToolbar>
      }
      filters={
        <FrappeFilterBar>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="h-9 w-[200px]">
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
          <Select
            value={type || ALL}
            onValueChange={(v) =>
              setType(v === ALL ? "" : (v as StockMovementType))
            }
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {STOCK_MOVEMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder="Search notes, SKU, item…"
          />
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </FrappeFilterBar>
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
              key: "type",
              header: "Type",
              cell: (r) => (
                <Badge variant="outline">{stockMovementTypeLabel(r.type)}</Badge>
              ),
            },
            {
              key: "delta",
              header: "Delta",
              className: "text-right tabular-nums",
              cell: (r) => {
                const delta = Number(r.quantityDelta);
                const sign = delta > 0 ? "+" : "";
                return `${sign}${formatQty(r.quantityDelta)}`;
              },
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
              key: "cost",
              header: "Unit cost",
              className: "text-right tabular-nums",
              cell: (r) =>
                r.unitCost != null && r.unitCost !== ""
                  ? formatMoney(r.unitCost)
                  : "—",
            },
            {
              key: "ref",
              header: "Reference",
              cell: (r) =>
                r.refType
                  ? `${r.refType}${r.refId ? ` · ${r.refId.slice(0, 8)}…` : ""}`
                  : "—",
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
