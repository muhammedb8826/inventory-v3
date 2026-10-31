"use client";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { ProductFamilyForm } from "@/components/inventory/product-family-form";
import { PageLoading } from "@/components/shared/page-loading";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import type { ProductFamily } from "@/lib/product-variants";
export default function EditProductFamilyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useFetch<ProductFamily>(
    () => api(`/product-families/${id}`),
    [id],
  );
  return (
    <AppShell
      title="Edit product family"
      variant="form"
      breadcrumbs={[
        { label: "Product families", href: "/products" },
        { label: data?.name ?? "Family", href: `/products/${id}` },
        { label: "Edit" },
      ]}
    >
      <PermissionGate permission="inventory.write">
        {loading ? (
          <PageLoading />
        ) : error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : (
          data && <ProductFamilyForm key={data.id} family={data} />
        )}
      </PermissionGate>
    </AppShell>
  );
}
