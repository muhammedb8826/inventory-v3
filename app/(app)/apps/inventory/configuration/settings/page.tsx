"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionHub } from "@/components/apps/section-hub";
import { Button } from "@/components/ui/button";
import { getAppModule } from "@/lib/modules";
import { Layers, Ruler, Tags } from "lucide-react";

export default function InventorySettingsPage() {
  const mod = getAppModule("inventory")!;

  return (
    <AppShell
      title="Inventory settings"
      subtitle="Masters that products and documents reuse. Configure these before busy operations."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Configuration", href: "/apps/inventory/configuration" },
        { label: "Settings" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/apps/inventory/configuration">Back</Link>
        </Button>
      }
    >
      <SectionHub
        title="Settings"
        subtitle="Keep product and unit setup here — not under day-to-day Operations."
        accent={mod.color}
        sections={[
          {
            label: "Product setup",
            links: [
              {
                title: "Product variants",
                href: "/products",
                icon: Layers,
                description: "Families that generate SKUs from attributes.",
              },
              {
                title: "Attributes",
                href: "/product-attributes",
                icon: Tags,
                description: "Reusable options such as colour and size.",
              },
              {
                title: "Units of measure",
                href: "/units",
                icon: Ruler,
                description: "Stock units and conversion profiles.",
              },
            ],
          },
        ]}
      />
    </AppShell>
  );
}
