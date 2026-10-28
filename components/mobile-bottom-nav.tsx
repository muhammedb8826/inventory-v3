"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string;
  fab?: boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    permission: "dashboard.read",
  },
  {
    href: "/inventory",
    label: "Items",
    icon: Package,
    permission: "inventory.read",
  },
  {
    href: "/sales/new",
    label: "New",
    icon: Plus,
    permission: "sales.write",
    fab: true,
  },
  {
    href: "/sales",
    label: "Sales",
    icon: Receipt,
    permission: "sales.read",
  },
  {
    href: "/purchases",
    label: "Buy",
    icon: ShoppingCart,
    permission: "purchase.read",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visible = ITEMS.filter((item) => hasPermission(user, item.permission));

  if (visible.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-end justify-between gap-1 rounded-[1.75rem] border border-[var(--frappe-border)] bg-[var(--frappe-surface)]/95 px-2 py-2 shadow-[var(--frappe-shadow-lg)] backdrop-blur-xl dark:bg-[var(--frappe-surface)]/90">
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              !item.fab &&
              pathname.startsWith(`${item.href}/`));

          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="-mt-5 flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-[var(--frappe-desk)] transition hover:bg-primary/90 dark:ring-[var(--frappe-desk)]"
                aria-label="Create sale"
              >
                <Icon className="size-6" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-medium transition",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-[var(--frappe-text-muted)] hover:bg-[var(--frappe-section-head)] hover:text-[var(--frappe-text)]",
              )}
            >
              <Icon className="size-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
