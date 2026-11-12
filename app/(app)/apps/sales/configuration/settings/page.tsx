"use client";

import { AppShell } from "@/components/app-shell";
import { ComingSoonPanel } from "@/components/apps/section-hub";

export default function SalesSettingsPage() {
  return (
    <AppShell
      title="Sales settings"
      subtitle="Defaults and policies"
      breadcrumbs={[
        { label: "Sales", href: "/apps/sales" },
        { label: "Configuration" },
        { label: "Settings" },
      ]}
    >
      <ComingSoonPanel
        title="Sales settings"
        body="Company-wide sales defaults (payment terms, quotation validity, delivery policy) will be configured here."
        actions={[{ label: "Company settings", href: "/settings" }]}
      />
    </AppShell>
  );
}
