"use client";

import Link from "next/link";
import { use } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ModuleMenuGrid } from "@/components/apps/apps-home";
import { Button } from "@/components/ui/button";
import { getAppModule } from "@/lib/modules";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/permissions";
import { AccessDenied } from "@/components/shared/access-denied";
import { cn } from "@/lib/utils";

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

  const Icon = mod.icon;

  return (
    <AppShell
      title={mod.name}
      subtitle={mod.description}
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
      <div className="mb-6 flex items-center gap-3">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl",
            mod.tint,
          )}
        >
          <Icon className="size-6" style={{ color: mod.color }} />
        </span>
        <div>
          <p className="text-sm font-medium">{mod.name}</p>
          <p className="text-xs text-muted-foreground">
            Menus are grouped so operations stay separate from configuration.
          </p>
        </div>
      </div>
      <ModuleMenuGrid module={mod} />
    </AppShell>
  );
}
