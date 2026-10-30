"use client";
import { RecordActivity } from "@/components/shared/record-metadata";
import { UnitQuantityDisplay } from "@/components/inventory/unit-quantity-display";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { SaleReturnDialog } from "@/components/sales/sale-return-dialog";
import { SaleDocumentActions } from "@/components/transactions/document-actions";
import { formatMoney, formatDate, formatQty } from "@/lib/format";
import { documentTotal } from "@/lib/document-utils";
import { inventoryMovementsHref } from "@/lib/inventory-movements";
import {
  formatCommissionBasis,
  formatCommissionRate,
  saleRepUser,
} from "@/lib/sale-utils";
import type { Sale, SaleLine } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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

function lineAmount(line: SaleLine) {
  const qty = parseFloat(line.quantity);
  const price = parseFloat(line.unitPrice);
  if (line.lineTotal) return line.lineTotal;
  if (line.amount) return line.amount;
  if (!Number.isNaN(qty) && !Number.isNaN(price)) {
    return String(qty * price);
  }
  return "0";
}

export function SaleDetail({ sale }: { sale: Sale }) {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "sales.write");
  const lines = sale.lines ?? [];
  const paymentLabel = sale.paymentMethod.replace("_", " ");
  const isVoided = sale.status === "VOIDED";
  const soldBy = saleRepUser(sale);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/sales">← Back to list</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link
            href={inventoryMovementsHref({
              refType: "sale",
              refId: sale.id,
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
          {canWrite && !isVoided ? (
            <SaleReturnDialog sale={sale} onSuccess={() => router.refresh()} />
          ) : null}
          <SaleDocumentActions saleId={sale.id} status={sale.status} />
        </div>
      </div>

      <RecordActivity record={sale} />
      <PageFormCard>
        <PageFormSection
          title="Sales invoice"
          description={
            sale.createdAt ? `Created ${formatDate(sale.createdAt)}` : undefined
          }
        >
          <FormGrid>
            <DetailField
              label="Customer"
              value={sale.customer?.name ?? "—"}
              href={sale.customerId ? `/customers` : undefined}
            />
            <DetailField label="Location" value={sale.location?.name ?? "—"} />
            <DetailField label="Payment method" value={paymentLabel} />
            {sale.paymentMethod !== "CREDIT" ? (
              <DetailField
                label="Bank account"
                value={sale.bankAccount?.name ?? "—"}
              />
            ) : (
              <DetailField
                label="Credit due date"
                value={
                  sale.creditDueDate ? formatDate(sale.creditDueDate) : "—"
                }
              />
            )}
            <DetailField
              label="Total amount"
              value={formatMoney(documentTotal(sale))}
            />
            {soldBy ? (
              <DetailField label="Sales rep" value={soldBy.fullName} />
            ) : null}
            {sale.commissionBasis ? (
              <DetailField
                label="Commission basis"
                value={formatCommissionBasis(sale.commissionBasis)}
              />
            ) : null}
            {formatCommissionRate(
              sale.commissionPercent,
              sale.commissionBasis,
            ) ? (
              <DetailField
                label="Commission rate"
                value={formatCommissionRate(
                  sale.commissionPercent,
                  sale.commissionBasis,
                )!}
              />
            ) : null}
            {sale.commissionAmount ? (
              <DetailField
                label="Commission amount"
                value={formatMoney(sale.commissionAmount)}
              />
            ) : null}
            {sale.createdBy && sale.createdBy.id !== soldBy?.id ? (
              <DetailField label="Entered by" value={sale.createdBy.fullName} />
            ) : null}
            <DetailField
              label="Document ID"
              value={<span className="font-mono text-xs">{sale.id}</span>}
            />
            {sale.notes ? (
              <div className="sm:col-span-2">
                <DetailField label="Notes" value={sale.notes} />
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
              No line items on this sale.
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
                      {formatMoney(documentTotal(sale))}
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
