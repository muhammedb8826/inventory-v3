"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeSection,
} from "@/components/frappe";
import { PageLoading } from "@/components/shared/page-loading";
import { api } from "@/lib/api";
import { resolveItemImageUrl } from "@/lib/inventory-media";
import {
  inventoryMovementsHref,
  stockMovementDocumentHref,
  stockMovementRefLabel,
  stockMovementTypeLabel,
} from "@/lib/inventory-movements";
import { isLowStockRow } from "@/lib/inventory-stock";
import { itemTypeLabel } from "@/lib/item-types";
import { buildInventoryMovementsListPath } from "@/lib/list-query";
import { errorMessage, formatDate, formatMoney, formatQty } from "@/lib/format";
import type {
  LowStockRecord,
  PaginatedResponse,
  StockMovement,
  StockRecord,
} from "@/lib/types";
import { toast } from "sonner";
import { EyeIcon, ImageIcon } from "lucide-react";

function DetailValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="min-h-8 text-sm text-[var(--frappe-text)]">{children}</p>
  );
}

export function StockDetailDialog({
  record,
  trigger,
}: {
  record: StockRecord;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<StockRecord | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setDetail(null);
      setMovements([]);
      return;
    }
    setDetail(record);
    setLoading(true);
    try {
      const [fresh, movementPage] = await Promise.all([
        api<StockRecord>(`/inventory/${record.id}`),
        api<PaginatedResponse<StockMovement> | StockMovement[]>(
          buildInventoryMovementsListPath(
            {
              itemId: record.itemId,
              locationId: record.locationId,
            },
            1,
            8
          )
        ),
      ]);
      setDetail(fresh);
      setMovements(
        Array.isArray(movementPage) ? movementPage : (movementPage.data ?? [])
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const shown = detail ?? record;
  const imageSrc = resolveItemImageUrl(
    shown.item.imageUrl ?? shown.item.imagePath
  );
  const stockValue =
    parseFloat(shown.quantity) * parseFloat(shown.purchasePrice);
  const lowRow = shown as LowStockRecord;
  const qty = parseFloat(shown.quantity);
  const outOfStock =
    lowRow.status === "OUT_OF_STOCK" || (!Number.isNaN(qty) && qty <= 0);
  const lowStock = isLowStockRow(shown);
  const allMovementsHref = inventoryMovementsHref({
    itemId: shown.itemId,
    locationId: shown.locationId,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="icon" variant="ghost" aria-label="View stock">
            <EyeIcon className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3">
          <DialogTitle className="text-base">Stock details</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          {loading && !detail ? (
            <PageLoading />
          ) : (
            <FrappeDocument>
              <FrappeSection title="Item">
                <div className="mb-4 overflow-hidden rounded-lg border border-[var(--frappe-border)] bg-[var(--frappe-section-head)]">
                  {imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageSrc}
                      alt={shown.item.description}
                      className="aspect-[4/3] w-full object-cover sm:aspect-[21/9]"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-[var(--frappe-text-muted)] sm:aspect-[21/9]">
                      <ImageIcon className="size-10" />
                      <p className="text-xs">No image</p>
                    </div>
                  )}
                </div>
                <FrappeFormGrid columns={2}>
                  <FrappeField label="Description" fullWidth>
                    <DetailValue>{shown.item.description}</DetailValue>
                  </FrappeField>
                  <FrappeField label="SKU">
                    <DetailValue>{shown.item.sku || "—"}</DetailValue>
                  </FrappeField>
                  <FrappeField label="Unit">
                    <DetailValue>{shown.item.unit || "—"}</DetailValue>
                  </FrappeField>
                  <FrappeField label="Item type">
                    <DetailValue>
                      {itemTypeLabel(shown.item.itemType)}
                    </DetailValue>
                  </FrappeField>
                  <FrappeField label="Location">
                    <DetailValue>
                      {shown.location?.name
                        ? `${shown.location.name}${
                            shown.location.type
                              ? ` (${shown.location.type})`
                              : ""
                          }`
                        : "—"}
                    </DetailValue>
                  </FrappeField>
                </FrappeFormGrid>
              </FrappeSection>
              <FrappeSection title="Stock">
                <FrappeFormGrid columns={2}>
                  <FrappeField label="On hand">
                    <div className="flex min-h-8 flex-wrap items-center gap-2">
                      <span className="text-sm font-medium tabular-nums text-[var(--frappe-text)]">
                        {formatQty(shown.quantity)}
                      </span>
                      {outOfStock ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Out of stock
                        </Badge>
                      ) : lowStock ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Low stock
                        </Badge>
                      ) : null}
                    </div>
                  </FrappeField>
                  <FrappeField label="Reorder point">
                    <DetailValue>
                      {shown.reorderPoint != null && shown.reorderPoint !== ""
                        ? formatQty(shown.reorderPoint)
                        : "—"}
                    </DetailValue>
                  </FrappeField>
                  <FrappeField label="Purchase price">
                    <DetailValue>
                      {formatMoney(shown.purchasePrice)}
                    </DetailValue>
                  </FrappeField>
                  <FrappeField label="Stock value">
                    <DetailValue>{formatMoney(stockValue)}</DetailValue>
                  </FrappeField>
                </FrappeFormGrid>
              </FrappeSection>
              <FrappeSection
                title="Recent movements"
                description="Ledger for this item at this location"
              >
                {loading && movements.length === 0 ? (
                  <p className="text-sm text-[var(--frappe-text-muted)]">
                    Loading…
                  </p>
                ) : movements.length === 0 ? (
                  <p className="text-sm text-[var(--frappe-text-muted)]">
                    No movements recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="frappe-list-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th className="text-right">Delta</th>
                          <th className="text-right">After</th>
                          <th>Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((m) => {
                          const delta = Number(m.quantityDelta);
                          const sign = delta > 0 ? "+" : "";
                          const refHref = stockMovementDocumentHref(
                            m.refType,
                            m.refId
                          );
                          const refLabel = stockMovementRefLabel(
                            m.refType,
                            m.refId
                          );
                          return (
                            <tr key={m.id}>
                              <td className="whitespace-nowrap">
                                {formatDate(m.createdAt)}
                              </td>
                              <td>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal"
                                >
                                  {stockMovementTypeLabel(m.type)}
                                </Badge>
                              </td>
                              <td className="text-right tabular-nums">
                                {sign}
                                {formatQty(m.quantityDelta)}
                              </td>
                              <td className="text-right tabular-nums">
                                {formatQty(m.quantityAfter)}
                              </td>
                              <td>
                                {refHref ? (
                                  <Link
                                    href={refHref}
                                    className="text-[var(--frappe-primary)] hover:underline"
                                  >
                                    {refLabel}
                                  </Link>
                                ) : (
                                  refLabel
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-3">
                  <Link
                    href={allMovementsHref}
                    className="text-sm font-medium text-[var(--frappe-primary)] hover:underline"
                  >
                    View full movement history →
                  </Link>
                </div>
              </FrappeSection>
            </FrappeDocument>
          )}
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
