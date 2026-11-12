"use client";

import Link from "next/link";

/** Stock ops views only — product catalog lives at /inventory/products. */
const views = [
  { key: "stock", label: "Stock balances", href: "/inventory" },
  {
    key: "adjustments",
    label: "Adjustments",
    href: "/inventory?tab=adjustments",
  },
  { key: "movements", label: "Movements", href: "/inventory?tab=movements" },
];

export function InventoryNavigation({ active }: { active: string }) {
  return (
    <nav
      aria-label="Stock views"
      className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1"
    >
      {views.map((view) => (
        <Link
          key={view.key}
          href={view.href}
          aria-current={active === view.key ? "page" : undefined}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${active === view.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  );
}
