"use client";
import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import type { PurchaseOrder } from "@/lib/purchase-orders";
export default function EditPurchaseOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, error } = useFetch<PurchaseOrder>(
    () => api(`/purchase-orders/${id}`),
    [id],
  );
  return (
    <AppShell
      title="Edit purchase request"
      subtitle="Confirm this request before the warehouse receives the goods."
    >
      <PermissionGate permission="purchase.write" showDenied>
        {error ? (
          <p role="alert">{error}</p>
        ) : data ? (
          <PurchaseForm purchaseOrder={data} />
        ) : (
          <p>Loading…</p>
        )}
      </PermissionGate>
    </AppShell>
  );
}
