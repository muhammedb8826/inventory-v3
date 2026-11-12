"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InventoryOverview } from "@/components/apps/inventory-overview";
import { ModuleMenuGrid } from "@/components/apps/apps-home";
import { getAppModule } from "@/lib/modules";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/permissions";
import { AccessDenied } from "@/components/shared/access-denied";

export default function AppModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: moduleId } = use(params);
  const mod = getAppModule(moduleId);
  const { user } = useAuth();

  if (!mod || mod.id === "dashboard" || mod.id === "discuss") {
    notFound();
  }

  if (!hasAnyPermission(user, mod.permissions)) {
    return (
      <AppShell title={mod.name}>
        <AccessDenied />
      </AppShell>
    );
  }

  // Inventory overview: cards only — navigation lives in the sidebar.
  if (mod.id === "inventory") {
    return (
      <AppShell title="Inventory Overview">
        <InventoryOverview />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={mod.name}
      subtitle={mod.description}
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: mod.name },
      ]}
    >
      <ModuleMenuGrid module={mod} />
    </AppShell>
  );
}
