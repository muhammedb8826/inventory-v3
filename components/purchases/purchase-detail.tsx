"use client";
import { RecordActivity } from "@/components/shared/record-metadata";
import { UnitQuantityDisplay } from "@/components/inventory/unit-quantity-display";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { PurchaseDocumentActions } from "@/components/transactions/document-actions";
import { formatMoney, formatDate, formatQty } from "@/lib/format";
import { documentTotal } from "@/lib/document-utils";
import { inventoryMovementsHref } from "@/lib/inventory-movements";
import type { Purchase, PurchaseLine } from "@/lib/types";

function DetailField({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {href ? (
        <Link
          href={href}
          className="text-sm font-medium text-primary hover:underline"
        >
          {value}
        </Link>
      ) : (
        <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}

function lineAmount(line: PurchaseLine) {
  const qty = parseFloat(line.quantity);
  const price = parseFloat(line.unitPrice);
  if (line.lineTotal) return line.lineTotal;
  if (line.amount) return line.amount;
  if (!Number.isNaN(qty) && !Number.isNaN(price)) {
    return String(qty * price);
  }
  return "0";
}

export function PurchaseDetail({ purchase }: { purchase: Purchase }) {
  const lines = purchase.lines ?? [];
  const paymentLabel = purchase.paymentMethod.replace("_", " ");
  const isVoided = purchase.status === "VOIDED";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/purchases">← Back to list</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link
            href={inventoryMovementsHref({
              refType: "purchase",
              refId: purchase.id,
            })}
          >
            Stock movements
          </Link>
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isVoided ? (
            <Badge variant="secondary">Voided</Badge>
          ) : (
            <Badge variant="outline">{paymentLabel}</Badge>
          )}
          <PurchaseDocumentActions
            purchaseId={purchase.id}
            status={purchase.status}
          />
        </div>
      </div>

      <RecordActivity record={purchase} />
      <PageFormCard>
        <PageFormSection
          title="Purchase details"
          description={
            purchase.createdAt
              ? `Created ${formatDate(purchase.createdAt)}`
              : undefined
          }
        >
          <FormGrid>
            <DetailField
              label="Supplier"
              value={purchase.supplier?.name ?? "—"}
              href={purchase.supplierId ? `/suppliers` : undefined}
            />
            <DetailField
              label="Location"
              value={purchase.location?.name ?? "—"}
            />
            <DetailField label="Payment method" value={paymentLabel} />
            {purchase.paymentMethod !== "CREDIT" ? (
              <DetailField
                label="Bank account"
                value={purchase.bankAccount?.name ?? "—"}
              />
            ) : (
              <DetailField
                label="Credit due date"
                value={
                  purchase.creditDueDate
                    ? formatDate(purchase.creditDueDate)
                    : "—"
                }
              />
            )}
            <DetailField
              label="Total amount"
              value={formatMoney(documentTotal(purchase))}
            />
            <DetailField
              label="Document ID"
              value={<span className="font-mono text-xs">{purchase.id}</span>}
            />
            {purchase.notes ? (
              <div className="sm:col-span-2">
                <DetailField label="Notes" value={purchase.notes} />
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
              No line items on this purchase.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5 text-right tabular-nums">Qty</th>
                    <th className="px-4 py-2.5 text-right tabular-nums">
                      Rate
                    </th>
                    <th className="px-4 py-2.5 text-right tabular-nums">
                      Amount
                    </th>
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
                          commercial
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(
                          line.unitSnapshot?.unitPrice ?? line.unitPrice,
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                        {formatMoney(lineAmount(line))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20">
                    <td
                      colSpan={4}
                      className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-muted-foreground"
                    >
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums">
                      {formatMoney(documentTotal(purchase))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </PageFormSection>
      </PageFormCard>
    </div>
  );
}
