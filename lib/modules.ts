import type { LucideIcon } from "lucide-react";
import {
  Package,
  Boxes,
  ArrowLeftRight,
  ClipboardCheck,
  Warehouse,
  ClipboardList,
  Factory,
  Receipt,
  MessageSquare,
  Users,
  ShoppingCart,
  Truck,
  CreditCard,
  Wallet,
  Landmark,
  TrendingUp,
  BarChart3,
  MessagesSquare,
  MapPin,
  Layers,
  Tags,
  Ruler,
  Shield,
  Palette,
  UserCog,
  LayoutDashboard,
  Gauge,
  Undo2,
  Settings2,
  Trash2,
  FolderTree,
  History,
  LineChart,
} from "lucide-react";

export type ModuleLink = {
  title: string;
  href: string;
  description?: string;
  icon: LucideIcon;
  permission?: string;
  permissions?: string[];
};

export type ModuleMenuGroup = {
  label: string;
  links: ModuleLink[];
};

export type AppModule = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Tailwind-friendly accent for the app card */
  color: string;
  /** Soft background tint */
  tint: string;
  /** Any of these grants visibility of the app card */
  permissions: string[];
  menus: ModuleMenuGroup[];
};

/**
 * Odoo-style applications: one card per module, menus grouped inside the app.
 */
