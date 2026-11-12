"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionHub } from "@/components/apps/section-hub";
import { Button } from "@/components/ui/button";
import { getAppModule } from "@/lib/modules";
import {
  FolderTree,
  MapPin,
  Ruler,
  Settings2,
  Tags,
  Warehouse,
} from "lucide-react";

export default function InventoryConfigurationPage() {
  const mod = getAppModule("inventory")!;

  return (
    <AppShell
      title="Configuration"
      subtitle="Set up warehouses and product masters before daily operations."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Configuration" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/apps/inventory">Overview</Link>
        </Button>
      }
    >
      <SectionHub
        title="Configuration"
        subtitle="Settings and warehouse structure live here — not mixed into Operations."
        accent={mod.color}
        sections={[
          {
            label: "Settings",
            links: [
              {
                title: "Settings",
                href: "/apps/inventory/configuration/settings",
                icon: Settings2,
                description: "Units, attributes, and inventory defaults.",
              },
            ],
          },
          {
            label: "Warehouse management",
            links: [
              {
                title: "Warehouses",
                href: "/locations",
                icon: MapPin,
                description: "Warehouses, showrooms, and storage bins.",
              },
              {
                title: "Operation types",
                href: "/apps/inventory/configuration/operation-types",
                icon: Warehouse,
                description:
                  "Receipt, delivery, internal transfer, and manufacturing flows.",
              },
            ],
          },
          {
            label: "Products",
            links: [
              {
                title: "Product categories",
                href: "/apps/inventory/configuration/product-categories",
                icon: FolderTree,
                description: "Business groups for browsing and reporting.",
              },
              {
                title: "Attributes",
                href: "/product-attributes",
                icon: Tags,
                description: "Options used to build product variants.",
              },
              {
                title: "Units of measure",
                href: "/units",
                icon: Ruler,
                description: "Stock units and conversion rules.",
              },
            ],
          },
        ]}
      />
    </AppShell>
  );
}