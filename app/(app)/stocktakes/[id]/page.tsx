"use client";
import { RecordActivity } from "@/components/shared/record-metadata";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { PageLoading } from "@/components/shared/page-loading";
import {
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { errorMessage, formatDate, formatQty } from "@/lib/format";
import type { Stocktake } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default function StocktakeDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "stocktake.write");

  const {
    data: session,
    loading,
    error,
    reload,
  } = useFetch(
    () =>
      id
        ? api<Stocktake>(`/stocktakes/${id}`)
        : Promise.reject(new Error("Invalid id")),
    [id],
  );

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.lines) return;
    const next: Record<string, string> = {};
    for (const line of session.lines) {
      next[line.itemId] =
        line.countedQty != null ? String(line.countedQty) : "";
    }
    setCounts(next);
  }, [session]);

  const open = session?.status === "IN_PROGRESS" || session?.status === "DRAFT";

  async function saveCounts() {
    if (!session) return;
    const lines = (session.lines ?? [])
      .map((line) => {
        const raw = counts[line.itemId]?.trim();
        if (raw === "" || raw == null) return null;
        const countedQty = parseFloat(raw);
        if (Number.isNaN(countedQty) || countedQty < 0) return null;
        return { itemId: line.itemId, countedQty };
      })
      .filter(Boolean) as { itemId: string; countedQty: number }[];

    if (lines.length === 0) {
      toast.error("Enter at least one counted quantity");
      return;
    }
    setSaving(true);
    try {
      await api(`/stocktakes/${session.id}/counts`, {
        method: "POST",
        body: { lines },
      });
      toast.success("Counts saved");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function complete() {
    if (!session) return;
    if (
      !confirm("Apply variances as stock adjustments and close this stocktake?")
    ) {
      return;
    }
    setSaving(true);
    try {
      await api(`/stocktakes/${session.id}/complete`, { method: "POST" });
      toast.success("Stocktake completed");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (!session) return;
    if (!confirm("Cancel this stocktake?")) return;
    setSaving(true);
    try {
      await api(`/stocktakes/${session.id}/cancel`, { method: "POST" });
      toast.success("Stocktake cancelled");
      router.push("/stocktakes");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title={
        loading ? "Stocktake" : `Stocktake — ${session?.location?.name ?? ""}`
      }
      variant="form"
      breadcrumbs={[
        { label: "Operations", href: "/dashboard" },
        { label: "Stocktakes", href: "/stocktakes" },
        { label: id ? id.slice(0, 8) : "…" },
      ]}
    >
      <PermissionGate permission="stocktake.read" showDenied>
        {loading ? (
          <PageLoading />
        ) : error || !session ? (
          <p className="text-sm text-muted-foreground">Stocktake not found.</p>
        ) : (
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/stocktakes">← Back</Link>
              </Button>
              <Badge variant="outline">{session.status}</Badge>
              <div className="ml-auto flex flex-wrap gap-2">
                {canWrite && open ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={saveCounts}
                    >
                      Save counts
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={complete}
                    >
                      Complete &amp; adjust
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={saving}
                      onClick={cancel}
                    >
                      Cancel
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <RecordActivity record={session} />
            <PageFormCard>
              <PageFormSection title="Session">
                <FormGrid>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">
                      {session.location?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {session.createdAt ? formatDate(session.createdAt) : "—"}
                    </p>
                  </div>
                  {session.notes ? (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm">{session.notes}</p>
                    </div>
                  ) : null}
                </FormGrid>
              </PageFormSection>

              <PageFormSection
                title="Count lines"
                description="Enter physical counts. Completing posts variances as COUNT adjustments."
              >
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2.5">Item</th>
                        <th className="px-4 py-2.5 text-right">System</th>
                        <th className="px-4 py-2.5 text-right">Counted</th>
                        <th className="px-4 py-2.5 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(session.lines ?? []).map((line) => {
                        const system = parseFloat(line.systemQty);
                        const countedRaw = counts[line.itemId] ?? "";
                        const counted = parseFloat(countedRaw);
                        const variance =
                          countedRaw !== "" && !Number.isNaN(counted)
                            ? counted - system
                            : null;
                        return (
                          <tr key={line.id}>
                            <td className="px-4 py-2.5">
                              {line.item?.description ?? line.itemId}
                              {line.item?.sku ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {line.item.sku}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {formatQty(line.systemQty)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {open && canWrite ? (
                                <Input
                                  className="ml-auto h-8 w-24 text-right"
                                  inputMode="decimal"
                                  value={countedRaw}
                                  onChange={(e) =>
                                    setCounts((prev) => ({
                                      ...prev,
                                      [line.itemId]: e.target.value,
                                    }))
                                  }
                                />
                              ) : (
                                <span className="tabular-nums">
                                  {line.countedQty != null
                                    ? formatQty(line.countedQty)
                                    : "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {variance == null
                                ? "—"
                                : variance === 0
                                  ? "0"
                                  : variance > 0
                                    ? `+${formatQty(variance)}`
                                    : formatQty(variance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </PageFormSection>
            </PageFormCard>
          </div>
        )}
      </PermissionGate>
    </AppShell>
  );
}
