"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { api, isForbiddenError } from "@/lib/api";
import { buildListPath } from "@/lib/list-query";
import { errorMessage, formatQty } from "@/lib/format";
import { getAppModule } from "@/lib/modules";
import type { PaginatedResponse } from "@/lib/types";
import { toast } from "sonner";

type MoveRow = {
  id: string;
  type?: string;
  quantity?: string;
  createdAt?: string;
  item?: { description?: string; sku?: string | null };
  location?: { name?: string };
};

const RETURN_TYPES = new Set([
  "SALE_RETURN",
  "PURCHASE_REVERSAL",
  "PURCHASE_VOID",
  "SALE_VOID",
  "SALE_REVERSAL",
]);

export default function InventoryReturnsPage() {
  const mod = getAppModule("inventory")!;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MoveRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<PaginatedResponse<MoveRow>>(
          buildListPath("/inventory/movements", { page: 1, limit: 100 }),
        );
        if (!cancelled) {
          setRows(
            (res.data ?? []).filter((row) =>
              RETURN_TYPES.has(String(row.type ?? "")),
            ),
          );
        }
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

  return (
    <AppShell
      title="Returns"
      subtitle="Stock that came back from customers or was reversed from suppliers."
      breadcrumbs={[
        { label: "Apps", href: "/apps" },
        { label: "Inventory", href: "/apps/inventory" },
        { label: "Reporting", href: "/apps/inventory/reporting" },
        { label: "Returns" },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href="/inventory?tab=movements">All moves</Link>
        </Button>
      }
    >
      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No return movements found in the recent history.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.item?.description ?? "—"}
                    {row.item?.sku ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {row.item.sku}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {String(row.type ?? "").replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3">{row.location?.name ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatQty(row.quantity ?? 0)}
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
