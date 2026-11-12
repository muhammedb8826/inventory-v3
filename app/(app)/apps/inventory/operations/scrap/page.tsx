"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { InventoryAdjustmentsPanel } from "@/components/inventory/inventory-adjustments-panel";
import { Button } from "@/components/ui/button";
import { getAppModule } from "@/lib/modules";

export default function InventoryScrapPage() {
  const mod = getAppModule("inventory")!;

  return (
    <AppShell
      title="Scrap"
      subtitle="Write off damaged, expired, or unusable stock. Posted as inventory adjustments."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Operations", href: "/apps/inventory/operations" },
        { label: "Scrap" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/apps/inventory/operations">Back to operations</Link>
        </Button>
      }
    >
      <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        Use reason <strong>Damage</strong>, <strong>Loss</strong>, or{" "}
        <strong>Other</strong> when scrapping. This removes quantity from a
        location without a customer or supplier document.
      </div>
      <InventoryAdjustmentsPanel />
    </AppShell>
  );
}
