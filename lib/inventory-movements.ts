import { ApiRequestError } from "@/lib/api";
import type { StockMovementType } from "@/lib/types";

export const STOCK_MOVEMENT_TYPE_OPTIONS: {
  value: StockMovementType;
  label: string;
}[] = [
  { value: "SALE", label: "Sale" },
  { value: "SALE_VOID", label: "Sale void" },
  { value: "SALE_REVERSAL", label: "Sale reversal" },
  { value: "SALE_RETURN", label: "Sale return" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "PURCHASE_VOID", label: "Purchase void" },
  { value: "PURCHASE_REVERSAL", label: "Purchase reversal" },
  { value: "TRANSFER_OUT", label: "Transfer out" },
  { value: "TRANSFER_IN", label: "Transfer in" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "PRODUCTION_ISSUE", label: "Production issue" },
  { value: "PRODUCTION_RECEIPT", label: "Production receipt" },
  { value: "PRODUCTION_REVERSE", label: "Production reverse" },
  { value: "OPENING", label: "Opening" },
  { value: "IMPORT", label: "Import" },
];

export function stockMovementTypeLabel(type: string | undefined): string {
  if (!type) return "—";
  const match = STOCK_MOVEMENT_TYPE_OPTIONS.find(
    (option) => option.value === type
  );
  return match?.label ?? type.replace(/_/g, " ");
}

export type StockMovementRefFilters = {
  refType?: string;
  refId?: string;
  itemId?: string;
  locationId?: string;
};

/** App route for Inventory → Movements with optional ledger filters. */
export function inventoryMovementsHref(
  filters?: StockMovementRefFilters
): string {
  const params = new URLSearchParams();
  params.set("tab", "movements");
  if (filters?.refType) params.set("refType", filters.refType);
  if (filters?.refId) params.set("refId", filters.refId);
  if (filters?.itemId) params.set("itemId", filters.itemId);
  if (filters?.locationId) params.set("locationId", filters.locationId);
  const qs = params.toString();
  return qs ? `/inventory?${qs}` : "/inventory?tab=movements";
}

export function stockMovementRefLabel(
  refType?: string | null,
  refId?: string | null
): string {
  if (!refType) return "—";
  const shortId = refId ? ` · ${refId.slice(0, 8)}…` : "";
  switch (refType) {
    case "sale":
      return `Sale${shortId}`;
    case "purchase":
      return `Purchase${shortId}`;
    case "stock_transfer":
      return `Transfer${shortId}`;
    case "production_order":
      return `Production${shortId}`;
    case "stock_adjustment":
      return `Adjustment${shortId}`;
    default:
      return `${refType.replace(/_/g, " ")}${shortId}`;
  }
}

/** Deep link back to the source document when we know the ref type. */
export function stockMovementDocumentHref(
  refType?: string | null,
  refId?: string | null
): string | null {
  if (!refType || !refId) return null;
  switch (refType) {
    case "sale":
      return `/sales/${refId}`;
    case "purchase":
      return `/purchases/${refId}`;
    case "stock_transfer":
      return `/stock-transfers/${refId}`;
    case "production_order":
      return `/production-orders/${refId}`;
    default:
      return null;
  }
}

/** Friendlier copy when the API rejects a duplicate SKU (409). */
export function skuConflictMessage(err: unknown): string | null {
  if (!(err instanceof ApiRequestError) || err.status !== 409) return null;
  const msg = err.message.toLowerCase();
  if (!msg.includes("sku")) return null;
  return "This SKU is already used by another item. Choose a different SKU or leave it blank.";
}
