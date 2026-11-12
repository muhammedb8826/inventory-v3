import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
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
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.read",
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
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
    title: "Messages",
    href: "/messages",
    icon: MessagesSquare,
    permissions: ["messages.read", "messages.write"],
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

/** Sidebar group definitions — single source for module layout. */
export const navGroups: { label: string; paths: string[] }[] = [
  { label: "Overview", paths: ["/dashboard"] },
  {
    label: "Inventory",
    paths: [
      "/inventory",
      "/stock-transfers",
      "/stocktakes",
      "/warehouse",
    ],
  },
  {
    label: "Manufacturing",
    paths: ["/boms", "/production-orders"],
  },
  {
    label: "Sales",
    paths: ["/sales-orders", "/inquiries", "/customers"],
  },
  {
    label: "Purchases",
    paths: ["/purchase-orders", "/suppliers"],
  },
  {
    label: "Finance",
    paths: [
      "/credits",
      "/expenses",
      "/banks",
      "/profit-loss",
      "/reports",
    ],
  },
  { label: "Communication", paths: ["/messages"] },
];

/**
 * Map legacy / nested paths to the nav item that should appear active.
 * Config routes keep their own sidebar entries (not Inventory).
 */
export function navigationPath(path: string): string {
  if (path === "/items" || path.startsWith("/items/")) return "/inventory";
  if (path === "/sales" || path.startsWith("/sales/")) return "/sales-orders";
  if (path === "/purchases" || path.startsWith("/purchases/")) {
    return "/purchase-orders";
  }
  return path;
}
