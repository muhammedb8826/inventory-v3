"use client";
import Link from "next/link";
import { useState } from "react";
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
import { formatUnitPrice } from "@/lib/format";
import type { Item } from "@/lib/types";
type CatalogItem = Item & {
  salesPrice: string | null;
  isActive: boolean;
  productFamilyId?: string;
  updatedAt?: string;
};
export default function ItemCatalogPage() {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const q = useDebouncedValue(search, 300);
  const { data, loading, error } = useFetch<{
    data: CatalogItem[];
    meta: { totalPages: number; total: number };
  }>(
    () => api(`/items?search=${encodeURIComponent(q)}&page=${page}&limit=20`),
    [q, page],
  );
  return (
    <AppShell
      title="Item catalog"
      subtitle="Every item and variant, including items without stock or with previous transactions."
      actions={
        <PermissionGate permission="inventory.write">
          <Button asChild>
            <Link href="/inventory/new">Add item</Link>
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate permission="inventory.read" showDenied>
        <div className="mb-5 flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/inventory">Stock balances</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">Product families & variants</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/units">Units & conversions</Link>
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <DataCardTable<CatalogItem>
          storageKey="item-catalog"
          rows={data?.data}
          loading={loading}
          emptyTitle="No items found"
          emptyDescription="Try a name, SKU or barcode. This catalog includes archived items and items without stock."
          filters={
            <Input
              aria-label="Search item catalog"
              placeholder="Search name, SKU or barcode…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          }
          columns={[
            {
              key: "name",
              header: "Item",
              cell: (i) => (
                <Link
                  className="flex items-center gap-3 font-medium text-primary hover:underline"
                  href={`/items/${i.id}`}
                >
                  {resolveItemImageUrl(i.imageUrl) && (
                    <img
                      alt=""
                      src={resolveItemImageUrl(i.imageUrl)!}
                      className="size-10 rounded-lg border object-contain"
                    />
                  )}
                  {i.description}
                </Link>
              ),
            },
            { key: "sku", header: "SKU", cell: (i) => i.sku || "—" },
            {
              key: "unit",
              header: "Stock unit",
              cell: (i) => i.stockUnit?.symbol ?? i.unit ?? "—",
            },
            {
              key: "price",
              header: "Sales price / stock unit",
              cell: (i) =>
                i.effectiveSalesPrice == null
                  ? "Approval required"
                  : formatUnitPrice(i.effectiveSalesPrice),
            },
            {
              key: "variant",
              header: "Type",
              cell: (i) => (i.productFamilyId ? "Variant" : "Single item"),
            },
            {
              key: "active",
              header: "Status",
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
            {data?.meta.total ?? 0} items · Page {page} of{" "}
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
