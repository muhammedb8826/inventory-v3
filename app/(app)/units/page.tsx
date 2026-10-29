"use client";
import { useState } from "react";
import { PlusIcon, PencilIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageLoading } from "@/components/shared/page-loading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { UnitOfMeasure } from "@/lib/types";
import { toast } from "sonner";
const categories = [
  "COUNT",
  "LENGTH",
  "AREA",
  "VOLUME",
  "MASS",
  "TIME",
  "OTHER",
] as const;
export default function UnitsPage() {
  const { user, loading: authLoading } = useAuth();
  const canManage = hasPermission(user, "inventory.write");
  const { data, loading, error, reload } = useFetch<UnitOfMeasure[]>(
    () => api("/units"),
    [canManage],
    { enabled: canManage },
  );
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UnitOfMeasure | null | undefined>(
    undefined,
  );
  if (authLoading)
    return (
      <AppShell title="Units of measure">
        <PageLoading />
      </AppShell>
    );
  if (!canManage)
    return (
      <AppShell title="Units of measure">
        <AccessDenied />
      </AppShell>
    );
  const rows = (data ?? []).filter((u) =>
    `${u.name} ${u.code} ${u.symbol} ${u.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <AppShell
      title="Units of measure"
      subtitle="Control stock units, quantity precision and legacy definitions."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {data?.filter((u) => u.requiresReview).length ?? 0} units need review.
          Unit definitions are protected once used. All quantities stay in each
          item stock unit.
        </p>
        <Button onClick={() => setEditing(null)}>
          <PlusIcon className="size-4" />
          Add unit
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-destructive">
          {error}{" "}
          <button className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </p>
      )}
      <Input
        aria-label="Search units"
        placeholder="Search units..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-md"
      />
      <DataCardTable<UnitOfMeasure>
        rows={rows}
        loading={loading}
        storageKey="units"
        onBulkComplete={() => void reload()}
        bulkActions={[
          {
            id: "activate",
            label: "Activate selected",
            description:
              "Make the selected units available for new items. Legacy units still require review.",
            eligible: (u) => !u.isActive,
            run: (u) =>
              api(`/units/${u.id}`, {
                method: "PATCH",
                body: { isActive: true },
              }),
          },
          {
            id: "deactivate",
            label: "Deactivate selected",
            description:
              "Hide selected units from new item selection. Existing stock records retain their units.",
            eligible: (u) => u.isActive,
            run: (u) =>
              api(`/units/${u.id}`, {
                method: "PATCH",
                body: { isActive: false },
              }),
          },
        ]}
        columns={[
          {
            key: "name",
            header: "Unit",
            cell: (u) => (
              <div>
                <span className="font-medium">{u.name}</span>
                <span className="ml-2 text-muted-foreground">{u.symbol}</span>
              </div>
            ),
          },
          { key: "code", header: "Code", cell: (u) => u.code },
          {
            key: "category",
            header: "Category",
            cell: (u) => u.category.toLowerCase(),
          },
          {
            key: "decimalPlaces",
            header: "Quantity precision",
            cell: (u) =>
              u.decimalPlaces === 0
                ? "Whole numbers"
                : `${u.decimalPlaces} decimal places`,
          },
          {
            key: "isActive",
            header: "Status",
            cell: (u) => (
              <Badge
                variant={
                  u.requiresReview
                    ? "outline"
                    : u.isActive
                      ? "secondary"
                      : "outline"
                }
              >
                {u.requiresReview
                  ? "Needs review"
                  : u.isActive
                    ? "Active"
                    : "Inactive"}
              </Badge>
            ),
          },
          {
            key: "uneceCode",
            header: "UNECE code",
            cell: (u) => u.uneceCode ?? "\u2014",
            defaultVisible: false,
          },
          {
            key: "actions",
            header: "Actions",
            cell: (u) => (
              <RowActionsMenu
                label={u.name}
                actions={[
                  {
                    label: u.requiresReview ? "Review unit" : "Edit unit",
                    icon: PencilIcon,
                    onSelect: () => setEditing(u),
                  },
                ]}
              />
            ),
          },
        ]}
      />
      {editing !== undefined && (
        <UnitDialog
          key={editing?.id ?? "new"}
          unit={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void reload();
          }}
        />
      )}
    </AppShell>
  );
}
function UnitDialog({
  unit,
  onClose,
  onSaved,
}: {
  unit: UnitOfMeasure | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(unit?.code ?? "");
  const [name, setName] = useState(unit?.name ?? "");
  const [symbol, setSymbol] = useState(unit?.symbol ?? "");
  const [category, setCategory] = useState(unit?.category ?? "COUNT");
  const [precision, setPrecision] = useState(unit?.decimalPlaces ?? 0);
  const [unece, setUnece] = useState(unit?.uneceCode ?? "");
  const [active, setActive] = useState(unit?.isActive ?? true);
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(unit ? `/units/${unit.id}` : "/units", {
        method: unit ? "PATCH" : "POST",
        body: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          symbol: symbol.trim(),
          category,
          decimalPlaces: precision,
          uneceCode: unece.trim().toUpperCase() || null,
          isActive: active,
          ...(unit?.requiresReview ? { confirmLegacyReview: review } : {}),
        },
      });
      toast.success(unit ? "Unit updated" : "Unit created");
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {unit?.requiresReview
              ? "Review legacy unit"
              : unit
                ? "Edit unit"
                : "Add unit"}
          </DialogTitle>
          <DialogDescription>
            Decimals are limited to the inventory ledger three-place
            precision. Boxes and rolls need item-specific conversions; they are
            not universal units.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="u-code">Code</Label>
              <Input
                id="u-code"
                required
                maxLength={40}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-name">Name</Label>
              <Input
                id="u-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-symbol">Symbol</Label>
              <Input
                id="u-symbol"
                required
                maxLength={40}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-cat">Category</Label>
              <select
                id="u-cat"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as UnitOfMeasure["category"])
                }
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-precision">Quantity precision</Label>
              <select
                id="u-precision"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={precision}
                onChange={(e) => setPrecision(Number(e.target.value))}
              >
                {[0, 1, 2, 3].map((p) => (
                  <option key={p} value={p}>
                    {p === 0 ? "Whole numbers only" : `${p} decimal places`}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-unece">UNECE code (optional)</Label>
              <Input
                id="u-unece"
                maxLength={3}
                value={unece}
                onChange={(e) => setUnece(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Available for new items
          </label>
          {unit?.requiresReview && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={review}
                onChange={(e) => setReview(e.target.checked)}
              />
              I verified the meaning of this legacy unit and reviewed existing
              quantities. Confirm its category and precision without converting
              stock.
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
