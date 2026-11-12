"use client";

import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { OdooProductForm } from "@/components/inventory/odoo-product-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewInventoryPage() {
  return (
    <AppShell
      title="New product"
      subtitle="General information — stock location defaults to your warehouse."
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
      <PermissionGate
        permission="inventory.write"
        fallback={
          <p className="text-sm text-muted-foreground">
            You do not have permission to add inventory.
          </p>
        }
      >
        <OdooProductForm />
      </PermissionGate>
    </AppShell>
  );
}
