import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  LayoutGrid,
  Package,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  Receipt,
  CreditCard,
  Wallet,
  Landmark,
  TrendingUp,
  MapPin,
  Truck,
  Users,
  Shield,
  UserCog,
  BarChart3,
  ClipboardList,
  ClipboardCheck,
  Factory,
  MessageSquare,
  MessagesSquare,
  Warehouse,
  Palette,
  Layers,
  Tags,
  Ruler,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  permissions?: string[];
}

/**
 * Operational apps (Odoo/ERPNext style).
 * Stock ops stay in Inventory; buying/selling/mfg are separate modules.
 */
export const mainNav: NavItem[] = [
  {
    title: "Apps",
    href: "/apps",
    icon: LayoutGrid,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.read",
  },
  {
    title: "Inventory",
    href: "/apps/inventory",
    icon: Package,
    permissions: ["inventory.read", "stock_transfer.read", "stocktake.read"],
  },
  {
    title: "Manufacturing",
    href: "/apps/manufacturing",
    icon: Factory,
    permissions: ["bom.read", "production.read"],
  },
  {
    title: "Sales",
    href: "/apps/sales",
    icon: Receipt,
    permissions: ["sales.read", "inquiries.read", "customers.read"],
  },
  {
    title: "Purchases",
    href: "/apps/purchases",
    icon: ShoppingCart,
    permissions: ["purchase.read", "suppliers.read"],
  },
  {
    title: "Finance",
    href: "/apps/finance",
    icon: Landmark,
    permissions: [
      "credit.read",
      "expense.read",
      "bank.read",
      "profit_loss.read",
      "reports.read",
    ],
  },
  {
    title: "Discuss",
    href: "/messages",
    icon: MessagesSquare,
    permissions: ["messages.read", "messages.write"],
  },
  {
    title: "Settings",
    href: "/apps/settings",
    icon: Shield,
    permissions: [
      "settings.read",
      "settings.write",
      "users.read",
      "users.write",
      "roles.read",
      "roles.write",
    ],
  },
  // Deep links kept for search / active-path helpers (hidden from sidebar groups)
  {
    title: "Stock balances",
    href: "/inventory",
    icon: Package,
    permission: "inventory.read",
  },
  {
    title: "Products",
    href: "/inventory/products",
    icon: Boxes,
    permission: "inventory.read",
  },
  {
    title: "Stock Transfers",
    href: "/stock-transfers",
    icon: ArrowLeftRight,
    permission: "stock_transfer.read",
  },
  {
    title: "Stocktakes",
    href: "/stocktakes",
    icon: ClipboardCheck,
    permission: "stocktake.read",
  },
  {
    title: "Putaway / Pick",
    href: "/warehouse",
    icon: Warehouse,
    permission: "inventory.write",
  },
  {
    title: "BOMs",
    href: "/boms",
    icon: ClipboardList,
    permission: "bom.read",
  },
  {
    title: "Production",
    href: "/production-orders",
    icon: Factory,
    permission: "production.read",
  },
  {
    title: "Sales orders",
    href: "/sales-orders",
    icon: Receipt,
    permission: "sales.read",
  },
  {
    title: "Inquiries",
    href: "/inquiries",
    icon: MessageSquare,
    permission: "inquiries.read",
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    permission: "customers.read",
  },
  {
    title: "Purchase orders",
    href: "/purchase-orders",
    icon: ShoppingCart,
    permission: "purchase.read",
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: Truck,
    permission: "suppliers.read",
  },
  {
    title: "Credits",
    href: "/credits",
    icon: CreditCard,
    permission: "credit.read",
  },
  {
    title: "Expenses",
    href: "/expenses",
    icon: Wallet,
    permission: "expense.read",
  },
  {
    title: "Bank",
    href: "/banks",
    icon: Landmark,
    permission: "bank.read",
  },
  {
    title: "Profit & Loss",
    href: "/profit-loss",
    icon: TrendingUp,
    permission: "profit_loss.read",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    permission: "reports.read",
  },
];

/**
 * Configuration / masters (Odoo Inventory → Configuration, ERPNext Stock masters).
 * Product families, attributes, and UoM do not belong under day-to-day Inventory.
 */
/** Kept for search + breadcrumbs; Configuration lives inside Inventory app. */
export const configNav: NavItem[] = [
  {
    title: "Locations",
    href: "/locations",
    icon: MapPin,
    permission: "locations.read",
  },
  {
    title: "Product families",
    href: "/products",
    icon: Layers,
    permission: "inventory.read",
  },
  {
    title: "Attributes",
    href: "/product-attributes",
    icon: Tags,
    permission: "inventory.write",
  },
  {
    title: "Units of measure",
    href: "/units",
    icon: Ruler,
    permission: "inventory.write",
  },
];

