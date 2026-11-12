"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutGridIcon, ListIcon, PackageIcon } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { useLocations } from "@/hooks/use-locations";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { DataCardTable } from "@/components/shared/data-card-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/shared/page-loading";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { resolveItemImageUrl } from "@/lib/inventory-media";
import { formatUnitPrice, formatQty, formatMoney } from "@/lib/format";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

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

type ProductView = "kanban" | "list";
const VIEW_KEY = "inventory-products-view";

function ProductKanban({
  rows,
  loading,
}: {
  rows: CatalogItem[] | undefined;
  loading: boolean;
}) {
  if (loading && !rows?.length) return <PageLoading />;
  if (!rows?.length) {
    return (
      <EmptyState
        title="No products found"
        description="Try a name, SKU or barcode. Products stay listed even when on-hand is zero."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((item) => {
        const image = resolveItemImageUrl(item.imageUrl);
        const unit = item.stockUnit?.symbol ?? item.unit ?? "";
        const onHand = Number(item.stock?.onHand ?? 0);
        const price =
          item.effectiveSalesPrice == null
            ? null
            : formatUnitPrice(item.effectiveSalesPrice);
        return (
          <li key={item.id}>
            <Link
              href={`/items/${item.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/40">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt=""
                    className="size-full object-contain p-3"
                  />
                ) : (
                  <PackageIcon className="size-10 text-muted-foreground/50" />
                )}
                {!item.isActive ? (
                  <Badge
                    variant="outline"
                    className="absolute left-2 top-2 bg-background/90"
                  >
                    Archived
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                  {item.description}
                </p>
                {item.sku ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.sku}
                  </p>
                ) : null}
                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  <div>
                    <p className="text-sm font-semibold tabular-nums">
                      {price ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatQty(onHand)} {unit} on hand
                    </p>
                  </div>
                  {item.productFamilyId ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Variant
                    </Badge>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function InventoryProducts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [view, setView] = useState<ProductView>("kanban");
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "kanban" || saved === "list") setView(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function changeView(next: ProductView) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const viewToggle = (
    <div
      role="group"
      aria-label="Product view"
      className="flex rounded-lg border bg-muted/40 p-0.5"
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={view === "kanban"}
        aria-label="Card view"
        className={cn(
          "h-8 gap-1.5 px-2.5",
          view === "kanban" && "bg-background shadow-sm",
        )}
        onClick={() => changeView("kanban")}
      >
        <LayoutGridIcon className="size-4" />
        <span className="hidden sm:inline">Cards</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={view === "list"}
        aria-label="Table view"
        className={cn(
          "h-8 gap-1.5 px-2.5",
          view === "list" && "bg-background shadow-sm",
        )}
        onClick={() => changeView("list")}
      >
        <ListIcon className="size-4" />
        <span className="hidden sm:inline">List</span>
      </Button>
    </div>
  );

  const filters = (
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
  );

  const pager = (
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
  );

  return (
    <AppShell
      title="Products"
      subtitle="Every SKU in the catalog, including zero stock."
      breadcrumbs={[
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Products" },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {viewToggle}
          <PermissionGate permission="inventory.write">
            <Button asChild>
              <Link href="/inventory/new">New</Link>
            </Button>
          </PermissionGate>
        </div>
      }
    >
      <PermissionGate permission="inventory.read" showDenied>
        {error && (
          <p role="alert" className="mb-4 text-destructive">
            {error}
          </p>
        )}

        {view === "kanban" ? (
          <div className="space-y-4">
            {filters}
            <ProductKanban rows={data?.data} loading={loading} />
            {pager}
          </div>
        ) : (
          <>
            <DataCardTable<CatalogItem>
              storageKey="item-catalog"
              className="[&>div:first-child>div:first-child]:basis-full sm:[&>div:first-child>div:first-child]:basis-0"
              onBulkComplete={reload}
              rows={data?.data}
              loading={loading}
              emptyTitle="No products found"
              emptyDescription="Try a name, SKU or barcode. Products stay listed here even when on-hand quantity is zero."
              filters={filters}
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
                        // eslint-disable-next-line @next/next/no-img-element
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
                  header: "Internal reference",
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
                  key: "price",
                  header: "Sales price",
                  cell: (i) =>
                    i.effectiveSalesPrice == null
                      ? "Approval required"
                      : formatUnitPrice(i.effectiveSalesPrice),
                },
                {
                  key: "cost",
                  header: "Cost",
                  defaultVisible: false,
                  cell: (i) =>
                    i.stock?.stockValue != null &&
                    Number(i.stock?.onHand ?? 0) > 0
                      ? formatMoney(
                          Number(i.stock.stockValue) /
                            Math.max(Number(i.stock.onHand), 1),
                        )
                      : "—",
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
            {pager}
          </>
        )}
      </PermissionGate>
    </AppShell>
  );
}
