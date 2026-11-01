"use client";
import { use, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageFormCard, PageFormSection } from "@/components/shared/page-form";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  errorMessage,
  formatDate,
  formatMoney,
  formatUnitPrice,
} from "@/lib/format";
import { purchaseOrderLabels, type PurchaseOrder } from "@/lib/purchase-orders";
import { toast } from "sonner";
export default function PurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    { user } = useAuth(),
    [busy, setBusy] = useState(false);
  const {
    data: o,
    error,
    reload,
  } = useFetch<PurchaseOrder>(() => api(`/purchase-orders/${id}`), [id]);
  async function action(action: string) {
    setBusy(true);
    try {
      await api(`/purchase-orders/${id}/${action}`, {
        method: "POST",
        body: {},
      });
      toast.success("Purchase order updated");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const write = hasPermission(user, "purchase.write"),
    receive = hasPermission(user, "purchase.receive");
  return (
    <AppShell
      title={`PO-${id.slice(0, 8).toUpperCase()}`}
      subtitle="Purchasing confirms the order. The stock keeper validates receipt of the goods."
    >
      <PermissionGate permission="purchase.read" showDenied>
        <Button asChild variant="outline" className="mb-4">
          <Link href="/purchase-orders">Back to purchase orders</Link>
        </Button>
        {error && <p role="alert">{error}</p>}
        {o && (
          <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{purchaseOrderLabels[o.state]}</Badge>
              <strong className="ml-auto text-xl">
                {formatMoney(o.total)}
              </strong>
            </div>
            <PageFormCard>
              <PageFormSection title="Purchase order details">
                <dl className="grid gap-5 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Supplier</dt>
                    <dd className="mt-1 font-medium">
                      {o.supplier?.name ?? "Supplier unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      Receiving location
                    </dt>
                    <dd className="mt-1 font-medium">
                      {o.location?.name ?? o.locationId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Payment terms</dt>
                    <dd className="mt-1 font-medium">
                      {o.payload.paymentMethod.replaceAll("_", " ")}
                      {o.payload.creditDueDate
                        ? ` ? Due ${formatDate(o.payload.creditDueDate)}`
                        : ""}
                    </dd>
                  </div>
                </dl>
                {o.payload.notes && (
                  <p className="mt-5 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">
                    {o.payload.notes}
                  </p>
                )}
              </PageFormSection>
            </PageFormCard>
            <ol className="flex flex-wrap gap-3 rounded-xl border bg-card p-4 text-sm">
              {[
                "Draft request",
                "Confirmed / awaiting goods",
                "Received / posted",
              ].map((s, i) => (
                <li key={s} className="rounded-lg bg-muted px-3 py-2">
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              {write && o.state === "DRAFT" && (
                <>
                  <Button variant="outline" asChild>
                    <Link href={`/purchase-orders/${id}/edit`}>
                      Edit purchase request
                    </Link>
                  </Button>
                  <Button disabled={busy} onClick={() => action("confirm")}>
                    Confirm purchase order
                  </Button>
                </>
              )}
              {receive && o.state === "CONFIRMED" && (
                <Button disabled={busy} onClick={() => action("receive")}>
                  Validate goods receipt & post purchase
                </Button>
              )}
              {write && !["RECEIVED", "CANCELLED"].includes(o.state) && (
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => action("cancel")}
                >
                  Cancel order
                </Button>
              )}
              {o.purchaseId && (
                <Button asChild>
                  <Link href={`/purchases/${o.purchaseId}`}>
                    View posted purchase
                  </Link>
                </Button>
              )}
            </div>
            <PageFormCard>
              <PageFormSection title="Ordered products">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-muted-foreground">
                      <tr>
                        <th className="p-3">Item</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Unit price</th>
                        <th className="p-3">Base stock quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.normalizedLines.map((l, i) => (
                        <tr className="border-b" key={i}>
                          <td className="p-3">
                            {o.items?.find((item) => item.id === l.itemId)
                              ?.description ?? l.itemId}
                          </td>
                          <td className="p-3">
                            {l.unitSnapshot?.quantity ?? l.quantity}{" "}
                            {l.unitSnapshot?.symbol}
                          </td>
                          <td className="p-3">
                            {formatMoney(
                              l.unitSnapshot?.unitPrice ?? l.unitPrice,
                            )}
                          </td>
                          <td className="p-3">{l.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PageFormSection>
            </PageFormCard>
            <PageFormCard>
              <PageFormSection title="Operation history">
                <ol className="space-y-3">
                  {o.history.map((h, i) => (
                    <li className="border-b pb-3 text-sm" key={i}>
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong>{h.action}</strong>
                        <span className="text-muted-foreground">
                          {formatDate(h.at)}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {h.actorName ?? h.actorId}
                      </p>
                    </li>
                  ))}
                </ol>
              </PageFormSection>
            </PageFormCard>
          </div>
        )}
      </PermissionGate>
    </AppShell>
  );
}
