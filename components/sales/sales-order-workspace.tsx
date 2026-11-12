"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  FileDownIcon,
  HistoryIcon,
  PencilIcon,
  SendIcon,
  TruckIcon,
  XIcon,
} from "lucide-react";
import { SaleForm } from "@/components/sales/sale-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  errorMessage,
  formatDate,
  formatMoney,
  formatUnitPrice,
} from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import {
  orderStateLabel,
  type OrderState,
  type SalesOrder,
} from "@/lib/sales-orders";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PIPELINE: {
  key: string;
  label: string;
  states: OrderState[];
}[] = [
  { key: "quotation", label: "Quotation", states: ["DRAFT"] },
  {
    key: "sent",
    label: "Sent / approval",
    states: ["PENDING_APPROVAL", "APPROVED"],
  },
  { key: "order", label: "Sales order", states: ["CONFIRMED"] },
  { key: "done", label: "Delivered", states: ["DELIVERED"] },
];

function pipelineIndex(state: OrderState): number {
  if (state === "CANCELLED") return -1;
  const i = PIPELINE.findIndex((step) => step.states.includes(state));
  return i < 0 ? 0 : i;
}

function orderRef(id: string) {
  return `S${id.slice(0, 5).toUpperCase()}`;
}

function StatusPipeline({ state }: { state: OrderState }) {
  const active = pipelineIndex(state);
  if (state === "CANCELLED") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        Cancelled
      </div>
    );
  }

  return (
    <ol
      className="flex flex-wrap items-center gap-1 sm:gap-0"
      aria-label="Order status"
    >
      {PIPELINE.map((step, index) => {
        const isActive = index === active;
        const isDone = index < active;
        return (
          <li key={step.key} className="flex items-center">
            <span
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-semibold tracking-wide sm:px-3 sm:text-sm",
                isActive &&
                  "bg-primary text-primary-foreground shadow-sm",
                isDone &&
                  "bg-primary/15 text-primary",
                !isActive &&
                  !isDone &&
                  "bg-muted text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {index < PIPELINE.length - 1 && (
              <span
                className={cn(
                  "mx-1 hidden h-px w-4 sm:block sm:w-6",
                  index < active ? "bg-primary/50" : "bg-border",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function AuditSidebar({ order }: { order: SalesOrder }) {
  return (
    <aside
      className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border bg-card shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)]"
      aria-label="Activity log"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <HistoryIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Activity</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!order.history?.length ? (
          <p className="text-sm text-muted-foreground">
            No activity yet. Actions you take here are logged automatically.
          </p>
        ) : (
          <ol className="space-y-4">
            {[...order.history].reverse().map((event, index) => (
              <li key={`${event.at}-${index}`} className="relative pl-4">
                <span
                  className="absolute left-0 top-1.5 size-2 rounded-full bg-primary"
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {event.actorName ?? "System"}
                  </p>
                  <time className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(event.at)}
                  </time>
                </div>
                <p className="mt-0.5 text-sm text-foreground">{event.action}</p>
                {event.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        Status:{" "}
        <span className="font-medium text-foreground">
          {orderStateLabel[order.state]}
        </span>
      </div>
    </aside>
  );
}

export function SalesOrderWorkspace({
  order,
  reload,
}: {
  order: SalesOrder;
  reload: () => unknown;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"lines" | "info">("lines");
  const [revising, setRevising] = useState(false);

  const write = hasPermission(user, "sales.write");
  const approve = hasPermission(user, "sales.approve");
  const deliver = hasPermission(user, "sales.deliver");
  const ref = orderRef(order.id);

  const subtotal = useMemo(() => {
    return order.normalizedLines.reduce((sum, line) => {
      const qty = Number(line.unitSnapshot?.quantity ?? line.quantity) || 0;
      const price = Number(line.unitSnapshot?.unitPrice ?? line.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [order.normalizedLines]);

  async function runAction(action: string) {
    setBusy(true);
    try {
      await api(`/sales-orders/${order.id}/${action}`, {
        method: "POST",
        body: ["approve", "reject"].includes(action)
          ? { note: note.trim() }
          : undefined,
      });
      toast.success("Order updated");
      setNote("");
      setRevising(false);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const canRevise =
    write &&
    ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(order.state);

  if (revising && canRevise) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Revising quotation</p>
            <h1 className="text-xl font-semibold tracking-tight">{ref}</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRevising(false)}
          >
            Back to order
          </Button>
        </div>
        <SaleForm quotation={order} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        {/* Actions + status */}
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-wrap gap-2">
            {write && order.state === "DRAFT" && (
              <Button disabled={busy} onClick={() => runAction("submit")}>
                <SendIcon className="size-4" />
                Send
              </Button>
            )}
            {write && order.state === "APPROVED" && (
              <Button disabled={busy} onClick={() => runAction("confirm")}>
                <CheckIcon className="size-4" />
                Confirm
              </Button>
            )}
            {deliver && order.state === "CONFIRMED" && (
              <Button disabled={busy} onClick={() => runAction("deliver")}>
                <TruckIcon className="size-4" />
                Deliver & invoice
              </Button>
            )}
            {canRevise && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setRevising(true)}
              >
                <PencilIcon className="size-4" />
                Edit
              </Button>
            )}
            {order.saleId && (
              <Button variant="outline" asChild>
                <Link href={`/sales/${order.saleId}`}>
                  <FileDownIcon className="size-4" />
                  Posted invoice
                </Link>
              </Button>
            )}
            {write && !["DELIVERED", "CANCELLED"].includes(order.state) && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => runAction("cancel")}
              >
                <XIcon className="size-4" />
                Cancel
              </Button>
            )}
          </div>
          <StatusPipeline state={order.state} />
        </div>

        {/* Header details */}
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {orderStateLabel[order.state]}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {ref}
                </h1>
              </div>
              <p className="text-right text-2xl font-semibold tabular-nums">
                {formatMoney(order.total)}
              </p>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="mt-1 font-medium">
                  {order.customer?.name ??
                    (order.payload.customerId
                      ? "Customer unavailable"
                      : "Walk-in customer")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payment terms</dt>
                <dd className="mt-1 font-medium">
                  {order.payload.paymentMethod.replaceAll("_", " ")}
                  {order.payload.creditDueDate
                    ? ` · Due ${formatDate(order.payload.creditDueDate)}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Delivery location</dt>
                <dd className="mt-1 font-medium">
                  {order.location?.name ?? order.locationId}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(order.createdAt)}
                </dd>
              </div>
              {order.payload.inquiryId && (
                <div>
                  <dt className="text-muted-foreground">Source inquiry</dt>
                  <dd className="mt-1 font-medium">
                    <Link
                      className="text-primary hover:underline"
                      href={`/inquiries/${order.payload.inquiryId}`}
                    >
                      Open inquiry
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Tabs */}
          <div className="border-b px-4 sm:px-5">
            <div className="flex gap-5 text-sm" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "lines"}
                className={cn(
                  "border-b-2 py-3 font-medium transition",
                  tab === "lines"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab("lines")}
              >
                Order lines
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "info"}
                className={cn(
                  "border-b-2 py-3 font-medium transition",
                  tab === "info"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab("info")}
              >
                Other info
              </button>
            </div>
          </div>

          {tab === "lines" ? (
            <div className="p-4 sm:p-5">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Description</th>
                      <th className="px-3 py-2.5 font-medium">Qty</th>
                      <th className="px-3 py-2.5 font-medium">Unit price</th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.normalizedLines.map((line, index) => {
                      const qty =
                        Number(line.unitSnapshot?.quantity ?? line.quantity) ||
                        0;
                      const price =
                        Number(
                          line.unitSnapshot?.unitPrice ?? line.unitPrice,
                        ) || 0;
                      const item = order.items?.find(
                        (i) => i.id === line.itemId,
                      );
                      return (
                        <tr key={index} className="border-b last:border-0">
                          <td className="px-3 py-3">
                            <Link
                              href={`/items/${line.itemId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {item?.description ?? line.itemId}
                            </Link>
                            {item?.sku ? (
                              <p className="text-xs text-muted-foreground">
                                {item.sku}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 tabular-nums">
                            {qty} {line.unitSnapshot?.symbol ?? ""}
                          </td>
                          <td className="px-3 py-3 tabular-nums">
                            {formatUnitPrice(price)}
                          </td>
                          <td className="px-3 py-3 text-right font-medium tabular-nums">
                            {formatMoney(qty * price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {canRevise && (
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-primary hover:underline"
                  onClick={() => setRevising(true)}
                >
                  Add / edit lines
                </button>
              )}

              <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Untaxed amount</span>
                  <span className="tabular-nums">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatMoney(order.total)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 p-4 sm:grid-cols-2 sm:p-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Sales</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Payment method</dt>
                    <dd className="mt-1 font-medium">
                      {order.payload.paymentMethod.replaceAll("_", " ")}
                    </dd>
                  </div>
                  {order.payload.soldByUserId && (
                    <div>
                      <dt className="text-muted-foreground">Salesperson</dt>
                      <dd className="mt-1 font-medium">
                        {order.payload.soldByUserId.slice(0, 8)}…
                      </dd>
                    </div>
                  )}
                  {order.payload.commissionPercent != null && (
                    <div>
                      <dt className="text-muted-foreground">Commission</dt>
                      <dd className="mt-1 font-medium">
                        {order.payload.commissionPercent}% (
                        {order.payload.commissionBasis ?? "—"})
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Notes</h3>
                <p className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {order.payload.notes?.trim() || "No notes"}
                </p>
                {order.payload.productionOrderId && (
                  <Link
                    className="text-sm font-medium text-primary hover:underline"
                    href={`/production-orders/${order.payload.productionOrderId}`}
                  >
                    Linked production order
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Price approval stays on the same page */}
        {!!order.priceExceptions.length && (
          <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-semibold">Price exceptions</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {order.priceExceptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {approve && order.state === "PENDING_APPROVAL" && (
              <div className="mt-4 space-y-3">
                <Input
                  aria-label="Approval decision reason"
                  placeholder="Reason for approving or rejecting these prices"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={
                      busy ||
                      note.trim().length < 3 ||
                      order.createdById === user?.id
                    }
                    onClick={() => runAction("approve")}
                  >
                    Approve prices
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || note.trim().length < 3}
                    onClick={() => runAction("reject")}
                  >
                    Request revision
                  </Button>
                </div>
                {order.createdById === user?.id && (
                  <p className="text-sm text-muted-foreground">
                    Another authorized user must approve your quotation.
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <AuditSidebar order={order} />
    </div>
  );
}
