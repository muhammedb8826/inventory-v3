"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { ProductCreateWizard } from "@/components/inventory/product-create-wizard";
import { PageLoading } from "@/components/shared/page-loading";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
      <ProductCreateWizard locationId={locationId} />
    </PermissionGate>
  );
}

export default function NewInventoryPage() {
  return (
    <AppShell
      title="Add product"
      subtitle="Create a simple product, or pick attributes from a product family."
      variant="form"
      actions={
        <Button variant="outline" asChild>
          <Link href="/products">Product families</Link>
        </Button>
      }
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Products", href: "/inventory/products" },
        { label: "New" },
      ]}
    >
      <Suspense fallback={<PageLoading />}>
        <NewInventoryBody />
      </Suspense>
    </AppShell>
  );
}
