"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { api, isForbiddenError } from "@/lib/api";
import { buildListPath } from "@/lib/list-query";
import { errorMessage, formatQty } from "@/lib/format";
import { getAppModule } from "@/lib/modules";
import type { PaginatedResponse, StockMovementType } from "@/lib/types";
import { toast } from "sonner";

type MoveRow = {
  type?: StockMovementType | string;
  quantity?: string;
  createdAt?: string;
};

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Receipts",
  SALE: "Deliveries",
  TRANSFER_IN: "Transfer in",
  TRANSFER_OUT: "Transfer out",
  ADJUSTMENT: "Adjustments / scrap",
  PRODUCTION_ISSUE: "Manufacturing issue",
  PRODUCTION_RECEIPT: "Manufacturing receipt",
  SALE_RETURN: "Sales returns",
  PURCHASE_REVERSAL: "Purchase returns",
  STOCKTAKE: "Physical inventory",
  OPENING: "Opening",
};

export default function MovesAnalysisPage() {
  const mod = getAppModule("inventory")!;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MoveRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<PaginatedResponse<MoveRow>>(
          buildListPath("/inventory/movements", { page: 1, limit: 200 }),
        );
        if (!cancelled) setRows(res.data ?? []);
      } catch (e) {
        if (!isForbiddenError(e)) toast.error(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const map = new Map<string, { count: number; qty: number }>();
    for (const row of rows) {
      const key = String(row.type ?? "OTHER");
      const prev = map.get(key) ?? { count: 0, qty: 0 };
      prev.count += 1;
      prev.qty += Math.abs(parseFloat(String(row.quantity ?? 0)) || 0);
      map.set(key, prev);
    }
    return [...map.entries()]
      .map(([type, stats]) => ({
        type,
        label: TYPE_LABELS[type] ?? type.replaceAll("_", " "),
        ...stats,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  return (
    <AppShell
      title="Moves analysis"
      subtitle="Recent stock moves grouped by type — a simple Odoo-style analysis view."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Reporting", href: "/apps/inventory/reporting" },
        { label: "Moves analysis" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/inventory?tab=movements">Open moves history</Link>
        </Button>
      }
    >
      {loading ? (
        <PageLoading />
      ) : summary.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recent movements to analyse.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Move type</th>
                <th className="px-4 py-3 font-medium">Documents</th>
                <th className="px-4 py-3 font-medium">Quantity moved</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.type} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 tabular-nums">{row.count}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatQty(row.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
