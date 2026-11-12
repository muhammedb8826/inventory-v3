"use client";

import { AppShell } from "@/components/app-shell";
import { ComingSoonPanel } from "@/components/apps/section-hub";

export default function SalesReportingProductsPage() {
  return (
    <AppShell
      title="Product sales"
      subtitle="What customers buy"
      breadcrumbs={[
        { label: "Sales", href: "/apps/sales" },
        { label: "Reporting" },
        { label: "Products" },
      ]}
    >
      <ComingSoonPanel
        title="Product sales report"
        body="Product-level sales breakdown will appear here. Until then use posted invoices and the product catalog."
        actions={[
          { label: "Posted sales", href: "/sales" },
          { label: "Products", href: "/inventory/products" },
        ]}
      />
    </AppShell>
  );
}
