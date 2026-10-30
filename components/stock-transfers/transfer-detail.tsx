"use client";
import { RecordActivity } from "@/components/shared/record-metadata";
import { UnitQuantityDisplay } from "@/components/inventory/unit-quantity-display";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/permission-gate";
import {
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { formatDate, formatQty, errorMessage } from "@/lib/format";
import { inventoryMovementsHref } from "@/lib/inventory-movements";
import { api } from "@/lib/api";
import type { StockTransfer } from "@/lib/types";
import { toast } from "sonner";

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export function TransferDetail({
  transfer,
  onChanged,
}: {
  transfer: StockTransfer;
  onChanged?: (transfer: StockTransfer) => void;
}) {
  const lines = transfer.lines ?? [];
  const [busy, setBusy] = useState(false);

  async function runAction(
    path: string,
    method: "POST" | "DELETE",
    success: string,
  ) {
    setBusy(true);
    try {
      const updated = await api<StockTransfer>(path, { method });
      toast.success(success);
      onChanged?.(updated);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleVoid() {
    const label =
      transfer.status === "PENDING"
        ? "Cancel this pending transfer? Reserved stock will be released."
        : "Void this completed transfer? Stock will move back to the source location.";
    if (!confirm(label)) return;
    void runAction(
      `/stock-transfers/${transfer.id}`,
      "DELETE",
      transfer.status === "PENDING" ? "Transfer cancelled" : "Transfer voided",
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/stock-transfers">← Back to list</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link
            href={inventoryMovementsHref({
              refType: "stock_transfer",
              refId: transfer.id,
            })}
          >
            Stock movements
          </Link>
        </Button>
        <PermissionGate permission="stock_transfer.write">
          {transfer.status === "PENDING" ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void runAction(
                    `/stock-transfers/${transfer.id}/ship`,
                    "POST",
                    "Shipped — in transit",
                  )
                }
              >
                {busy ? "Working…" : "Ship"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={busy}
                onClick={handleVoid}
              >
                Cancel
              </Button>
            </>
          ) : null}
          {transfer.status === "IN_TRANSIT" ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() =>
                void runAction(
                  `/stock-transfers/${transfer.id}/receive`,
                  "POST",
                  "Received at destination",
                )
              }
            >
              {busy ? "Working…" : "Receive"}
            </Button>
          ) : null}
          {transfer.status === "COMPLETED" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={busy}
              onClick={handleVoid}
            >
              Void transfer
            </Button>
          ) : null}
        </PermissionGate>
        <Badge variant="outline" className="ml-auto">
          {transfer.status}
        </Badge>
      </div>

      <RecordActivity record={transfer} />
      <PageFormCard>
        <PageFormSection
          title="Transfer"
          description={
            transfer.createdAt
              ? `Created ${formatDate(transfer.createdAt)}`
              : undefined
          }
        >
          <FormGrid>
            <DetailField
              label="From"
              value={transfer.fromLocation?.name ?? "—"}
            />
            <DetailField label="To" value={transfer.toLocation?.name ?? "—"} />
            <DetailField
              label="Document ID"
              value={<span className="font-mono text-xs">{transfer.id}</span>}
            />
            {transfer.notes ? (
              <div className="sm:col-span-2">
                <DetailField label="Notes" value={transfer.notes} />
              </div>
            ) : null}
          </FormGrid>
        </PageFormSection>

        <PageFormSection
          title="Items"
          description={`${lines.length} line${lines.length === 1 ? "" : "s"}`}
        >
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No line items on this transfer.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5 text-right tabular-nums">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, i) => (
                    <tr key={line.id ?? `${line.itemId}-${i}`}>
                      <td className="px-4 py-2.5">
                        {line.item?.description ?? line.itemId}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {line.item?.sku ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <UnitQuantityDisplay
                          quantity={line.quantity}
                          unit={line.item?.unit}
                          snapshot={line.unitSnapshot}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageFormSection>
      </PageFormCard>
    </div>
  );
}
