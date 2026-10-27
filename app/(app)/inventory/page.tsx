"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import { FrappeFilterBar, FrappeListToolbar } from "@/components/frappe";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
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
import { Label } from "@/components/ui/label";
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
import { isLowStockRow } from "@/lib/inventory-stock";
import { resolveItemImageUrl } from "@/lib/inventory-media";
import { formatMoney, formatQty, errorMessage } from "@/lib/format";
import type {
  InventoryListTotals,
  LowStockRecord,
  StockRecord,
} from "@/lib/types";
import { itemTypeLabel } from "@/lib/item-types";
import { ListPageTotals } from "@/components/shared/list-page-totals";
import { useLocations } from "@/hooks/use-locations";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportInventoryButton } from "@/components/inventory/export-inventory-button";
import { InventoryAdjustmentsPanel } from "@/components/inventory/inventory-adjustments-panel";
import { InventoryMovementsPanel } from "@/components/inventory/inventory-movements-panel";
import { StockAdjustDialog } from "@/components/inventory/stock-adjust-dialog";
import { StockDetailDialog } from "@/components/inventory/stock-detail-dialog";
import { StockFormDialog } from "@/components/inventory/stock-form-dialog";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { ImageIcon, UploadIcon, PencilIcon, Trash2Icon } from "lucide-react";

const ALL_LOCATIONS = "__all__";
const VIEW_ALL = "all";
const VIEW_LOW_STOCK = "low-stock";

export default function InventoryPage() {
  const { user } = useAuth();
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
      title="Stock Ledger"
      subtitle="Warehouse and showroom quantities"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Stock Ledger" },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate permission="inventory.write">
            <StockFormDialog
              locationId={listLocationId ?? ""}
              disabled={isAllLocations}
              onSuccess={reload}
            />
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
        <Tabs defaultValue="stock" className="gap-4">
          <TabsList>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="mt-0 space-y-0">
        <FrappeFilterBar>
          <div className="grid gap-2">
            <Label className="text-sm text-[var(--frappe-text-muted)]">
              Location
            </Label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-9 w-full min-w-[200px] border-[var(--frappe-border)] bg-[var(--frappe-surface)] sm:w-[240px]">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LOCATIONS}>All locations</SelectItem>
                {(locations ?? []).map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm text-[var(--frappe-text-muted)]">
              View
            </Label>
            <Select
              value={viewMode}
              onValueChange={(v) =>
                setViewMode(v as typeof VIEW_ALL | typeof VIEW_LOW_STOCK)
              }
            >
              <SelectTrigger className="h-9 w-full min-w-[180px] border-[var(--frappe-border)] bg-[var(--frappe-surface)] sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VIEW_ALL}>All stock</SelectItem>
                <SelectItem value={VIEW_LOW_STOCK}>Low stock only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder="Search stock..."
            disabled={isLowStockView}
            className={isLowStockView ? "opacity-60" : undefined}
          />
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            disabled={isLowStockView}
            className={isLowStockView ? "opacity-60" : undefined}
          />
        </FrappeFilterBar>
        <FrappeListToolbar>
          <span className="text-[var(--frappe-text-muted)]">
            {meta.total} {isLowStockView ? "low-stock item" : "item"}
            {meta.total === 1 ? "" : "s"}
          </span>
          {!isLowStockView && totals ? (
            <ListPageTotals
              items={[
                { label: "Total qty", value: formatQty(totals.quantity) },
                {
                  label: "Stock value",
                  value: formatMoney(totals.inventoryValue),
                },
              ]}
            />
          ) : null}
        </FrappeListToolbar>
        {loading ? (
          <PageLoading />
        ) : (
          <DataCardTable
            rows={rows}
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
                      cell: (r: StockRecord) => r.location?.name ?? "—",
                    },
                  ]
                : []),
              {
                key: "item",
                header: "Item",
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
                          <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border">
                            {imageSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageSrc}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="text-muted-foreground size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--frappe-primary)] hover:underline">
                              {r.item.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[
                                r.item.sku ? `SKU: ${r.item.sku}` : null,
                                r.item.itemType
                                  ? itemTypeLabel(r.item.itemType)
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || null}
                            </p>
                          </div>
                        </button>
                      }
                    />
                  );
                },
              },              {
                key: "qty",
                header: "Quantity",
                className: "w-28 text-right tabular-nums",
                cell: (r) => {
                  const lowRow = r as LowStockRecord;
                  const showLowBadge =
                    isLowStockView || isLowStockRow(r as StockRecord);
                  return (
                    <div className="flex flex-col items-end gap-1">
                      <span>{formatQty(r.quantity)}</span>
                      {showLowBadge ? (
                        <Badge
                          variant={
                            lowRow.status === "OUT_OF_STOCK" ||
                            parseFloat(r.quantity) <= 0
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] font-normal"
                        >
                          {lowRow.status === "OUT_OF_STOCK" ||
                          parseFloat(r.quantity) <= 0
                            ? "Out of stock"
                            : "Low stock"}
                        </Badge>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                key: "reorder",
                header: "Reorder at",
                className: "w-28 text-right tabular-nums",
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
                      cell: (r: StockRecord | LowStockRecord) =>
                        formatQty((r as LowStockRecord).shortage),
                    },
                  ]
                : []),
              {
                key: "price",
                header: "Purchase price",
                className: "w-36 text-right tabular-nums",
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
                header: "",
                className: "w-40 text-right",
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
                        <StockFormDialog
                          locationId={r.locationId ?? listLocationId ?? ""}
                          record={r}
                          onSuccess={reload}
                          trigger={
                            <Button size="icon" variant="ghost">
                              <PencilIcon className="size-4" />
                            </Button>
                          }
                        />
                      ) : null}
                      {hasPermission(user, "inventory.delete") ? (
                        <DeleteStockButton id={r.id} onSuccess={reload} />
                      ) : null}
                    </div>
                  ),
              },
            ]}
          />
        )}
          </TabsContent>
          <TabsContent value="adjustments" className="mt-0">
            <InventoryAdjustmentsPanel />
          </TabsContent>
          <TabsContent value="movements" className="mt-0">
            <InventoryMovementsPanel />
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
