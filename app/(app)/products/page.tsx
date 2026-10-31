"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { DataCardTable } from "@/components/shared/data-card-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { itemTypeLabel } from "@/lib/item-types";
import type { ProductFamily } from "@/lib/product-variants";

export default function ProductsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "inventory.write");
  const { data, loading, error, reload } = useFetch<ProductFamily[]>(
    () => api("/product-families"),
    [],
    { enabled: hasPermission(user, "inventory.read") },
  );
  const [search, setSearch] = useState("");
  return (
    <AppShell
      title="Product families"
      subtitle="Configure products once, then manage each variant's stock, cost and manufacturing separately."
      actions={
        canWrite && (
          <Button asChild>
            <Link href="/products/new">New product family</Link>
          </Button>
        )
      }
    >
      <PermissionGate permission="inventory.read">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Input
            className="max-w-sm"
            placeholder="Search product families..."
            aria-label="Search product families"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canWrite && (
            <Button variant="outline" asChild>
              <Link href="/product-attributes">Configure attributes</Link>
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="mb-4 text-destructive">
            {error}{" "}
            <button onClick={() => void reload()} className="underline">
              Retry
            </button>
          </p>
        )}
        <DataCardTable<ProductFamily>
          storageKey="product-families"
          rows={data?.filter((f) =>
            f.name.toLowerCase().includes(search.toLowerCase()),
          )}
          loading={loading}
          emptyTitle="No product families yet"
          emptyDescription="Start with a family such as Dining chair, then add its colours, materials or sizes."
          columns={[
            {
              key: "name",
              header: "Product family",
              cell: (f) => (
                <Link
                  className="font-medium text-primary hover:underline"
                  href={`/products/${f.id}`}
                >
                  {f.name}
                </Link>
              ),
            },
            {
              key: "type",
              header: "Item type",
              cell: (f) => itemTypeLabel(f.itemType),
            },
            {
              key: "variants",
              header: "Variants",
              cell: (f) => f.variantCount ?? 0,
            },
            {
              key: "unit",
              header: "Base stock unit",
              cell: (f) => f.stockUnit.symbol,
            },
            {
              key: "active",
              header: "Status",
              cell: (f) => (
                <Badge variant={f.isActive ? "secondary" : "outline"}>
                  {f.isActive ? "Active" : "Archived family"}
                </Badge>
              ),
            },
          ]}
        />
      </PermissionGate>
    </AppShell>
  );
}
