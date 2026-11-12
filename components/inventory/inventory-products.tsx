"use client";
import Link from "next/link";
import { useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { useLocations } from "@/hooks/use-locations";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { DataCardTable } from "@/components/shared/data-card-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { resolveItemImageUrl } from "@/lib/inventory-media";
import { formatUnitPrice, formatQty, formatMoney } from "@/lib/format";
import type { Item } from "@/lib/types";
type CatalogItem = Item & {
  stock?: {
    onHand: string;
    reserved: string;
    available: string;
    stockValue: string;
  };
  salesPrice: string | null;
  isActive: boolean;
  productFamilyId?: string;
  updatedAt?: string;
};
export function InventoryProducts() {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const [locationId, setLocationId] = useState("");
  const { data: locations } = useLocations();
  const q = useDebouncedValue(search, 300);
  const { data, loading, error, reload } = useFetch<{
    data: CatalogItem[];
    meta: { totalPages: number; total: number };
  }>(
    () =>
      api(
        `/items?search=${encodeURIComponent(q)}&page=${page}&limit=20${locationId ? `&locationId=${locationId}` : ""}`,
      ),
    [q, page, locationId],
  );
  return (
    <AppShell
      title="Products"
      subtitle="SKU catalog — every product, including zero stock. Warehouse quantities live under Stock balances."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Products" },
      ]}
      actions={
        <PermissionGate permission="inventory.write">
          <Button asChild>
            <Link href="/inventory/new">Add product</Link>
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate permission="inventory.read" showDenied>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <DataCardTable<CatalogItem>
          storageKey="item-catalog"
          className="[&>div:first-child>div:first-child]:basis-full sm:[&>div:first-child>div:first-child]:basis-0"
          onBulkComplete={reload}
          rows={data?.data}
          loading={loading}
          emptyTitle="No products found"
          emptyDescription="Try a name, SKU or barcode. Products stay listed here even when on-hand quantity is zero."
          filters={
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Input
                aria-label="Search products"
                placeholder="Search name, SKU or barcode…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <NativeSelect
                aria-label="Balance location"
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  setPage(1);
                }}
                className="sm:max-w-64"
              >
                <option value="">All permitted locations</option>
                {(locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          }
          columns={[
            {
              key: "name",
              header: "Product",
              mobilePriority: 0,
              className: "min-w-[16rem] max-w-[22rem]",
              hideable: false,
              cell: (i) => (
                <Link
                  className="flex min-w-0 items-center gap-3 font-medium text-primary hover:underline"
                  href={`/items/${i.id}`}
                >
                  {resolveItemImageUrl(i.imageUrl) && (
                    <img
                      alt=""
                      src={resolveItemImageUrl(i.imageUrl)!}
                      className="size-10 shrink-0 rounded-lg border object-contain"
                    />
                  )}
                  <span className="min-w-0 whitespace-normal break-words">
                    {i.description}
                  </span>
                </Link>
              ),
            },
            {
              key: "sku",
              header: "SKU",
              mobilePriority: 4,
              cell: (i) => i.sku || "—",
            },
            {
              key: "unit",
              header: "Stock unit",
              defaultVisible: false,
              cell: (i) => i.stockUnit?.symbol ?? i.unit ?? "—",
            },
            {
              key: "onHand",
              header: "On hand",
              mobilePriority: 1,
              cell: (i) =>
                `${formatQty(i.stock?.onHand ?? 0)} ${i.stockUnit?.symbol ?? i.unit ?? ""}`,
            },
            {
              key: "available",
              header: "Available",
              mobilePriority: 2,
              cell: (i) => formatQty(i.stock?.available ?? 0),
            },
            {
              key: "reserved",
              header: "Reserved",
              defaultVisible: false,
              cell: (i) => formatQty(i.stock?.reserved ?? 0),
            },
            {
              key: "stockValue",
              header: "Stock value",
              defaultVisible: false,
              cell: (i) => formatMoney(i.stock?.stockValue ?? 0),
            },
            {
              key: "price",
              header: "Sales price",
              cell: (i) =>
                i.effectiveSalesPrice == null
                  ? "Approval required"
                  : formatUnitPrice(i.effectiveSalesPrice),
            },
            {
              key: "variant",
              header: "Type",
              defaultVisible: false,
              cell: (i) => (i.productFamilyId ? "Variant" : "Single item"),
            },
            {
              key: "active",
              header: "Status",
              mobilePriority: 3,
              cell: (i) => (
                <Badge variant={i.isActive ? "secondary" : "outline"}>
                  {i.isActive ? "Active" : "Archived"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              cell: (i) => (
                <Button variant="ghost" asChild>
                  <Link href={`/items/${i.id}`}>View / edit</Link>
                </Button>
              ),
            },
          ]}
        />
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {data?.meta.total ?? 0} products · Page {page} of{" "}
            {data?.meta.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= (data?.meta.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </PermissionGate>
    </AppShell>
  );
}
