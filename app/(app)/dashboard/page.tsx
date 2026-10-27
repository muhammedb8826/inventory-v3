"use client";

import { AppShell } from "@/components/app-shell";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { PermissionGate } from "@/components/permission-gate";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Sales, stock, and liquidity at a glance"
      breadcrumbs={[{ label: "Overview" }, { label: "Dashboard" }]}
    >
      <PermissionGate permission="dashboard.read" showDenied>
        <DashboardOverview />
      </PermissionGate>
    </AppShell>
  );
}
