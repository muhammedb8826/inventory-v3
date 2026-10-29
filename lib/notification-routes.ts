/** Deep-link path for a notification entity, or null when not navigable. */
export function notificationDetailPath(id: string): string {
  return `/notifications/${id}`;
}

/** Deep-link path for a notification entity, or null when not navigable. */
export function notificationHref(
  entityType?: string | null,
  entityId?: string | null
): string | null {
  if (!entityType || !entityId) return null;

  const type = entityType.toLowerCase().replace(/-/g, "_");

  switch (type) {
    case "sale":
      return `/sales/${entityId}`;
    case "purchase":
      return `/purchases/${entityId}`;
    case "stock_transfer":
      return `/stock-transfers/${entityId}`;
    case "customer_credit":
    case "supplier_credit":
    case "credit":
      return "/credits";
    case "expense":
      return "/expenses";
    case "inventory":
    case "stock":
      return "/inventory";
    case "inquiry":
      return `/inquiries?id=${encodeURIComponent(entityId)}`;
    case "production_order":
      return `/production-orders/${entityId}`;
    default:
      return null;
  }
}

/** Deep-link for shortage → prefilled purchase when notification carries the event. */
export function shortagePurchaseHref(
  metadata?: Record<string, unknown> | null,
  entityType?: string | null,
  entityId?: string | null,
): string | null {
  if (metadata?.event !== "material_shortage") return null;
  if (typeof metadata.purchaseHref === "string" && metadata.purchaseHref) {
    return metadata.purchaseHref;
  }
  if (
    entityType?.toLowerCase().replace(/-/g, "_") === "production_order" &&
    entityId
  ) {
    return `/purchases/new?productionOrderId=${encodeURIComponent(entityId)}`;
  }
  return null;
}

export const NOTIFICATION_MODULES = [
  { value: "sales", label: "Sales" },
  { value: "inventory", label: "Inventory" },
  { value: "purchases", label: "Purchases" },
  { value: "stock_transfers", label: "Stock transfers" },
  { value: "credits", label: "Credits" },
  { value: "expenses", label: "Expenses" },
  { value: "inquiries", label: "Inquiries" },
  { value: "system", label: "System" },
] as const;
