"use client";

import { AppShell } from "@/components/app-shell";
import { ComingSoonPanel } from "@/components/apps/section-hub";

export default function SalesReportingCustomersPage() {
  return (
    <AppShell
      title="Customer sales"
      subtitle="Revenue by customer"
      breadcrumbs={[
        { label: "Sales", href: "/apps/sales" },
        { label: "Reporting" },
        { label: "Customers" },
      ]}
    >
      <ComingSoonPanel
        title="Customer sales report"
        body="Customer revenue analysis will appear here. Until then browse customers and posted invoices."
        actions={[
          { label: "Customers", href: "/customers" },
          { label: "Posted sales", href: "/sales" },
        ]}
      />
    </AppShell>
  );
}
