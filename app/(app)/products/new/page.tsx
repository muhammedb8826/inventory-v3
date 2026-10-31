"use client";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { ProductFamilyForm } from "@/components/inventory/product-family-form";
export default function NewProductFamilyPage() {
  return (
    <AppShell
      title="New product family"
      subtitle="Define shared details and attributes, then create the variants you offer."
      variant="form"
      breadcrumbs={[
        { label: "Product families", href: "/products" },
        { label: "New" },
      ]}
    >
      <PermissionGate permission="inventory.write">
        <ProductFamilyForm />
      </PermissionGate>
    </AppShell>
  );
}
