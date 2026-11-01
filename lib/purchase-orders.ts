import type { Purchase, UnitSnapshot } from "./types";
export const purchaseOrderLabels = {
  DRAFT: "Draft purchase request",
  CONFIRMED: "Confirmed · awaiting receipt",
  RECEIVED: "Received · purchase posted",
  CANCELLED: "Cancelled",
};
export interface PurchaseOrder {
  supplier?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  id: string;
  state: keyof typeof purchaseOrderLabels;
  locationId: string;
  total: string;
  purchaseId: string | null;
  createdAt: string;
  payload: {
    supplierId: string;
    locationId: string;
    paymentMethod: Purchase["paymentMethod"];
    bankAccountId?: string;
    creditDueDate?: string;
    notes?: string;
    lines: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      unitId?: string;
      lotNumber?: string;
      expiryDate?: string;
      dimensions?: UnitSnapshot["dimensions"];
    }[];
  };
  normalizedLines: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    unitSnapshot: UnitSnapshot | null;
  }[];
  items?: { id: string; description: string; sku?: string }[];
  history: {
    action: string;
    actorId: string;
    actorName?: string;
    at: string;
  }[];
}
