import type { Sale, UnitSnapshot } from "./types";
export type OrderState =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "CONFIRMED"
  | "DELIVERED"
  | "CANCELLED";
export const orderStateLabel: Record<OrderState, string> = {
  DRAFT: "Quotation",
  PENDING_APPROVAL: "Price approval pending",
  APPROVED: "Approved quotation",
  CONFIRMED: "Confirmed · awaiting delivery",
  DELIVERED: "Delivered · invoice posted",
  CANCELLED: "Cancelled",
};
export interface SalesOrder {
  customer?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  items?: {
    id: string;
    description: string;
    sku: string | null;
    imagePath: string | null;
  }[];
  id: string;
  state: OrderState;
  locationId: string;
  total: string;
  saleId: string | null;
  createdById: string | null;
  approvedById: string | null;
  createdAt: string;
  priceExceptions: string[];
  payload: {
    customerId?: string;
    locationId: string;
    paymentMethod: Sale["paymentMethod"];
    bankAccountId?: string;
    notes?: string;
    creditDueDate?: string;
    commissionPercent?: number;
    commissionBasis?: Sale["commissionBasis"];
    soldByUserId?: string;
    inquiryId?: string;
    productionOrderId?: string;
    lines: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      unitId?: string;
      dimensions?: UnitSnapshot["dimensions"];
    }[];
  };
  normalizedLines: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    unitSnapshot: UnitSnapshot | null;
  }[];
  history: {
    action: string;
    actorId: string;
    actorName?: string;
    at: string;
    note?: string;
  }[];
}
