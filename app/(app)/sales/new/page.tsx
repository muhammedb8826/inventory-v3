"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SaleForm } from "@/components/sales/sale-form";
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { productItemId, resolveItem } from "@/lib/inventory-items";
import type { Inquiry, Item, ProductionOrder } from "@/lib/types";
import { toast } from "sonner";

type PrefillLine = {
  itemId: string;
  quantity: string;
  unitPrice: string;
  item?: Item;
};

type SaleInitial = {
  inquiryId?: string;
  productionOrderId?: string;
  customerId?: string;
  locationId?: string;
  lines?: PrefillLine[];
  notes?: string;
};

function NewSaleFromMto() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId") ?? "";
  const productionOrderId = searchParams.get("productionOrderId") ?? "";
  const [loading, setLoading] = useState(
    Boolean(inquiryId || productionOrderId),
  );
  const [initial, setInitial] = useState<SaleInitial | undefined>();

  useEffect(() => {
    if (!inquiryId && !productionOrderId) {
      setLoading(false);
      setInitial(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        let inquiry: Inquiry | null = null;
        let order: ProductionOrder | null = null;

        if (productionOrderId) {
          order = await api<ProductionOrder>(
            `/production-orders/${productionOrderId}`,
          );
        }
        const resolvedInquiryId = inquiryId || order?.inquiryId || "";
        if (resolvedInquiryId) {
          inquiry = await api<Inquiry>(`/inquiries/${resolvedInquiryId}`);
        }
        if (cancelled) return;

        const linesFromInquiry: PrefillLine[] =
          inquiry?.lines
            ?.filter((l) => l.itemId || l.item?.id)
            .map((l) => {
              const itemId = productItemId({
                itemId: l.itemId ?? undefined,
                item: l.item ?? undefined,
              });
              return {
                itemId,
                quantity:
                  l.quantity != null && String(l.quantity).trim() !== ""
                    ? String(Number(l.quantity))
                    : "1",
                unitPrice: "",
                item: l.item ? resolveItem(itemId, l.item) : undefined,
              };
            }) ?? [];

        const linesFromOrder: PrefillLine[] = order?.finishedItemId
          ? [
              {
                itemId: order.finishedItemId,
                quantity: order.quantityCompleted ?? order.quantityPlanned,
                unitPrice: "",
                item: order.finishedItem
                  ? resolveItem(order.finishedItemId, order.finishedItem)
                  : undefined,
              },
            ]
          : [];

        setInitial({
          inquiryId: resolvedInquiryId || undefined,
          productionOrderId: productionOrderId || undefined,
          customerId: inquiry?.customerId ?? undefined,
          locationId:
            order?.finishedLocationId ?? order?.locationId ?? undefined,
          lines: linesFromOrder.length
            ? linesFromOrder
            : linesFromInquiry.length
              ? linesFromInquiry
              : undefined,
          notes: inquiry
            ? `MTO from inquiry ${inquiry.contactName} — ${inquiry.subject}`
            : order?.orderNumber
              ? `From production ${order.orderNumber}`
              : undefined,
        });
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inquiryId, productionOrderId]);

  if (loading) {
    return (
      <div className="p-10">
        <PageLoading />
      </div>
    );
  }

  return <SaleForm initial={initial} />;
}

export default function NewSalePage() {
  return (
    <AppShell
      title="New Sales Invoice"
      subtitle="Not Saved"
      variant="form"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Sales Invoice", href: "/sales" },
        { label: "New" },
      ]}
    >
      <PermissionGate
        permission="sales.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to create sales.
          </p>
        }
      >
        <Suspense
          fallback={
            <div className="p-10">
              <PageLoading />
            </div>
          }
        >
          <NewSaleFromMto />
        </Suspense>
      </PermissionGate>
    </AppShell>
  );
}
