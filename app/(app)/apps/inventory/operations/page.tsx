"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionHub } from "@/components/apps/section-hub";
import { Button } from "@/components/ui/button";
import { getAppModule } from "@/lib/modules";
import {
  ArrowLeftRight,
  ClipboardCheck,
  Factory,
  Receipt,
  Trash2,
  Truck,
} from "lucide-react";

export default function InventoryOperationsPage() {
  const mod = getAppModule("inventory")!;

  return (
    <AppShell
      title="Operations"
      subtitle="Day-to-day stock moves: transfers in and out, then quantity adjustments."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Operations" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/apps/inventory">Overview</Link>
        </Button>
      }
    >
      <SectionHub
        title="Operations"
        subtitle="Transfers first, then adjustments. Replenishment comes later."
        accent={mod.color}
        sections={[
          {
            label: "Transfers",
            description:
              "Documents that move stock into, out of, or between locations.",
            links: [
              {
                title: "Receipts",
                href: "/purchase-orders",
                icon: Truck,
                description: "Receive goods from purchase orders / suppliers.",
              },
              {
                title: "Deliveries",
                href: "/sales-orders",
                icon: Receipt,
                description: "Ship goods for sales orders / customers.",
              },
              {
                title: "Internal transfers",
                href: "/stock-transfers",
                icon: ArrowLeftRight,
                description: "Move stock between your own warehouses.",
              },
              {
                title: "Manufacturing",
                href: "/production-orders",
                icon: Factory,
                description: "Issue materials and receive finished goods.",
              },
            ],
          },
          {
            label: "Adjustments",
            description:
              "Correct on-hand quantity without a purchase or sale document.",
            links: [
              {
                title: "Physical inventory",
                href: "/stocktakes",
                icon: ClipboardCheck,
                description: "Count stock and post the difference.",
              },
              {
                title: "Scrap",
                href: "/apps/inventory/operations/scrap",
                icon: Trash2,
                description: "Write off damaged, expired, or unusable stock.",
              },
            ],
          },
        ]}
      />
    </AppShell>
  );
}
