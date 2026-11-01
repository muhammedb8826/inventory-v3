"use client";
import { use, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { orderStateLabel, type SalesOrder } from "@/lib/sales-orders";
import { toast } from "sonner";

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    { user } = useAuth();
  const {
    data: o,
    error,
    reload,
  } = useFetch<SalesOrder>(() => api(`/sales-orders/${id}`), [id]);
  const [busy, setBusy] = useState(false),
    [note, setNote] = useState("");

  async function action(action: string) {
    setBusy(true);
    try {
      await api(`/sales-orders/${id}/${action}`, {
        method: "POST",
        body: ["approve", "reject"].includes(action) ? { note } : undefined,
      });
      toast.success("Order updated");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const write = hasPermission(user, "sales.write"),
    approve = hasPermission(user, "sales.approve"),
    deliver = hasPermission(user, "sales.deliver");
  return (
    <AppShell
      title={o ? `SO-${id.slice(0, 8).toUpperCase()}` : "Sales order"}
      subtitle="Prices and conversion quantities are frozen for approval. Stock and invoice posting happen at delivery."
    >
      <PermissionGate permission="sales.read" showDenied>
        <Button asChild variant="outline" className="mb-5">
          <Link href="/sales-orders">Back to orders</Link>
        </Button>
        {error && <p role="alert">{error}</p>}
        {o && (
          <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{orderStateLabel[o.state]}</Badge>
              <span className="ml-auto text-xl font-semibold">
                {formatMoney(o.total)}
              </span>
            </div>
            <PageFormCard>
              <PageFormSection title="Order details">
                <dl className="grid gap-5 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Customer</dt>
                    <dd className="mt-1 font-medium">
                      {o.customer?.name ??
                        (o.payload.customerId
                          ? "Customer unavailable"
                          : "Walk-in customer")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      Stock / delivery location
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
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {o.payload.inquiryId && (
                    <Link
                      className="text-primary underline"
                      href={`/inquiries/${o.payload.inquiryId}`}
                    >
                      Source inquiry
                    </Link>
                  )}
                  {o.payload.productionOrderId && (
                    <Link
                      className="text-primary underline"
                      href={`/production-orders/${o.payload.productionOrderId}`}
                    >
                      Production order
                    </Link>
                  )}
                </div>
              </PageFormSection>
            </PageFormCard>
            <ol className="flex flex-wrap gap-3 rounded-xl border bg-card p-4 text-sm">
              {[
                "Quotation",
                "Price approval",
                "Confirmed / reserved",
                "Delivered / posted",
              ].map((s, i) => (
                <li key={s} className="rounded-lg bg-muted px-3 py-2">
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              {write &&
                ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(o.state) && (
                  <Button variant="outline" asChild>
                    <Link href={`/sales-orders/${id}/edit`}>
                      Revise quotation
                    </Link>
                  </Button>
                )}
              {write && o.state === "DRAFT" && (
                <Button disabled={busy} onClick={() => action("submit")}>
                  Submit quotation
                </Button>
              )}
              {write && o.state === "APPROVED" && (
                <Button disabled={busy} onClick={() => action("confirm")}>
                  Confirm & reserve stock
                </Button>
              )}
              {deliver && o.state === "CONFIRMED" && (
                <Button disabled={busy} onClick={() => action("deliver")}>
                  Validate delivery & post invoice
                </Button>
              )}
              {write && !["DELIVERED", "CANCELLED"].includes(o.state) && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => action("cancel")}
                >
                  Cancel order
                </Button>
              )}
              {o.saleId && (
                <Button asChild>
                  <Link href={`/sales/${o.saleId}`}>View posted sale</Link>
                </Button>
              )}
            </div>
            {!!o.priceExceptions.length && (
              <PageFormCard>
                <PageFormSection title="Price exceptions">
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {o.priceExceptions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  {approve && o.state === "PENDING_APPROVAL" && (
                    <div className="mt-4 space-y-3">
                      <Input
                        aria-label="Approval decision reason"
                        placeholder="Reason for approving or rejecting these prices"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          disabled={
                            busy ||
                            note.trim().length < 3 ||
                            o.createdById === user?.id
                          }
                          onClick={() => action("approve")}
                        >
                          Approve prices
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy || note.trim().length < 3}
                          onClick={() => action("reject")}
                        >
                          Request revision
                        </Button>
                      </div>
                      {o.createdById === user?.id && (
                        <p className="text-sm text-muted-foreground">
                          Another authorized user must approve your quotation.
                        </p>
                      )}
                    </div>
                  )}
                </PageFormSection>
              </PageFormCard>
            )}
            <PageFormCard>
              <PageFormSection title="Order lines">
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
                        <tr key={i} className="border-b">
                          <td className="p-3">
                            <Link
                              className="text-primary underline"
                              href={`/items/${l.itemId}`}
                            >
                              {o.items?.find((item) => item.id === l.itemId)
                                ?.description ?? l.itemId}
                            </Link>
                          </td>
                          <td className="p-3">
                            {l.unitSnapshot?.quantity ?? l.quantity}{" "}
                            {l.unitSnapshot?.symbol ?? ""}
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
              <PageFormSection title="Activity & approvals">
                <ol className="space-y-4">
                  {o.history.map((h, i) => (
                    <li key={i} className="border-b pb-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong>{h.action}</strong>
                        <span className="text-muted-foreground">
                          {formatDate(h.at)}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {h.actorName ?? h.actorId}
                      </p>
                      {h.note && <p className="mt-1">{h.note}</p>}
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
