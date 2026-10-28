"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { PermissionGate } from "@/components/permission-gate";
import { api } from "@/lib/api";
import { errorMessage, formatDate, formatMoney, formatQty } from "@/lib/format";
import { inventoryMovementsHref } from "@/lib/inventory-movements";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import { productionStatusLabel } from "@/lib/production";
import type { ProductionOrder } from "@/lib/types";
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

export function ProductionOrderDetail({
  order,
  onUpdated,
}: {
  order: ProductionOrder;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [unbuildOpen, setUnbuildOpen] = useState(false);
  const [scrapOpen, setScrapOpen] = useState(false);
  const remaining = useMemo(() => {
    const planned = parseFloat(order.quantityPlanned);
    const done = parseFloat(order.quantityCompleted ?? "0");
    return Math.max(0, planned - done);
  }, [order.quantityPlanned, order.quantityCompleted]);
  const [completeQty, setCompleteQty] = useState(String(remaining || 1));
  const [unbuildQty, setUnbuildQty] = useState(
    order.quantityCompleted ?? "1",
  );
  const [scrapQty, setScrapQty] = useState("1");
  const [autoIssue, setAutoIssue] = useState(true);

  const lines = order.lines ?? [];
  const status = order.status;
  const completed = parseFloat(order.quantityCompleted ?? "0");

  async function runAction(
    path: string,
    body?: Record<string, unknown>,
    successMessage?: string,
  ) {
    setBusy(true);
    try {
      await api(path, {
        method: "POST",
        body: body ?? {},
      });
      toast.success(successMessage ?? "Updated");
      requestNotificationsRefresh();
      onUpdated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    const quantity = parseFloat(completeQty);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error("Enter a positive quantity");
      return;
    }
    setBusy(true);
    try {
      await api(`/production-orders/${order.id}/complete`, {
        method: "POST",
        body: { quantity, autoIssue },
      });
      toast.success("Production completed");
      requestNotificationsRefresh();
      setCompleteOpen(false);
      onUpdated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnbuild(e: React.FormEvent) {
    e.preventDefault();
    const quantity = parseFloat(unbuildQty);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error("Enter a positive quantity");
      return;
    }
    setBusy(true);
    try {
      await api(`/production-orders/${order.id}/unbuild`, {
        method: "POST",
        body: { quantity },
      });
      toast.success("Unbuilt — FG removed, materials returned");
      requestNotificationsRefresh();
      setUnbuildOpen(false);
      onUpdated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleScrap(e: React.FormEvent) {
    e.preventDefault();
    const quantity = parseFloat(scrapQty);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error("Enter a positive quantity");
      return;
    }
    setBusy(true);
    try {
      await api(`/production-orders/${order.id}/scrap`, {
        method: "POST",
        body: { quantity },
      });
      toast.success("Scrap recorded");
      requestNotificationsRefresh();
      setScrapOpen(false);
      onUpdated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/production-orders">← Back to list</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link
            href={inventoryMovementsHref({
              refType: "production_order",
              refId: order.id,
            })}
          >
            Stock movements
          </Link>
        </Button>
        <Badge variant="outline" className="ml-auto">
          {productionStatusLabel(status)}
        </Badge>
        {order.materialsReserved ? (
          <Badge variant="secondary">Reserved</Badge>
        ) : null}
        <PermissionGate permission="production.write">
          {status === "DRAFT" ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                runAction(
                  `/production-orders/${order.id}/release`,
                  undefined,
                  "Order released — materials reserved",
                )
              }
            >
              Release &amp; reserve
            </Button>
          ) : null}
          {status === "RELEASED" || status === "IN_PROGRESS" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  runAction(
                    `/production-orders/${order.id}/issue`,
                    {},
                    "Materials issued",
                  )
                }
              >
                Issue remaining
              </Button>
              <Button
                size="sm"
                disabled={busy || remaining <= 0}
                onClick={() => {
                  setCompleteQty(String(remaining || 1));
                  setCompleteOpen(true);
                }}
              >
                Complete
              </Button>
            </>
          ) : null}
          {completed > 0 ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setUnbuildQty(String(completed));
                  setUnbuildOpen(true);
                }}
              >
                Unbuild
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setScrapQty("1");
                  setScrapOpen(true);
                }}
              >
                Scrap FG
              </Button>
            </>
          ) : null}
          {status !== "COMPLETED" && status !== "CANCELLED" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                runAction(
                  `/production-orders/${order.id}/cancel`,
                  undefined,
                  "Order cancelled",
                )
              }
            >
              Cancel
            </Button>
          ) : null}
        </PermissionGate>
      </div>

      <PageFormCard>
        <PageFormSection
          title={order.orderNumber ?? "Order"}
          description={
            order.createdAt
              ? `Created ${formatDate(order.createdAt)}`
              : undefined
          }
        >
          <FormGrid>
            <DetailField
              label="BOM"
              value={
                order.bom ? (
                  <Link
                    href={`/boms/${order.bomId}`}
                    className="text-primary hover:underline"
                  >
                    {order.bom.name}
                  </Link>
                ) : (
                  order.bomId
                )
              }
            />
            <DetailField
              label="Finished item"
              value={
                order.finishedItem?.description ??
                order.bom?.finishedItem?.description ??
                "—"
              }
            />
            <DetailField
              label="Component location"
              value={order.location?.name ?? "—"}
            />
            <DetailField
              label="FG receipt location"
              value={
                order.finishedLocation?.name ??
                order.location?.name ??
                "—"
              }
            />
            <DetailField
              label="Planned qty"
              value={formatQty(order.quantityPlanned)}
            />
            <DetailField
              label="Completed / remaining"
              value={`${formatQty(order.quantityCompleted ?? "0")} / ${formatQty(remaining)}`}
            />
            {parseFloat(order.quantityScrapped ?? "0") > 0 ? (
              <DetailField
                label="Scrapped"
                value={formatQty(order.quantityScrapped ?? "0")}
              />
            ) : null}
            <DetailField
              label="Document ID"
              value={
                <span className="font-mono text-xs">{order.id}</span>
              }
            />
            {order.notes ? (
              <div className="sm:col-span-2">
                <DetailField label="Notes" value={order.notes} />
              </div>
            ) : null}
          </FormGrid>
        </PageFormSection>

        <PageFormSection
          title="Materials"
          description={`${lines.length} leaf component line${lines.length === 1 ? "" : "s"} (multi-level exploded)`}
        >
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No material lines on this order.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5">Component</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5 text-right tabular-nums">
                      Required
                    </th>
                    <th className="px-4 py-2.5 text-right tabular-nums">
                      Issued
                    </th>
                    <th className="px-4 py-2.5 text-right tabular-nums">
                      Issued value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, i) => (
                    <tr key={line.id ?? `${line.componentItemId}-${i}`}>
                      <td className="px-4 py-2.5">
                        {line.componentItem?.description ??
                          line.componentItemId}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {line.componentItem?.sku ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatQty(line.quantityRequired ?? "0")}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatQty(line.quantityIssued ?? "0")}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(line.issuedValue ?? "0")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageFormSection>
      </PageFormCard>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <form onSubmit={handleComplete}>
            <DialogHeader>
              <DialogTitle>Complete production</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Finished quantity (remaining {formatQty(remaining)})</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={completeQty}
                  onChange={(e) => setCompleteQty(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoIssue}
                  onCheckedChange={setAutoIssue}
                  id="auto-issue"
                />
                <Label htmlFor="auto-issue" className="font-normal">
                  Auto-issue remaining materials
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                Complete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={unbuildOpen} onOpenChange={setUnbuildOpen}>
        <DialogContent>
          <form onSubmit={handleUnbuild}>
            <DialogHeader>
              <DialogTitle>Unbuild finished goods</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Removes FG from stock and returns proportional materials.
              </p>
              <div className="grid gap-2">
                <Label>Quantity to unbuild</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={unbuildQty}
                  onChange={(e) => setUnbuildQty(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                Unbuild
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={scrapOpen} onOpenChange={setScrapOpen}>
        <DialogContent>
          <form onSubmit={handleScrap}>
            <DialogHeader>
              <DialogTitle>Scrap finished goods</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Writes off FG without returning materials.
              </p>
              <div className="grid gap-2">
                <Label>Quantity to scrap</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={scrapQty}
                  onChange={(e) => setScrapQty(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy} variant="destructive">
                Scrap
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
