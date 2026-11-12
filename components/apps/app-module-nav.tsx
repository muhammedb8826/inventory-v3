"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppModule } from "@/lib/modules";
import { Suspense } from "react";

type NavTab = {
  label: string;
  href: string;
  match?: (path: string, tab: string | null) => boolean;
};

function inventoryTabs(app: AppModule): NavTab[] {
  return [
    {
      label: "Overview",
      href: app.href,
      match: (path) => path === app.href,
    },
    {
      label: "Operations",
      href: "/inventory",
      match: (path, tab) =>
        path.startsWith("/stock-transfers") ||
        path.startsWith("/stocktakes") ||
        path.startsWith("/warehouse") ||
        (path === "/inventory" && tab !== "movements" && tab !== "products"),
    },
    {
      label: "Products",
      href: "/inventory/products",
      match: (path, tab) =>
        path.startsWith("/inventory/products") ||
        path.startsWith("/items") ||
        path === "/inventory/new" ||
        tab === "products",
    },
    {
      label: "Reporting",
      href: "/inventory?tab=movements",
      match: (_path, tab) => tab === "movements",
    },
    {
      label: "Configuration",
      href: "/locations",
      match: (path) =>
        path.startsWith("/locations") ||
        path.startsWith("/products") ||
        path.startsWith("/product-attributes") ||
        path.startsWith("/units"),
    },
  ];
}

function defaultTabs(app: AppModule): NavTab[] {
  return [
    { label: "Overview", href: app.href, match: (path) => path === app.href },
    ...app.menus.flatMap((group) =>
      group.links.slice(0, 1).map((link) => ({
        label: group.label,
        href: link.href,
      })),
    ),
  ];
}

function AppModuleNavInner({ module }: { module: AppModule }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tabs =
    module.id === "inventory" ? inventoryTabs(module) : defaultTabs(module);

  return (
    <nav
      aria-label={`${module.name} sections`}
      className="mb-6 flex max-w-full gap-1 overflow-x-auto border-b border-border/80 pb-px"
    >
      {tabs.map((tab) => {
        const active = tab.match
          ? tab.match(pathname, tabParam)
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppModuleNav({ module }: { module: AppModule }) {
  return (
    <Suspense fallback={<div className="mb-6 h-10 border-b border-border/80" />}>
      <AppModuleNavInner module={module} />
    </Suspense>
  );
}
