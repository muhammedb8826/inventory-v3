"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { PermissionGate } from "@/components/permission-gate";
import { api } from "@/lib/api";
import { errorMessage, formatDate, formatMoney, formatQty } from "@/lib/format";
import type { Bom, BomCostRollup, BomExplodeResult } from "@/lib/types";
import Link from "next/link";
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

export function BomDetail({
  bom,
  onUpdated,
}: {
  bom: Bom;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const lines = bom.lines ?? [];
  const [busy, setBusy] = useState(false);
  const [explode, setExplode] = useState<BomExplodeResult | null>(null);
  const [rollup, setRollup] = useState<BomCostRollup | null>(null);

  async function loadExplode() {
    setBusy(true);
    try {
      const data = await api<BomExplodeResult>(
        `/boms/${bom.id}/explode?quantity=1`,
      );
      setExplode(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadRollup() {
    setBusy(true);
    try {
      const data = await api<BomCostRollup>(`/boms/${bom.id}/cost-rollup`);
      setRollup(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function setDefault() {
    setBusy(true);
    try {
      await api(`/boms/${bom.id}/set-default`, { method: "POST" });
      toast.success("Marked as default BOM");
      onUpdated?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function revise() {
    if (
      !confirm(
        "Create a new revision? The current BOM will be deactivated and a new version created.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const created = await api<Bom>(`/boms/${bom.id}/revise`, {
        method: "POST",
        body: {},
      });
      toast.success(`Revision ${created.version ?? ""} created`);
      router.push(`/boms/${created.id}`);
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
          <Link href="/boms">← Back to list</Link>
        </Button>
        <Badge
          variant={bom.isActive === false ? "secondary" : "outline"}
          className="ml-auto"
        >
          {bom.isActive === false ? "Inactive" : "Active"}
        </Badge>
        {bom.isDefault ? <Badge variant="outline">Default</Badge> : null}
        <PermissionGate permission="bom.write">
          {!bom.isDefault && bom.isActive !== false ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={setDefault}
            >
              Set default
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={revise}
          >
            Revise
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/boms/${bom.id}/edit`}>Edit</Link>
          </Button>
        </PermissionGate>
      </div>

      <PageFormCard>
        <PageFormSection
          title={bom.name}
          description={
            bom.createdAt ? `Created ${formatDate(bom.createdAt)}` : undefined
          }
        >
          <FormGrid>
            <DetailField
              label="Finished item"
              value={bom.finishedItem?.description ?? bom.finishedItemId}
            />
            <DetailField
              label="Item type"
              value={bom.finishedItem?.itemType ?? "—"}
            />
            <DetailField label="Version" value={bom.version ?? "—"} />
            <DetailField
              label="Yield %"
              value={
                bom.yieldPercent != null ? `${bom.yieldPercent}%` : "100%"
              }
            />
            <DetailField
              label="Effective"
              value={
                bom.effectiveFrom || bom.effectiveTo
                  ? `${bom.effectiveFrom ?? "…"} → ${bom.effectiveTo ?? "…"}`
                  : "Always"
              }
            />
            <DetailField
              label="Document ID"
              value={<span className="font-mono text-xs">{bom.id}</span>}
            />
            {bom.notes ? (
              <div className="sm:col-span-2">
                <DetailField label="Notes" value={bom.notes} />
              </div>
            ) : null}
          </FormGrid>
        </PageFormSection>

        <PageFormSection
          title="Components"
          description={`${lines.length} line${lines.length === 1 ? "" : "s"} per finished unit`}
        >
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No component lines.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5">Component</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Phantom</th>
                    <th className="px-4 py-2.5 text-right tabular-nums">
                      Qty / FG
                    </th>
                    <th className="px-4 py-2.5 text-right tabular-nums">
                      Scrap %
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
                        {line.componentItem?.itemType ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {line.componentItem?.sku ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {line.isPhantom || line.componentItem?.isPhantom ? (
                          <Badge variant="outline">Phantom</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatQty(String(line.quantity))}
                        {line.componentItem?.unit
                          ? ` ${line.componentItem.unit}`
                          : ""}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {line.scrapPercent != null && line.scrapPercent !== ""
                          ? `${line.scrapPercent}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageFormSection>

        <PageFormSection
          title="Multi-level & costing"
          description="Explode shows full leaf RAW (planning). Cost rollup uses stocked SEMI costs and only passes through phantoms."
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={loadExplode}
            >
              Explode BOM
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={loadRollup}
            >
              Cost rollup
            </Button>
          </div>

          {explode ? (
            <div className="mb-4 overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5">Leaf component</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {explode.lines.map((line) => (
                    <tr key={line.componentItemId}>
                      <td className="px-4 py-2.5">
                        {line.componentItem?.description ??
                          line.componentItemId}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatQty(line.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {rollup ? (
            <div className="space-y-2">
              <p className="text-sm">
                Material cost {formatMoney(rollup.materialCost)} · Unit FG cost{" "}
                {formatMoney(rollup.unitFinishedCost)}
                {rollup.yieldPercent !== 100
                  ? ` (yield ${rollup.yieldPercent}%)`
                  : ""}
              </p>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5">Component</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit cost</th>
                      <th className="px-4 py-2.5 text-right">Extended</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rollup.lines.map((line) => (
                      <tr key={line.componentItemId}>
                        <td className="px-4 py-2.5">
                          {line.componentItem?.description ??
                            line.componentItemId}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatQty(line.quantity)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatMoney(line.unitCost)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatMoney(line.extendedCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </PageFormSection>
      </PageFormCard>
    </div>
  );
}
