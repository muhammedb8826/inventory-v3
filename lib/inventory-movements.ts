import type { StockMovementType } from "@/lib/types";

export const STOCK_MOVEMENT_TYPE_OPTIONS: {
  value: StockMovementType;
  label: string;
}[] = [
  { value: "SALE", label: "Sale" },
  { value: "SALE_VOID", label: "Sale void" },
  { value: "SALE_REVERSAL", label: "Sale reversal" },
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
