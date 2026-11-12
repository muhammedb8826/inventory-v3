"use client";

import { use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import {
  ProductForm,
  type CatalogItem,
} from "@/components/inventory/product-form";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";

export default function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, error, loading, reload } = useFetch<CatalogItem>(
    () => api(`/items/${id}`),
    [id],
  );

  return (
    <AppShell
      title={data?.description ?? "Product"}
      subtitle="General information"
      variant="form"
      breadcrumbs={[
        { label: "Products", href: "/inventory/products" },
        { label: data?.description ?? "Product" },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/inventory/products">Products</Link>
        </Button>
      }
    >
      <PermissionGate permission="inventory.read" showDenied>
        {error ? (
          <p role="alert">{error}</p>
        ) : loading ? (
          <p>Loading product…</p>
        ) : data ? (
          <ProductForm
            key={`${id}:${data.updatedAt}`}
            item={data}
            reload={reload}
          />
        ) : null}
      </PermissionGate>
    </AppShell>
  );
}
