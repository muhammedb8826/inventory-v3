"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PermissionGate } from "@/components/permission-gate";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { buildInventoryListPath, buildLowStockListPath } from "@/lib/list-query";
import { resolveItemImageUrl } from "@/lib/inventory-media";
import { formatMoney, formatQty, errorMessage } from "@/lib/format";
import type {
  InventoryListTotals,
  LowStockRecord,
  StockRecord,
} from "@/lib/types";
import { itemTypeLabel } from "@/lib/item-types";
import { ListSummaryCards } from "@/components/shared/list-summary-cards";
import { useLocations } from "@/hooks/use-locations";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoxesIcon, PackageIcon, WalletIcon } from "lucide-react";
import { ExportInventoryButton } from "@/components/inventory/export-inventory-button";
import { InventoryAdjustmentsPanel } from "@/components/inventory/inventory-adjustments-panel";
import { InventoryMovementsPanel } from "@/components/inventory/inventory-movements-panel";
import { StockAdjustDialog } from "@/components/inventory/stock-adjust-dialog";
import { StockDetailDialog } from "@/components/inventory/stock-detail-dialog";
import Link from "next/link";
import { FrappeButtonPrimary } from "@/components/frappe";
import { StockLevelBar } from "@/components/inventory/stock-level-bar";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import {
  ImageIcon,
  UploadIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

const ALL_LOCATIONS = "__all__";
const VIEW_ALL = "all";
const VIEW_LOW_STOCK = "low-stock";

type InventoryTab = "stock" | "adjustments" | "movements";

export default function InventoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: InventoryTab =
    tabParam === "adjustments" || tabParam === "movements"
      ? tabParam
      : "stock";

  const movementLockedFilters = useMemo(
    () => ({
      refType: searchParams.get("refType") ?? undefined,
      refId: searchParams.get("refId") ?? undefined,
      itemId: searchParams.get("itemId") ?? undefined,
      locationId: searchParams.get("locationId") ?? undefined,
    }),
    [searchParams]
  );

  const setInventoryTab = useCallback(
    (tab: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (tab === "stock") {
        next.delete("tab");
        next.delete("refType");
        next.delete("refId");
        next.delete("itemId");
        next.delete("locationId");
      } else {
        next.set("tab", tab);
        if (tab !== "movements") {
          next.delete("refType");
          next.delete("refId");
          next.delete("itemId");
          next.delete("locationId");
        }
      }
      const qs = next.toString();
      router.replace(qs ? `/inventory?${qs}` : "/inventory", { scroll: false });
    },
    [router, searchParams]
  );

  const clearMovementLockedFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "movements");
    next.delete("refType");
    next.delete("refId");
    next.delete("itemId");
    next.delete("locationId");
    router.replace(`/inventory?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const [locationFilter, setLocationFilter] = useState(ALL_LOCATIONS);
  const [viewMode, setViewMode] = useState<typeof VIEW_ALL | typeof VIEW_LOW_STOCK>(
    VIEW_ALL
  );
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const { data: locations } = useLocations();

  const listLocationId =
    locationFilter === ALL_LOCATIONS ? undefined : locationFilter;
  const isAllLocations = locationFilter === ALL_LOCATIONS;

  const selectedLocation = (locations ?? []).find(
    (loc) => loc.id === listLocationId
  );
  const locationLabel = isAllLocations
    ? "all-locations"
    : selectedLocation
      ? `${selectedLocation.name}-${selectedLocation.type}`
      : "stock";

  const exportFilters = {
    locationId: listLocationId,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
  };

  const isLowStockView = viewMode === VIEW_LOW_STOCK;

  const { rows, meta, totals, setPage, setLimit, loading, reload } =
    usePaginatedList<StockRecord | LowStockRecord, InventoryListTotals>(
    (page, limit) => {
      if (isLowStockView) {
        return buildLowStockListPath(
          { locationId: listLocationId },
          page,
          limit
        );
      }
      return buildInventoryListPath(
        {
          locationId: listLocationId,
          from: from || undefined,
          to: to || undefined,
          search: debouncedSearch || undefined,
        },
        page,
        limit
      );
    },
    [listLocationId, from, to, debouncedSearch, isLowStockView]
  );

  return (
    <AppShell
      title="Inventory"
      subtitle="Products, quantities, and stock health across locations"
      breadcrumbs={[
        { label: "Operations", href: "/dashboard" },
        { label: "Inventory" },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate permission="inventory.write">
            <FrappeButtonPrimary asChild>
              <Link
                href={
                  listLocationId
                    ? `/inventory/new?locationId=${listLocationId}`
                    : "/inventory/new"
                }
              >
                <PlusIcon className="size-3.5" />
                Add item
              </Link>
            </FrappeButtonPrimary>
          </PermissionGate>
          <PermissionGate permission="inventory.read">
            <ExportInventoryButton
              filters={exportFilters}
              locationLabel={locationLabel}
              disabled={loading}
            />
          </PermissionGate>
          <PermissionGate permission="inventory.import">
            <ImportDialog
              locationId={listLocationId ?? ""}
              disabled={isAllLocations}
              onSuccess={reload}
            />
          </PermissionGate>
        </div>
      }
    >
      <PermissionGate permission="inventory.read" showDenied>
        <Tabs
          value={activeTab}
          onValueChange={setInventoryTab}
          className="gap-4"
        >
          <TabsList className="mb-1 h-11 rounded-full bg-muted/60 p-1 shadow-none">
            <TabsTrigger value="stock" className="rounded-full px-4">
              All products
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="rounded-full px-4">
              Adjustments
            </TabsTrigger>
            <TabsTrigger value="movements" className="rounded-full px-4">
              Movements
            </TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="mt-0 space-y-0">
          {!isLowStockView ? (
            <ListSummaryCards
              items={[
                {
                  label: "Items",
                  value: meta.total.toLocaleString(),
                  icon: PackageIcon,
                  tone: "slate",
                  badge: { label: "Catalog", tone: "muted" },
                },
                {
                  label: "Total qty",
                  value: formatQty(totals?.quantity ?? 0),
                  icon: BoxesIcon,
                  tone: "sky",
                  badge: { label: "On hand", tone: "info" },
                },
                {
                  label: "Stock value",
                  value: formatMoney(totals?.inventoryValue ?? 0),
                  icon: WalletIcon,
                  tone: "teal",
                  badge: { label: "Healthy", tone: "success" },
                },
              ]}
            />
          ) : (
            <ListSummaryCards
              items={[
                {
                  label: "Low-stock items",
                  value: meta.total.toLocaleString(),
                  icon: PackageIcon,
                  tone: "amber",
                  badge: { label: "Urgent", tone: "danger" },
                },
              ]}
            />
          )}
          <DataCardTable
            storageKey={`inventory-${isLowStockView ? "low" : "all"}`}
            rows={rows}
            loading={loading}
            emptyTitle={
              isLowStockView
                ? "No low-stock items"
                : isAllLocations
                  ? "No stock found"
                  : "No stock at this location"
            }
            emptyDescription={
              isLowStockView
                ? "Items at or below their reorder point will appear here."
                : undefined
            }
            filters={
              <ListSearchField
                value={search}
                onChange={setSearch}
                placeholder="Search stock..."
                disabled={isLowStockView}
                className={isLowStockView ? "opacity-60" : undefined}
              />
            }
            toolbar={
              <TableFiltersSheet
                activeCount={countActiveFilters([
                  locationFilter !== ALL_LOCATIONS ? locationFilter : "",
                  viewMode !== VIEW_ALL ? viewMode : "",
                  from,
                  to,
                ])}
                onReset={() => {
                  setLocationFilter(ALL_LOCATIONS);
                  setViewMode(VIEW_ALL);
                  setFrom("");
                  setTo("");
                }}
              >
                <FilterField label="Location">
                  <Select
                    value={locationFilter}
                    onValueChange={setLocationFilter}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl">
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_LOCATIONS}>
                        All locations
                      </SelectItem>
                      {(locations ?? []).map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} ({loc.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Stock view">
                  <Select
                    value={viewMode}
                    onValueChange={(v) =>
                      setViewMode(v as typeof VIEW_ALL | typeof VIEW_LOW_STOCK)
                    }
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={VIEW_ALL}>All stock</SelectItem>
                      <SelectItem value={VIEW_LOW_STOCK}>
                        Low stock only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Date range">
                  <DateRangeFilter
                    from={from}
                    to={to}
                    onFromChange={setFrom}
                    onToChange={setTo}
                    disabled={isLowStockView}
                    compact={false}
                    className={isLowStockView ? "opacity-60" : undefined}
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
              ...(isAllLocations
                ? [
                    {
                      key: "location",
                      header: "Location",
                      mobilePriority: 2,
                      cell: (r: StockRecord) => r.location?.name ?? "—",
                    },
                  ]
                : []),
              {
                key: "item",
                header: "Item",
                hideable: false,
                mobilePriority: 1,
                cell: (r) => {
                  const imageSrc = resolveItemImageUrl(
                    r.item.imageUrl ?? r.item.imagePath
                  );
                  return (
                    <StockDetailDialog
                      record={r}
                      trigger={
                        <button
                          type="button"
                          className="flex max-w-full items-center gap-3 text-left"
                        >
                          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--frappe-border)] bg-[var(--frappe-section-head)] shadow-sm">
                            {imageSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageSrc}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="size-4 text-[var(--frappe-text-muted)]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--frappe-text)] transition-colors hover:text-[var(--frappe-primary)]">
                              {r.item.description}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {r.item.sku ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-md px-1.5 py-0 font-mono text-[10px] font-normal"
                                >
                                  {r.item.sku}
                                </Badge>
                              ) : null}
                              {r.item.itemType ? (
                                <Badge
                                  variant="secondary"
                                  className="rounded-md px-1.5 py-0 text-[10px] font-normal"
                                >
                                  {itemTypeLabel(r.item.itemType)}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      }
                    />
                  );
                },
              },
              {
                key: "qty",
                header: "Current stock",
                className: "min-w-[9rem]",
                hideable: false,
                mobilePriority: 2,
                cell: (r) => (
                  <StockLevelBar
                    quantity={r.quantity}
                    reorderPoint={r.reorderPoint}
                    unit={r.item.unit}
                  />
                ),
              },
              {
                key: "unit",
                header: "Unit",
                className: "w-20",
                defaultVisible: false,
                cell: (r) => r.item.unit || "—",
              },
              {
                key: "sku",
                header: "SKU",
                className: "w-28 font-mono text-xs",
                defaultVisible: false,
                cell: (r) => r.item.sku || "—",
              },
              {
                key: "reorder",
                header: "Reorder at",
                className: "w-28 text-right tabular-nums",
                mobilePriority: 4,
                cell: (r) =>
                  r.reorderPoint != null && r.reorderPoint !== ""
                    ? formatQty(r.reorderPoint)
                    : "—",
              },
              ...(isLowStockView
                ? [
                    {
                      key: "shortage",
                      header: "Shortage",
                      className: "w-28 text-right tabular-nums",
                      mobilePriority: 3,
                      cell: (r: StockRecord | LowStockRecord) =>
                        formatQty((r as LowStockRecord).shortage),
                    },
                  ]
                : []),
              {
                key: "price",
                header: "Purchase price",
                className: "w-36 text-right tabular-nums",
                mobilePriority: 3,
                cell: (r) => formatMoney(r.purchasePrice),
              },
              {
                key: "value",
                header: "Value",
                className: "w-36 text-right tabular-nums",
                cell: (r) =>
                  formatMoney(
                    parseFloat(r.quantity) * parseFloat(r.purchasePrice)
                  ),
              },
              {
                key: "actions",
                header: "Actions",
                className: "w-40 text-right",
                hideable: false,
                mobilePriority: 5,
                cell: (r) => (
                    <div className="flex justify-end gap-1">
                      <StockDetailDialog record={r} />
                      {hasPermission(user, "inventory.adjust") ? (
                        <StockAdjustDialog
                          record={r}
                          onSuccess={reload}
                        />
                      ) : null}
                      {hasPermission(user, "inventory.write") ? (
                        <Button size="icon" variant="ghost" asChild>
                          <Link
                            href={`/inventory/${r.id}/edit`}
                            aria-label="Edit stock"
                          >
                            <PencilIcon className="size-4" />
                          </Link>
                        </Button>
                      ) : null}
                      {hasPermission(user, "inventory.delete") ? (
                        <DeleteStockButton id={r.id} onSuccess={reload} />
                      ) : null}
                    </div>
                  ),
              },
            ]}
          />
          </TabsContent>
          <TabsContent value="adjustments" className="mt-0">
            <InventoryAdjustmentsPanel />
          </TabsContent>
          <TabsContent value="movements" className="mt-0">
            <InventoryMovementsPanel
              lockedFilters={movementLockedFilters}
              onClearLockedFilters={clearMovementLockedFilters}
            />
          </TabsContent>
        </Tabs>
      </PermissionGate>
    </AppShell>
  );
}

function ImportDialog({
  locationId,
  onSuccess,
  disabled,
}: {
  locationId: string;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !locationId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api(`/inventory/import?locationId=${locationId}`, {
        method: "POST",
        body: form,
      });
      toast.success("Import completed");
      setOpen(false);
      setFile(null);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <UploadIcon />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleImport}>
          <DialogHeader>
            <DialogTitle>Bulk import</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Columns: description, quantity, purchasePrice (or price). Optional:
            sku, reorderPoint (or reorder_point), itemType (RAW, SEMI,
            FINISHED, OTHER), imageUrl. For images, insert a picture on the
            data row in the .xlsx file (preferred), or put a public http/https
            link in imageUrl. JPEG/PNG/GIF up to 5 MB.
          </p>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={uploading || !file}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteStockButton({
  id,
  onSuccess,
}: {
  id: string;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api(`/inventory/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete stock record?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the stock entry for this location.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
