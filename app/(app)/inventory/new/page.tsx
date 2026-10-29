"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { StockItemForm } from "@/components/inventory/stock-item-form";
import { PageLoading } from "@/components/shared/page-loading";

function NewInventoryBody() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("locationId") ?? undefined;

  return (
    <PermissionGate
      permission="inventory.write"
      fallback={
        <p className="text-sm text-muted-foreground">
          You do not have permission to add inventory.
        </p>
      }
    >
      <StockItemForm locationId={locationId} />
    </PermissionGate>
  );
}

export default function NewInventoryPage() {
  return (
    <AppShell
      title="Add product"
      subtitle="Create a product, choose its stock unit, and set opening inventory."
      variant="form"
      breadcrumbs={[
        { label: "Operations", href: "/dashboard" },
        { label: "Inventory", href: "/inventory" },
        { label: "New" },
      ]}
    >
      <Suspense fallback={<PageLoading />}>
        <NewInventoryBody />
      </Suspense>
    </AppShell>
  );
}