/** Sidebar Configuration group is empty — use Inventory app → Configuration. */
export const sidebarConfigNav: NavItem[] = [];

/** @deprecated Use configNav — kept for imports that still expect masterNav. */
export const masterNav = configNav;

export const adminNav: NavItem[] = [
  {
    title: "Audit trail",
    href: "/settings/audit",
    icon: Shield,
    permission: "settings.read",
  },
  {
    title: "Branding",
    href: "/settings/branding",
    icon: Palette,
    permissions: ["settings.read", "settings.write"],
  },
  {
    title: "Users",
    href: "/users",
    icon: UserCog,
    permissions: ["users.read", "users.write"],
  },
  {
    title: "Roles",
    href: "/roles",
    icon: Shield,
    permissions: ["roles.read", "roles.write"],
  },
];

/**
 * Sidebar shows module entry points (Odoo-style).
 * Deep screens open from each app’s menu cards.
 */
export const navGroups: { label: string; paths: string[] }[] = [
  { label: "Home", paths: ["/apps", "/dashboard"] },
  {
    label: "Applications",
    paths: [
      "/apps/inventory",
      "/apps/manufacturing",
      "/apps/sales",
      "/apps/purchases",
      "/apps/finance",
      "/messages",
      "/apps/settings",
    ],
  },
];

/** Map a route to the Odoo-style app that owns it (for sidebar highlight). */
const APP_ROUTE_OWNERS: { prefix: string; appHref: string }[] = [
  { prefix: "/inventory", appHref: "/apps/inventory" },
  { prefix: "/items", appHref: "/apps/inventory" },
  { prefix: "/stock-transfers", appHref: "/apps/inventory" },
  { prefix: "/stocktakes", appHref: "/apps/inventory" },
  { prefix: "/warehouse", appHref: "/apps/inventory" },
  { prefix: "/locations", appHref: "/apps/inventory" },
  { prefix: "/products", appHref: "/apps/inventory" },
  { prefix: "/product-attributes", appHref: "/apps/inventory" },
  { prefix: "/units", appHref: "/apps/inventory" },
  { prefix: "/boms", appHref: "/apps/manufacturing" },
  { prefix: "/production-orders", appHref: "/apps/manufacturing" },
  { prefix: "/sales-orders", appHref: "/apps/sales" },
  { prefix: "/sales", appHref: "/apps/sales" },
  { prefix: "/inquiries", appHref: "/apps/sales" },
  { prefix: "/customers", appHref: "/apps/sales" },
  { prefix: "/purchase-orders", appHref: "/apps/purchases" },
  { prefix: "/purchases", appHref: "/apps/purchases" },
  { prefix: "/suppliers", appHref: "/apps/purchases" },
  { prefix: "/credits", appHref: "/apps/finance" },
  { prefix: "/expenses", appHref: "/apps/finance" },
  { prefix: "/banks", appHref: "/apps/finance" },
  { prefix: "/profit-loss", appHref: "/apps/finance" },
  { prefix: "/reports", appHref: "/apps/finance" },
  { prefix: "/messages", appHref: "/messages" },
  { prefix: "/settings", appHref: "/apps/settings" },
  { prefix: "/users", appHref: "/apps/settings" },
  { prefix: "/roles", appHref: "/apps/settings" },
];

/**
 * Map legacy / nested paths to the nav item that should appear active.
 */
export function navigationPath(path: string): string {
  if (
    path === "/items" ||
    path.startsWith("/items/") ||
    path === "/inventory/new" ||
    path.startsWith("/inventory/new/")
  ) {
    return "/inventory/products";
  }
  if (path === "/sales" || path.startsWith("/sales/")) return "/sales-orders";
  if (path === "/purchases" || path.startsWith("/purchases/")) {
    return "/purchase-orders";
  }
  return path;
}

export function owningAppHref(pathname: string): string | null {
  const path = navigationPath(pathname);
  const hit = APP_ROUTE_OWNERS.find(
    (row) => path === row.prefix || path.startsWith(`${row.prefix}/`),
  );
  return hit?.appHref ?? null;
}

/** Active state for sidebar links (module entries highlight while inside that app). */
export function isNavItemActive(pathname: string, href: string): boolean {
  const path = navigationPath(pathname);
  if (href === "/apps") {
    return path === "/apps";
  }
  if (href.startsWith("/apps/")) {
    return path === href || owningAppHref(pathname) === href;
  }
  if (href === "/inventory") {
    return (
      path === "/inventory" || /^\/inventory\/[^/]+(\/edit)?$/.test(path)
    );
  }
  return path === href || path.startsWith(`${href}/`);
}
