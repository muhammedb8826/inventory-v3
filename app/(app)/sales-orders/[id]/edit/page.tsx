"use client";
import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { SaleForm } from "@/components/sales/sale-form";
import { PermissionGate } from "@/components/permission-gate";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import type { SalesOrder } from "@/lib/sales-orders";
export default function EditQuotation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, error } = useFetch<SalesOrder>(
    () => api(`/sales-orders/${id}`),
    [id],
  );
  return (
    <AppShell
      title="Revise quotation"
      subtitle="Any revision resets prior price approval."
    >
      <PermissionGate permission="sales.write" showDenied>
        {error ? (
          <p role="alert">{error}</p>
        ) : data ? (
          <SaleForm quotation={data} />
        ) : (
          <p>Loading…</p>
        )}
      </PermissionGate>
    </AppShell>
  );
}
