"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { PermissionGate } from "@/components/permission-gate";
import { formatDate, formatQty } from "@/lib/format";
import type { Bom } from "@/lib/types";
import Link from "next/link";

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

export function BomDetail({ bom }: { bom: Bom }) {
  const lines = bom.lines ?? [];

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
        <PermissionGate permission="bom.write">
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
            <DetailField label="Version" value={bom.version ?? "—"} />
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
                    <th className="px-4 py-2.5">SKU</th>
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
                        {line.componentItem?.sku ?? "—"}
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
      </PageFormCard>
    </div>
  );
}