export const appModules: AppModule[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "KPIs, stock health, and cash at a glance",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "#0f766e",
    tint: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
    permissions: ["dashboard.read"],
    menus: [
      {
        label: "Overview",
        links: [
          {
            title: "Dashboard",
            href: "/dashboard",
            icon: Gauge,
            permission: "dashboard.read",
            description: "Sales, stock, and liquidity summary",
          },
        ],
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Transfers, adjustments, products, stock reporting, and warehouse setup",
    href: "/apps/inventory",
    icon: Package,
    color: "#714B67",
    tint: "bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-200",
    permissions: ["inventory.read", "stock_transfer.read", "stocktake.read"],
    menus: [
      {
        label: "Transfers",
        links: [
          {
            title: "Receipts",
            href: "/purchase-orders",
            icon: Truck,
            permission: "purchase.read",
            description: "Incoming goods from suppliers",
          },
          {
            title: "Deliveries",
            href: "/sales-orders",
            icon: Receipt,
            permission: "sales.read",
            description: "Outgoing goods to customers",
          },
          {
            title: "Internal transfers",
            href: "/stock-transfers",
            icon: ArrowLeftRight,
            permission: "stock_transfer.read",
            description: "Move stock between warehouses",
          },
          {
            title: "Manufacturing",
            href: "/production-orders",
            icon: Factory,
            permission: "production.read",
            description: "Material issues and finished receipts",
          },
        ],
      },
      {
        label: "Adjustments",
        links: [
          {
            title: "Physical inventory",
            href: "/stocktakes",
            icon: ClipboardCheck,
            permission: "stocktake.read",
            description: "Count stock and reconcile differences",
          },
          {
            title: "Scrap",
            href: "/apps/inventory/operations/scrap",
            icon: Trash2,
            permission: "inventory.write",
            description: "Write off damaged or unusable stock",
          },
        ],
      },
      {
        label: "Products",
        links: [
          {
            title: "Products",
            href: "/inventory/products",
            icon: Boxes,
            permission: "inventory.read",
            description: "SKU catalog, including zero stock",
          },
          {
            title: "Product variants",
            href: "/products",
            icon: Layers,
            permission: "inventory.read",
            description: "Families and attribute combinations",
          },
        ],
      },
      {
        label: "Reporting",
        links: [
          {
            title: "Stock",
            href: "/inventory",
            icon: Package,
            permission: "inventory.read",
            description: "On-hand quantity by location",
          },
          {
            title: "Moves history",
            href: "/inventory?tab=movements",
            icon: History,
            permission: "inventory.read",
            description: "Every stock move in order",
          },
          {
            title: "Moves analysis",
            href: "/apps/inventory/reporting/moves-analysis",
            icon: LineChart,
            permission: "inventory.read",
            description: "Summaries by type and period",
          },
          {
            title: "Returns",
            href: "/apps/inventory/reporting/returns",
            icon: Undo2,
            permission: "inventory.read",
            description: "Customer and supplier return moves",
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
            permission: "locations.read",
            description: "Warehouses, showrooms, and bins",
          },
          {
            title: "Operation types",
            href: "/apps/inventory/configuration/operation-types",
            icon: Warehouse,
            permission: "inventory.read",
            description: "Receipt, delivery, internal, and manufacture flows",
          },
        ],
      },
      {
        label: "Configuration",
        links: [
          {
            title: "Settings",
            href: "/apps/inventory/configuration/settings",
            icon: Settings2,
            permission: "inventory.read",
            description: "Units, attributes, and inventory defaults",
          },
          {
            title: "Product categories",
            href: "/apps/inventory/configuration/product-categories",
            icon: FolderTree,
            permission: "inventory.read",
            description: "Business groups for browsing and reporting",
          },
          {
            title: "Attributes",
            href: "/product-attributes",
            icon: Tags,
            permission: "inventory.write",
            description: "Color, size, and other variant options",
          },
          {
            title: "Units of measure",
            href: "/units",
            icon: Ruler,
            permission: "inventory.write",
            description: "Units, categories, and conversions",
          },
        ],
      },
    ],
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    description: "BOMs and production orders",
    href: "/apps/manufacturing",
    icon: Factory,
    color: "#C33B3B",
    tint: "bg-red-500/10 text-red-700 dark:text-red-300",
    permissions: ["bom.read", "production.read"],
    menus: [
      {
        label: "Operations",
        links: [
          {
            title: "Production orders",
            href: "/production-orders",
            icon: Factory,
            permission: "production.read",
            description: "Release, issue, and complete production",
          },
        ],
      },
      {
        label: "Products",
        links: [
          {
            title: "Bills of materials",
            href: "/boms",
            icon: ClipboardList,
            permission: "bom.read",
            description: "Components for manufactured items",
          },
        ],
      },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    description: "Orders, inquiries, and customers",
    href: "/apps/sales",
    icon: Receipt,
    color: "#F06E26",
    tint: "bg-orange-500/10 text-orange-800 dark:text-orange-200",
    permissions: ["sales.read", "inquiries.read", "customers.read"],
    menus: [
      {
        label: "Orders",
        links: [
          {
            title: "Sales orders",
            href: "/sales-orders",
            icon: Receipt,
            permission: "sales.read",
            description: "Quotations and customer orders",
          },
          {
            title: "Inquiries",
            href: "/inquiries",
            icon: MessageSquare,
            permission: "inquiries.read",
            description: "Customer requests before quoting",
          },
        ],
      },
      {
        label: "Partners",
        links: [
          {
            title: "Customers",
            href: "/customers",
            icon: Users,
            permission: "customers.read",
            description: "Customer master data",
          },
        ],
      },
    ],
  },
  {
    id: "purchases",
    name: "Purchases",
    description: "Purchase orders and suppliers",
    href: "/apps/purchases",
    icon: ShoppingCart,
    color: "#19407A",
    tint: "bg-blue-500/10 text-blue-800 dark:text-blue-200",
    permissions: ["purchase.read", "suppliers.read"],
    menus: [
      {
        label: "Orders",
        links: [
          {
            title: "Purchase orders",
            href: "/purchase-orders",
            icon: ShoppingCart,
            permission: "purchase.read",
            description: "Buy and receive stock",
          },
        ],
      },
      {
        label: "Partners",
        links: [
          {
            title: "Suppliers",
            href: "/suppliers",
            icon: Truck,
            permission: "suppliers.read",
            description: "Supplier master data",
          },
        ],
      },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    description: "Credits, expenses, bank, and reports",
    href: "/apps/finance",
    icon: Landmark,
    color: "#1AA179",
    tint: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    permissions: [
      "credit.read",
      "expense.read",
      "bank.read",
      "profit_loss.read",
      "reports.read",
    ],
    menus: [
      {
        label: "Operations",
        links: [
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
        ],
      },
      {
        label: "Reporting",
        links: [
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
        ],
      },
    ],
  },
  {
    id: "discuss",
    name: "Discuss",
    description: "Internal messages",
    href: "/messages",
    icon: MessagesSquare,
    color: "#875A7B",
    tint: "bg-purple-500/10 text-purple-800 dark:text-purple-200",
    permissions: ["messages.read", "messages.write"],
    menus: [
      {
        label: "Communication",
        links: [
          {
            title: "Messages",
            href: "/messages",
            icon: MessagesSquare,
            permissions: ["messages.read", "messages.write"],
          },
        ],
      },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    description: "Users, roles, branding, and audit",
    href: "/apps/settings",
    icon: Shield,
    color: "#5B6B7C",
    tint: "bg-slate-500/10 text-slate-700 dark:text-slate-200",
    permissions: [
      "settings.read",
      "settings.write",
      "users.read",
      "users.write",
      "roles.read",
      "roles.write",
    ],
    menus: [
      {
        label: "Administration",
        links: [
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
          {
            title: "Branding",
            href: "/settings/branding",
            icon: Palette,
            permissions: ["settings.read", "settings.write"],
          },
          {
            title: "Audit trail",
            href: "/settings/audit",
            icon: Shield,
            permission: "settings.read",
          },
        ],
      },
    ],
  },
];

export function getAppModule(id: string): AppModule | undefined {
  return appModules.find((m) => m.id === id);
}

/** Paths that stay on the Apps home switcher (not inside a module). */
export function isAppsHomePath(pathname: string): boolean {
  return pathname === "/apps" || pathname === "/dashboard";
}

/**
 * Which app the current route belongs to.
 * Returns null on the Apps home so the sidebar lists every application.
 */
export function resolveActiveApp(pathname: string): AppModule | null {
  if (isAppsHomePath(pathname)) return null;

  if (pathname.startsWith("/apps/")) {
    const id = pathname.split("/")[2];
    return getAppModule(id) ?? null;
  }

  // Mirror navigation owning-app map without importing navigation (avoid cycles).
  const owners: { prefix: string; id: string }[] = [
    { prefix: "/apps/inventory", id: "inventory" },
    { prefix: "/inventory", id: "inventory" },
    { prefix: "/items", id: "inventory" },
    { prefix: "/stock-transfers", id: "inventory" },
    { prefix: "/stocktakes", id: "inventory" },
    { prefix: "/warehouse", id: "inventory" },
    { prefix: "/locations", id: "inventory" },
    { prefix: "/products", id: "inventory" },
    { prefix: "/product-attributes", id: "inventory" },
    { prefix: "/units", id: "inventory" },
    // Inventory operations also surface POs / SOs / MOs (Odoo Transfers)
    { prefix: "/purchase-orders", id: "inventory" },
    { prefix: "/sales-orders", id: "inventory" },
    { prefix: "/production-orders", id: "inventory" },
    { prefix: "/boms", id: "manufacturing" },
    { prefix: "/inquiries", id: "sales" },
    { prefix: "/customers", id: "sales" },
    { prefix: "/purchases", id: "purchases" },
    { prefix: "/sales", id: "sales" },
    { prefix: "/suppliers", id: "purchases" },
    { prefix: "/credits", id: "finance" },
    { prefix: "/expenses", id: "finance" },
    { prefix: "/banks", id: "finance" },
    { prefix: "/profit-loss", id: "finance" },
    { prefix: "/reports", id: "finance" },
    { prefix: "/messages", id: "discuss" },
    { prefix: "/settings", id: "settings" },
    { prefix: "/users", id: "settings" },
    { prefix: "/roles", id: "settings" },
  ];

  const hit = owners.find(
    (row) => pathname === row.prefix || pathname.startsWith(`${row.prefix}/`),
  );
  return hit ? (getAppModule(hit.id) ?? null) : null;
}
