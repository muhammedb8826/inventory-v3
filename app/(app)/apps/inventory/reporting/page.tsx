"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionHub } from "@/components/apps/section-hub";
import { Button } from "@/components/ui/button";
import { getAppModule } from "@/lib/modules";
import { History, LineChart, Package, Undo2 } from "lucide-react";

export default function InventoryReportingPage() {
  const mod = getAppModule("inventory")!;

  return (
    <AppShell
      title="Reporting"
      subtitle="See what you have, what moved, and what came back."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Reporting" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/apps/inventory">Overview</Link>
        </Button>
      }
    >
      <SectionHub
        title="Reporting"
        subtitle="Read-only views for stock health and move history — not day-to-day posting."
        accent={mod.color}
        sections={[
          {
            label: "Stock & moves",
            links: [
              {
                title: "Stock",
                href: "/inventory",
                icon: Package,
                description: "On-hand balances by product and location.",
              },
              {
                title: "Moves history",
                href: "/inventory?tab=movements",
                icon: History,
                description: "Chronological list of every stock move.",
              },
              {
                title: "Moves analysis",
                href: "/apps/inventory/reporting/moves-analysis",
                icon: LineChart,
                description: "Totals by move type over recent activity.",
              },
              {
                title: "Returns",
                href: "/apps/inventory/reporting/returns",
                icon: Undo2,
                description: "Customer and supplier return movements.",
              },
            ],
          },
        ]}
      />
    </AppShell>
  );
}
