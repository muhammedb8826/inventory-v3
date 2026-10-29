"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";

function NewPurchaseBody() {
  const searchParams = useSearchParams();
  const productionOrderId =
    searchParams.get("productionOrderId")?.trim() || undefined;

  return (
    <PermissionGate
      permission="purchase.write"
      fallback={
        <p className="text-sm text-[var(--frappe-text-muted)]">
          You do not have permission to create purchases.
        </p>
      }
    >
      <PurchaseForm productionOrderId={productionOrderId} />
    </PermissionGate>
  );
}

export default function NewPurchasePage() {
  return (
    <AppShell
      title="New Purchase"
      subtitle="Not Saved"
      variant="form"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Purchase", href: "/purchases" },
        { label: "New Purchase" },
      ]}
    >
      <Suspense fallback={<PageLoading />}>
        <NewPurchaseBody />
      </Suspense>
    </AppShell>
  );
}
