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
  Factory,
  MessageSquare,
  Palette,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  permissions?: string[];
}

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
    title: "Stock Transfers",
    href: "/stock-transfers",
    icon: ArrowLeftRight,
    permission: "stock_transfer.read",
  },
  {
    title: "Purchases",
    href: "/purchases",
    icon: ShoppingCart,
    permission: "purchase.read",
  },
  {
    title: "Sales",
    href: "/sales",
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

export const masterNav: NavItem[] = [
  {
    title: "Locations",
    href: "/locations",
    icon: MapPin,
    permission: "locations.read",
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: Truck,
    permission: "suppliers.read",
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    permission: "customers.read",
  },
];

export const adminNav: NavItem[] = [
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
