"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ComingSoonPanel } from "@/components/apps/section-hub";
import { Button } from "@/components/ui/button";
import { getAppModule } from "@/lib/modules";

export default function ProductCategoriesPage() {
  const mod = getAppModule("inventory")!;

  return (
    <AppShell
      title="Product categories"
      subtitle="Business groupings for products — Fabrics, Hardware, Spare parts, and so on."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Configuration", href: "/apps/inventory/configuration" },
        { label: "Product categories" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/inventory/products">View products</Link>
        </Button>
      }
    >
      <ComingSoonPanel
        title="Categories are next"
        body="Product categories are for browsing and reporting, not manufacturing rules (that is item type). The master list will land here; until then use product families for variants and the product catalog for SKUs."
        actions={[
          { label: "Product catalog", href: "/inventory/products" },
          { label: "Product variants", href: "/products" },
          { label: "Item types stay on the product", href: "/inventory/new" },
        ]}
      />
    </AppShell>
  );
}