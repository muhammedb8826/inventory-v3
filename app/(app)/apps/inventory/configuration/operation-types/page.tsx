"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionHub } from "@/components/apps/section-hub";
import { Button } from "@/components/ui/button";
import { getAppModule } from "@/lib/modules";
import {
  ArrowLeftRight,
  Factory,
  Receipt,
  Truck,
  Warehouse,
} from "lucide-react";

export default function OperationTypesPage() {
  const mod = getAppModule("inventory")!;

  return (
    <AppShell
      title="Operation types"
      subtitle="Each flow has a clear purpose — like Odoo’s receipt, delivery, internal, and manufacture types."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Configuration", href: "/apps/inventory/configuration" },
        { label: "Operation types" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/warehouse">Warehouse tasks</Link>
        </Button>
      }
    >
      <SectionHub
        title="Operation types"
        subtitle="Open the matching operations screen. Custom operation-type records can be added later."
        accent={mod.color}
        sections={[
          {
            label: "Warehouse flows",
            links: [
              {
                title: "Receipts",
                href: "/purchase-orders",
                icon: Truck,
                description: "Incoming supplier goods.",
              },
              {
                title: "Deliveries",
                href: "/sales-orders",
                icon: Receipt,
                description: "Outgoing customer shipments.",
              },
              {
                title: "Internal transfers",
                href: "/stock-transfers",
                icon: ArrowLeftRight,
                description: "Moves between your locations.",
              },
              {
                title: "Manufacturing",
                href: "/production-orders",
                icon: Factory,
                description: "Component issue and finished receipt.",
              },
              {
                title: "Putaway / Pick",
                href: "/warehouse",
                icon: Warehouse,
                description: "Floor tasks for putting away and picking.",
              },
            ],
          },
        ]}
      />
    </AppShell>
  );
}
