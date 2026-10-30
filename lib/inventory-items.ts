import type { AreaDimensions } from "./types";
import type { Item, StockRecord } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Product UUID from stock or line payload — never the stock row id unless it equals itemId. */
export function productItemId(source: {
  id?: string;
  itemId?: string;
  item?: Partial<Item> | null;
}): string {
  const nested = source.item?.id?.trim();
  const flat = source.itemId?.trim();
  if (nested && flat && nested !== flat && flat === source.id) {
    return nested;
  }
  return flat || nested || "";
}

export function isProductItemId(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  return UUID_RE.test(value.trim());
}

/** Normalize item from stock/line payloads when nested `item` is partial or missing. */
export function resolveItem(itemId: string, item?: Partial<Item> | null): Item {
  const id = productItemId({ itemId, item }) || itemId;
  return {
    id,
    description: item?.description ?? id,
    sku: item?.sku,
    unit: item?.unit,
    itemType: item?.itemType,
  };
}

/** Build productId → Item map for line-item selects (stock + existing lines). */
export function buildItemOptionMap(
  stock: { id?: string; itemId: string; item?: Item | null }[],
  lines: { itemId: string; item?: Item | null }[],
): Map<string, Item> {
  const map = new Map<string, Item>();
  for (const source of [...stock, ...lines]) {
    const itemId = productItemId(source);
    if (!isProductItemId(itemId)) continue;
    map.set(itemId, resolveItem(itemId, source.item));
  }
  return map;
}

export function itemOptionsFromMap(map: Map<string, Item>) {
  return Array.from(map.entries()).map(([itemId, item]) => ({
    itemId,
    item,
    label: item.sku ? `${item.description} (${item.sku})` : item.description,
  }));
}

export function itemOptionsFromStock(stock: StockRecord[]) {
  return itemOptionsFromMap(buildItemOptionMap(stock, []));
}

export interface DocumentLineInput {
  inquiryLineId?: string;
  dimensions?: AreaDimensions;
  unitId?: string;
  itemId: string;
  quantity: string | number;
  unitPrice?: string | number;
  lotNumber?: string;
  expiryDate?: string;
}

export interface DocumentLineBody {
  inquiryLineId?: string;
  dimensions?: AreaDimensions;
  unitId?: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  lotNumber?: string;
  expiryDate?: string;
}

export function parseDocumentLines(
  lines: DocumentLineInput[],
): { lines: DocumentLineBody[] } | { error: string } {
  const parsed: DocumentLineBody[] = [];

  for (const line of lines) {
    const itemId = productItemId(line);
    if (!itemId) continue;
    if (!isProductItemId(itemId)) {
      return {
        error:
          "Each line must use a product from stock (select from the list — not SKU or stock row id).",
      };
    }
    const quantity =
      typeof line.quantity === "number"
        ? line.quantity
        : parseFloat(line.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return { error: "Enter a valid quantity for each line." };
    }
    const unitPriceRaw = line.unitPrice ?? "";
    const unitPrice =
      typeof unitPriceRaw === "number"
        ? unitPriceRaw
        : parseFloat(String(unitPriceRaw));
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      return { error: "Enter a valid unit price for each line." };
    }
    const row: DocumentLineBody = { itemId, quantity, unitPrice };
    if (line.inquiryLineId) row.inquiryLineId = line.inquiryLineId;
    if (line.unitId) row.unitId = line.unitId;
    if (line.dimensions) row.dimensions = line.dimensions;
    const lotNumber = line.lotNumber?.trim();
    if (lotNumber) row.lotNumber = lotNumber;
    const expiryDate = line.expiryDate?.trim();
    if (expiryDate) row.expiryDate = expiryDate;
    parsed.push(row);
  }

  if (parsed.length === 0) {
    return { error: "Add at least one line item." };
  }

  return { lines: parsed };
}

export interface TransferLineInput {
  dimensions?: AreaDimensions;
  unitId?: string;
  itemId: string;
  quantity: string | number;
}

export function parseTransferLines(lines: TransferLineInput[]):
  | {
      lines: {
        itemId: string;
        quantity: number;
        unitId?: string;
        dimensions?: AreaDimensions;
      }[];
    }
  | { error: string } {
  const parsed: {
    itemId: string;
    quantity: number;
    unitId?: string;
    dimensions?: AreaDimensions;
  }[] = [];

  for (const line of lines) {
    const itemId = productItemId(line);
    if (!itemId) continue;
    if (!isProductItemId(itemId)) {
      return {
        error:
          "Each line must use a product from stock (select from the list — not SKU or stock row id).",
      };
    }
    const quantity =
      typeof line.quantity === "number"
        ? line.quantity
        : parseFloat(line.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return { error: "Enter a valid quantity for each line." };
    }
    parsed.push({
      itemId,
      quantity,
      ...(line.unitId ? { unitId: line.unitId } : {}),
      ...(line.dimensions ? { dimensions: line.dimensions } : {}),
    });
  }

  if (parsed.length === 0) {
    return { error: "Add at least one line item." };
  }

  return { lines: parsed };
}
