"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataCardTable } from "@/components/shared/data-card-table";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  stockMovementDocumentHref,
  stockMovementRefLabel,
  stockMovementTypeLabel,
  type StockMovementRefFilters,
} from "@/lib/inventory-movements";
import { buildInventoryMovementsListPath } from "@/lib/list-query";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import type { StockMovement, StockMovementType } from "@/lib/types";
import { XIcon } from "lucide-react";

const ALL = "__all__";

export function InventoryMovementsPanel({
  lockedFilters,
  onClearLockedFilters,
}: {
  lockedFilters?: StockMovementRefFilters;
  onClearLockedFilters?: () => void;
} = {}) {
  const [locationId, setLocationId] = useState(ALL);
  const [type, setType] = useState<StockMovementType | "">("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: locations } = useLocations();

  const lockedRefType = lockedFilters?.refType?.trim() || undefined;
  const lockedRefId = lockedFilters?.refId?.trim() || undefined;
  const lockedItemId = lockedFilters?.itemId?.trim() || undefined;
  const lockedLocationId = lockedFilters?.locationId?.trim() || undefined;
  const hasLockedFilters = Boolean(
    lockedRefType || lockedRefId || lockedItemId || lockedLocationId
  );

  useEffect(() => {
    if (lockedLocationId) setLocationId(lockedLocationId);
  }, [lockedLocationId]);

  const effectiveLocationId =
    lockedLocationId ?? (locationId === ALL ? undefined : locationId);

  const { rows, meta, setPage, setLimit, loading } =
    usePaginatedList<StockMovement>(
      (page, limit) =>
        buildInventoryMovementsListPath(
          {
            locationId: effectiveLocationId,
            type: type || undefined,
            search: debouncedSearch || undefined,
            from: from || undefined,
            to: to || undefined,
            refType: lockedRefType,
            refId: lockedRefId,
            itemId: lockedItemId,
          },
          page,
          limit
        ),
      [
        effectiveLocationId,
        type,
        debouncedSearch,
        from,
        to,
        lockedRefType,
        lockedRefId,
        lockedItemId,
      ]
    );

  const activeFilterCount = useMemo(
    () =>
      countActiveFilters([
        !lockedLocationId && locationId !== ALL ? locationId : "",
        type,
        from,
        to,
      ]),
    [lockedLocationId, locationId, type, from, to]
  );

  function resetFilters() {
    if (!lockedLocationId) setLocationId(ALL);
    setType("");
    setFrom("");
    setTo("");
  }

  const lockedBanner = hasLockedFilters ? (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-50">
      <span className="font-medium">Filtered ledger</span>
      {lockedRefType || lockedRefId ? (
        <Badge variant="secondary" className="font-normal">
          {stockMovementRefLabel(lockedRefType, lockedRefId)}
        </Badge>
      ) : null}
      {lockedItemId ? (
        <Badge variant="secondary" className="font-mono text-[10px] font-normal">
          item {lockedItemId.slice(0, 8)}…
        </Badge>
      ) : null}
      {lockedLocationId ? (
        <Badge variant="secondary" className="font-normal">
          {(locations ?? []).find((l) => l.id === lockedLocationId)?.name ??
            "Location"}
        </Badge>
      ) : null}
      {onClearLockedFilters ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto h-7 gap-1 px-2"
          onClick={onClearLockedFilters}
        >
          <XIcon className="size-3.5" />
          Clear
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {lockedBanner}
      <DataCardTable
        storageKey="inventory-movements"
        rows={rows}
        loading={loading}
        emptyTitle="No stock movements"
        emptyDescription="Sales, purchases, transfers, production, and adjustments appear here as an immutable ledger."
        filters={
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder="Search notes, SKU, item…"
          />
        }
        toolbar={
          <TableFiltersSheet
            activeCount={activeFilterCount}
            onReset={resetFilters}
          >
            <FilterField label="Location">
              <Select
                value={effectiveLocationId ?? ALL}
                onValueChange={setLocationId}
                disabled={Boolean(lockedLocationId)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl">
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
            <FilterField label="Type">
              <Select
                value={type || ALL}
                onValueChange={(v) =>
                  setType(v === ALL ? "" : (v as StockMovementType))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-xl">
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
            cell: (r) => {
              const label = stockMovementRefLabel(r.refType, r.refId);
              const href = stockMovementDocumentHref(r.refType, r.refId);
              if (!href) return label;
              return (
                <Link
                  href={href}
                  className="text-[var(--frappe-primary)] hover:underline"
                >
                  {label}
                </Link>
              );
            },
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
    </div>
  );
}
