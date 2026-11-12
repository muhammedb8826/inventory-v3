"use client";

import Link from "next/link";
import { use } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppModuleNav } from "@/components/apps/app-module-nav";
import { InventoryOverview } from "@/components/apps/inventory-overview";
import { ModuleMenuGrid } from "@/components/apps/apps-home";
import { Button } from "@/components/ui/button";
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

  return (
    <AppShell
      title={mod.name}
      subtitle={
        mod.id === "inventory"
          ? "Operations at a glance — open a card to work the queue"
          : mod.description
      }
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: mod.name },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/apps">All apps</Link>
        </Button>
      }
    >
      <AppModuleNav module={mod} />
      {mod.id === "inventory" ? (
        <InventoryOverview />
      ) : (
        <ModuleMenuGrid module={mod} />
      )}
    </AppShell>
  );
}
