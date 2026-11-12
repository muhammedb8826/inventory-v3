"use client";

import { AppShell } from "@/components/app-shell";
import { ComingSoonPanel } from "@/components/apps/section-hub";

export default function SalesTeamsPage() {
  return (
    <AppShell
      title="Sales teams"
      subtitle="Organize salespeople"
      breadcrumbs={[
        { label: "Sales", href: "/apps/sales" },
        { label: "Configuration" },
        { label: "Teams" },
      ]}
    >
      <ComingSoonPanel
        title="Sales teams"
        body="Sales teams will group users for reporting and assignment. Until then manage users under Settings."
        actions={[
          { label: "Users", href: "/users" },
          { label: "Salesperson report", href: "/sales/commissions" },
        ]}
      />
    </AppShell>
  );
}
