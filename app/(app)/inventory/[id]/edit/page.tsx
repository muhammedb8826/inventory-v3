"use client";

import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { StockItemForm } from "@/components/inventory/stock-item-form";
import { PageLoading } from "@/components/shared/page-loading";
import { api } from "@/lib/api";
import type { StockRecord } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";

export default function EditInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: record, loading } = useFetch(
    () => api<StockRecord>(`/inventory/${id}`),
    [id],
  );

  return (
    <AppShell
      title={record?.item.description ?? "Edit stock"}
      subtitle={loading ? "Loading…" : "Edit"}
      variant="form"
      breadcrumbs={[
        { label: "Operations", href: "/dashboard" },
        { label: "Inventory", href: "/inventory" },
        { label: "Edit" },
      ]}
    >
      <PermissionGate
        permission="inventory.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to edit inventory.
          </p>
        }
      >
        {loading || !record ? (
          <PageLoading />
        ) : (
          <StockItemForm record={record} locationId={record.locationId} />
        )}
      </PermissionGate>
    </AppShell>
  );
}
