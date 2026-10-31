"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { DataCardTable } from "@/components/shared/data-card-table";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { RecordActivity } from "@/components/shared/record-metadata";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductVariantBuilder } from "@/components/inventory/product-variant-builder";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { formatQty } from "@/lib/format";
import { itemTypeLabel } from "@/lib/item-types";
import type {
  ProductAttribute,
  ProductFamily,
  ProductVariant,
} from "@/lib/product-variants";

export default function ProductFamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "inventory.write");
  const { data, loading, error, reload } = useFetch<ProductFamily>(
    () => api(`/product-families/${id}`),
    [id],
    { enabled: hasPermission(user, "inventory.read") },
  );
  const { data: attributes } = useFetch<ProductAttribute[]>(
    () => api("/product-families/attributes"),
    [],
    { enabled: hasPermission(user, "inventory.read") },
  );
  return (
    <AppShell
      title={data?.name ?? "Product family"}
      subtitle="Each variant has its own SKU, stock, cost and BOM."
      breadcrumbs={[
        { label: "Product families", href: "/products" },
        { label: data?.name ?? "Details" },
      ]}
      actions={
        canWrite &&
        data && (
          <Button asChild variant="outline">
            <Link href={`/products/${id}/edit`}>Edit family</Link>
          </Button>
        )
      }
    >
      <PermissionGate permission="inventory.read">
        {loading ? (
          <PageLoading />
        ) : error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : (
          data && (
            <div className="space-y-6">
              <section
                aria-label="Family summary"
                className="rounded-xl border bg-card p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>{itemTypeLabel(data.itemType)}</Badge>
                  <Badge variant="secondary">
                    {data.stockUnit.name} ({data.stockUnit.symbol})
                  </Badge>
                  <Badge variant="outline">
                    {data.variants?.length ?? 0} variants
                  </Badge>
                  {!data.isActive && (
                    <Badge variant="outline">Archived family</Badge>
                  )}
                </div>
                {data.description && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {data.description}
                  </p>
                )}
                <p className="mt-3 text-sm text-muted-foreground">
                  {data.unitGroup
                    ? `Conversions: ${data.unitGroup.name}`
                    : "Stock unit only; standard conversions stay within its measurement category."}
                </p>
              </section>
              <DataCardTable<ProductVariant>
                rows={data.variants}
                storageKey="product-variants"
                emptyTitle="No variants yet"
                emptyDescription="Choose attributes below, preview combinations and create the variants you offer."
                onBulkComplete={() => void reload()}
                bulkActions={
                  canWrite
                    ? [
                        {
                          id: "archive",
                          label: "Archive selected",
                          description:
                            "Archive variants with no stock or reservations. Their history and combinations remain protected.",
                          eligible: (v) =>
                            v.isActive &&
                            v.stocks.every((s) => Number(s.quantity) === 0),
                          run: (v) =>
                            api(`/product-families/${id}/variants/${v.id}`, {
                              method: "PATCH",
                              body: { isActive: false },
                            }),
                        },
                        {
                          id: "activate",
                          label: "Activate selected",
                          description:
                            "Make selected variants available for new transactions.",
                          eligible: (v) => !v.isActive,
                          run: (v) =>
                            api(`/product-families/${id}/variants/${v.id}`, {
                              method: "PATCH",
                              body: { isActive: true },
                            }),
                        },
                      ]
                    : []
                }
                columns={[
                  {
                    key: "description",
                    header: "Variant",
                    cell: (v) => (
                      <div>
                        <p className="font-medium">{v.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.variantValues
                            .map((s) => `${s.name}: ${s.value}`)
                            .join(" · ")}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "sku",
                    header: "SKU",
                    cell: (v) => v.sku ?? "Not set",
                  },
                  {
                    key: "quantity",
                    header: `On hand (${data.stockUnit.symbol})`,
                    cell: (v) =>
                      formatQty(
                        v.stocks.reduce((n, s) => n + Number(s.quantity), 0),
                      ),
                  },
                  {
                    key: "barcode",
                    header: "Barcode",
                    defaultVisible: false,
                    cell: (v) => v.barcode ?? "Not set",
                  },
                  {
                    key: "active",
                    header: "Status",
                    cell: (v) => (
                      <Badge variant={v.isActive ? "secondary" : "outline"}>
                        {v.isActive ? "Active" : "Archived"}
                      </Badge>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    cell: (v) => (
                      <RowActionsMenu
                        label={v.sku ?? v.description}
                        actions={[
                          ...(canWrite
                            ? v.stocks.map((s) => ({
                                label: `Edit inventory (${s.locationName ?? s.locationId.slice(0, 8)})`,
                                href: `/inventory/${s.id}/edit`,
                              }))
                            : []),
                          ...(hasPermission(user, "bom.write") &&
                          (data.itemType === "FINISHED" ||
                            data.itemType === "SEMI") &&
                          v.isActive
                            ? [
                                {
                                  label: "Create variant BOM",
                                  href: `/boms/new?finishedItemId=${v.id}`,
                                },
                              ]
                            : []),
                        ]}
                      />
                    ),
                  },
                ]}
              />
              {canWrite && data.isActive && attributes && (
                <ProductVariantBuilder
                  key={`${id}:${data.variants?.length}`}
                  family={data}
                  definitions={attributes}
                  onSaved={() => void reload()}
                />
              )}
              <RecordActivity record={data} />
            </div>
          )
        )}
      </PermissionGate>
    </AppShell>
  );
}
