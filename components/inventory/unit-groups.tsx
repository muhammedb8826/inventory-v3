"use client";
import { allowedConversion, fixedUnitFactor } from "@/lib/unit-rules";
import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import type { UnitGroup, UnitOfMeasure } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/page-form";
import { UnitSelect } from "./unit-select";
import { errorMessage } from "@/lib/format";
import { toast } from "sonner";
import { DataCardTable } from "@/components/shared/data-card-table";
import { Badge } from "@/components/ui/badge";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { PencilIcon, Trash2Icon } from "lucide-react";
interface ConversionRow {
  unitId: string;
  factor: string;
  stockQuantity?: string;
  unitQuantity?: string;
  purchaseDefault: boolean;
  salesDefault: boolean;
}
function conversionPayload(c: {
  unitId: string;
  factor: string;
  stockQuantity?: string;
  unitQuantity?: string;
  purchaseDefault?: boolean;
  salesDefault?: boolean;
}) {
  const factor = Number(c.factor),
    inverse = 1 / factor;
  const ratio =
    Math.abs(inverse - Math.round(inverse)) < 1e-9 &&
    inverse > 1 &&
    inverse <= 1e9;
  return {
    unitId: c.unitId,
    purchaseDefault: c.purchaseDefault,
    salesDefault: c.salesDefault,
    ...(c.stockQuantity && c.unitQuantity
      ? {
          stockQuantity: Number(c.stockQuantity),
          unitQuantity: Number(c.unitQuantity),
        }
      : ratio
        ? { stockQuantity: 1, unitQuantity: Math.round(inverse) }
        : { factor }),
  };
}
export function UnitGroups({
  units,
  onCreateUnit,
}: {
  units: UnitOfMeasure[];
  onCreateUnit: () => void;
}) {
  const { data, error, loading, reload } = useFetch<UnitGroup[]>(() =>
    api("/units/groups"),
  );
  const [editing, setEditing] = useState<UnitGroup | null | undefined>();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"CATEGORY" | "PACKAGING">(
    "CATEGORY",
  );
  const members = (g: UnitGroup) =>
    [g.baseUnitId, ...g.conversions.map((c) => c.unitId)]
      .map((id) => units.find((u) => u.id === id))
      .filter((u): u is UnitOfMeasure => !!u);
  async function setActive(g: UnitGroup, isActive: boolean) {
    return api(`/units/groups/${g.id}`, {
      method: "PATCH",
      body: {
        name: g.name,
        kind: g.kind ?? "CATEGORY",
        category: g.category,
        baseUnitId: g.baseUnitId,
        isActive,
        conversions: g.conversions.map(conversionPayload),
      },
    });
  }
  return (
    <section className="space-y-4" aria-label="Unit categories">
      <div className="flex flex-wrap gap-2" aria-label="Configuration types">
        <Button
          type="button"
          variant={kindFilter === "CATEGORY" ? "default" : "outline"}
          onClick={() => setKindFilter("CATEGORY")}
        >
          Measurement categories
        </Button>
        <Button
          type="button"
          variant={kindFilter === "PACKAGING" ? "default" : "outline"}
          onClick={() => setKindFilter("PACKAGING")}
        >
          Packaging profiles
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {kindFilter === "CATEGORY"
          ? "Keep mass, length, area and other measurements separate. Standard conversions are fixed."
          : "Define package sizes once, such as 1 roll = 50 m, and assign the profile to matching items. Physical measurement categories cannot be mixed."}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          aria-label="Search categories"
          placeholder="Search categories or units..."
          className="w-full sm:max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" onClick={() => setEditing(null)}>
          {kindFilter === "CATEGORY" ? "New category" : "New packaging profile"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(error)}{" "}
          <button type="button" className="underline" onClick={reload}>
            Retry
          </button>
        </p>
      )}
      <DataCardTable<UnitGroup>
        loading={loading}
        storageKey="unit-categories"
        rows={(data ?? [])
          .filter((g) => (g.kind ?? "CATEGORY") === kindFilter)
          .filter((g) =>
            `${g.name} ${members(g)
              .map((u) => `${u.name} ${u.code} ${u.symbol}`)
              .join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )}
        emptyTitle={
          kindFilter === "PACKAGING"
            ? "No packaging profiles"
            : "No unit categories"
        }
        emptyDescription="Create a category, choose its reference unit, and add conversion lines."
        onBulkComplete={reload}
        bulkActions={[
          {
            id: "activate",
            label: "Activate selected",
            description: "Allow these categories on new items.",
            eligible: (g) => !g.isActive,
            run: (g) => setActive(g, true),
          },
          {
            id: "deactivate",
            label: "Deactivate selected",
            description:
              "Hide these categories from new assignments. Existing items retain their setup.",
            eligible: (g) => g.isActive,
            run: (g) => setActive(g, false),
          },
        ]}
        columns={[
          {
            key: "name",
            header:
              kindFilter === "PACKAGING" ? "Packaging profile" : "Category",
            hideable: false,
            cell: (g) => (
              <button
                type="button"
                className="min-h-11 break-words text-left font-medium text-primary hover:underline [overflow-wrap:anywhere]"
                onClick={() => setEditing(g)}
              >
                {g.name}
              </button>
            ),
          },
          {
            key: "units",
            header: "Units of measure",
            cell: (g) => (
              <div className="flex flex-wrap gap-1.5">
                {members(g).map((u) => (
                  <Badge
                    key={u.id}
                    variant={u.id === g.baseUnitId ? "default" : "secondary"}
                    title={
                      u.id === g.baseUnitId
                        ? `${u.name} - reference unit`
                        : u.name
                    }
                  >
                    {u.symbol}
                  </Badge>
                ))}
              </div>
            ),
          },
          {
            key: "isActive",
            header: "Status",
            cell: (g) => (
              <Badge
                variant={
                  g.requiresReview
                    ? "destructive"
                    : g.isActive
                      ? "secondary"
                      : "outline"
                }
              >
                {g.requiresReview
                  ? "Review required"
                  : g.isActive
                    ? "Active"
                    : "Inactive"}
              </Badge>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            cell: (g) => (
              <RowActionsMenu
                label={g.name}
                actions={[
                  {
                    label: "Category details",
                    icon: PencilIcon,
                    onSelect: () => setEditing(g),
                  },
                ]}
              />
            ),
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        The highlighted unit is the reference unit. Select a category on an item
        to reuse all its conversions.
      </p>
      {editing !== undefined && (
        <GroupEditor
          group={editing}
          initialKind={kindFilter}
          units={units}
          onCreateUnit={onCreateUnit}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            reload();
            setEditing(undefined);
          }}
        />
      )}
    </section>
  );
}
function GroupEditor({
  group,
  initialKind,
  units,
  onClose,
  onSaved,
  onCreateUnit,
}: {
  group: UnitGroup | null;
  initialKind: "CATEGORY" | "PACKAGING";
  units: UnitOfMeasure[];
  onClose: () => void;
  onSaved: () => void;
  onCreateUnit: () => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [kind, setKind] = useState<"CATEGORY" | "PACKAGING">(
    group?.kind ?? initialKind,
  );
  const [category, setCategory] = useState<UnitOfMeasure["category"]>(
    group?.category ?? "MASS",
  );
  const [baseId, setBaseId] = useState(group?.baseUnitId ?? "");
  const [rows, setRows] = useState<ConversionRow[]>(
    (group?.conversions ?? []).map((c) => ({
      unitId: c.unitId,
      factor: c.factor,
      stockQuantity: c.stockQuantity,
      unitQuantity: c.unitQuantity,
      purchaseDefault: c.purchaseDefault ?? false,
      salesDefault: c.salesDefault ?? false,
    })),
  );
  const [active, setActive] = useState(group?.isActive ?? true),
    [saving, setSaving] = useState(false);
  const base = units.find((u) => u.id === baseId);
  const reference: Record<string, number> = {
    KG: 1,
    G: 0.001,
    MG: 0.000001,
    M: 1,
    CM: 0.01,
    MM: 0.001,
    M2: 1,
    CM2: 0.0001,
    L: 1,
    ML: 0.001,
    M3: 1000,
    H: 1,
    MIN: 1 / 60,
    PCS: 1,
    DOZEN: 12,
  };
  function suggested(id: string) {
    const unit = units.find((u) => u.id === id);
    return unit && base
      ? String(fixedUnitFactor(unit, base, rows, units) ?? 1)
      : "1";
  }
  async function save() {
    setSaving(true);
    try {
      if (
        !name.trim() ||
        !baseId ||
        rows.some((r) => !r.unitId || !(Number(r.factor) > 0))
      )
        throw new Error(
          "Enter a name, base unit and positive conversion for each unit.",
        );
      if (
        !base ||
        base.category !== category ||
        rows.some((r) => {
          const u = units.find((u) => u.id === r.unitId);
          return !u || !allowedConversion(base, u, kind);
        })
      )
        throw new Error(
          "The base unit must match the measurement category. Use only matching units, or count units in an explicit packaging profile.",
        );
      await api(group ? `/units/groups/${group.id}` : "/units/groups", {
        method: group ? "PATCH" : "POST",
        body: {
          name,
          kind,
          category,
          baseUnitId: baseId,
          isActive: active,
          conversions: rows.map(conversionPayload),
        },
      });
      toast.success(
        kind === "PACKAGING" ? "Packaging profile saved" : "Category saved",
      );
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  function changeBase(id: string) {
    if (id === baseId) return;
    const next = units.find((u) => u.id === id),
      old = base;
    const ratio =
      rows.find((r) => r.unitId === id)?.factor ??
      (next &&
      old &&
      next.category === old.category &&
      reference[next.code] &&
      reference[old.code]
        ? String(reference[next.code] / reference[old.code])
        : undefined);
    setBaseId(id);

    if (old && ratio)
      setRows((prev) => [
        ...prev
          .filter((r) => r.unitId !== id)
          .map((r) => ({
            ...r,
            factor: String(Number(r.factor) / Number(ratio)),
            stockQuantity: undefined,
            unitQuantity: undefined,
          })),
        {
          unitId: old.id,
          factor: String(1 / Number(ratio)),
          purchaseDefault: false,
          salesDefault: false,
        },
      ]);
    else setRows((prev) => (old ? [] : prev.filter((r) => r.unitId !== id)));
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="flex max-h-[92svh] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {group
              ? group.name
              : kind === "PACKAGING"
                ? "New packaging profile"
                : "New unit category"}
          </DialogTitle>
          <DialogDescription>
            Choose the measurement category first. All measurement units must
            match it. Packaging profiles may additionally contain count-based
            packages.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 min-w-0 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="min-h-0 space-y-6 overflow-y-auto pr-1">
            {group?.requiresReview && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 p-3 text-sm"
              >
                <strong>
                  Review required. Historical stock and transactions are
                  unchanged.
                </strong>
                <ul className="mt-2 list-disc pl-5">
                  {group.reviewIssues?.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Configuration type"
                htmlFor="unit-configuration-type"
              >
                <select
                  id="unit-configuration-type"
                  className="app-control h-11 rounded-md border bg-background px-3"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as typeof kind)}
                >
                  <option value="CATEGORY">Measurement category</option>
                  <option value="PACKAGING">Packaging profile</option>
                </select>
              </FormField>
              <FormField
                label="Measurement category"
                htmlFor="unit-measurement-category"
              >
                <select
                  id="unit-measurement-category"
                  className="app-control h-11 rounded-md border bg-background px-3"
                  value={category}
                  onChange={(e) => {
                    const next = e.target.value as typeof category;
                    setCategory(next);
                    if (base?.category !== next) {
                      setBaseId("");
                      setRows([]);
                    }
                  }}
                >
                  {[
                    "COUNT",
                    "LENGTH",
                    "AREA",
                    "VOLUME",
                    "MASS",
                    "TIME",
                    "OTHER",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0) + c.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label={kind === "PACKAGING" ? "Profile name" : "Category name"}
                required
              >
                <Input
                  aria-label={
                    kind === "PACKAGING" ? "Profile name" : "Category name"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mass or Fabric rolls - 50 m"
                />
              </FormField>
              <FormField
                label="Reference unit"
                required
                hint="Stock and unit costs use this unit. Protected once assigned to items."
              >
                <UnitSelect
                  units={units.filter((u) => u.category === category)}
                  value={baseId}
                  onChange={changeBase}
                />
              </FormField>
            </div>
            <section aria-label="Category units" className="min-w-0 space-y-3">
              <div>
                <h3 className="font-medium">Units of measure</h3>
                <p className="text-sm text-muted-foreground">
                  Ratio means reference units per unit: 1 dozen = 12 pieces.
                </p>
              </div>
              <div className="max-w-full overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Unit</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="w-36 p-3 font-medium">Ratio</th>
                      <th className="p-3 font-medium">Rounding</th>
                      <th className="p-3 font-medium">Active</th>
                      <th className="w-14 p-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {base && (
                      <tr className="border-b bg-primary/5">
                        <td className="p-3 font-medium">
                          {base.name}{" "}
                          <span className="text-muted-foreground">
                            ({base.symbol})
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge>Reference unit</Badge>
                        </td>
                        <td className="p-3 font-medium tabular-nums">1</td>
                        <td className="p-3 tabular-nums">
                          {10 ** -base.decimalPlaces}
                        </td>
                        <td className="p-3">{base.isActive ? "Yes" : "No"}</td>
                        <td />
                      </tr>
                    )}
                    {rows.map((row, i) => {
                      const unit = units.find((u) => u.id === row.unitId);
                      const fixed =
                        unit && base
                          ? fixedUnitFactor(unit, base, rows, units)
                          : undefined;
                      const invalidStandard =
                        fixed !== undefined &&
                        Math.abs(Number(row.factor) - fixed) >
                          Math.abs(fixed) * 1e-12;
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="min-w-48 p-3">
                            <UnitSelect
                              units={units.filter(
                                (u) =>
                                  !!base &&
                                  allowedConversion(base, u, kind) &&
                                  u.id !== baseId &&
                                  (u.id === row.unitId ||
                                    !rows.some((r) => r.unitId === u.id)),
                              )}
                              value={row.unitId}
                              onChange={(id) =>
                                setRows((prev) =>
                                  prev.map((r, j) =>
                                    j === i
                                      ? {
                                          ...r,
                                          unitId: id,
                                          factor: suggested(id),
                                          stockQuantity: undefined,
                                          unitQuantity: undefined,
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {Number(row.factor) > 1
                              ? "Bigger than reference"
                              : Number(row.factor) < 1
                                ? "Smaller than reference"
                                : "Equal to reference"}
                          </td>
                          <td className="p-3">
                            <Input
                              aria-label="Conversion ratio"
                              readOnly={fixed !== undefined}
                              type="number"
                              min="0.0000000001"
                              step="any"
                              value={row.factor}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r, j) =>
                                    j === i
                                      ? {
                                          ...r,
                                          factor: e.target.value,
                                          stockQuantity: undefined,
                                          unitQuantity: undefined,
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />
                            {invalidStandard && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setRows((prev) =>
                                    prev.map((r, j) =>
                                      j === i
                                        ? {
                                            ...r,
                                            factor: String(fixed),
                                            stockQuantity: undefined,
                                            unitQuantity: undefined,
                                          }
                                        : r,
                                    ),
                                  )
                                }
                              >
                                Apply standard ratio
                              </Button>
                            )}
                          </td>
                          <td className="p-3 tabular-nums">
                            {unit ? 10 ** -unit.decimalPlaces : "-"}
                          </td>
                          <td className="p-3">
                            {unit ? (unit.isActive ? "Yes" : "No") : "-"}
                          </td>
                          <td className="p-3">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`Remove ${unit?.name ?? "unit"}`}
                              onClick={() =>
                                setRows((prev) =>
                                  prev.filter((_, j) => j !== i),
                                )
                              }
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-primary"
                  disabled={!baseId}
                  onClick={() =>
                    setRows((prev) => [
                      ...prev,
                      {
                        unitId: "",
                        factor: "1",
                        purchaseDefault: false,
                        salesDefault: false,
                      },
                    ])
                  }
                >
                  Add a line
                </Button>
                <Button type="button" variant="ghost" onClick={onCreateUnit}>
                  Create a unit
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Rounding follows the quantity precision of each unit. Edit unit
                definitions in the unit catalog.
              </p>
            </section>
            {category === "AREA" && (
              <p className="rounded-lg bg-primary/5 p-3 text-sm">
                Width x length calculates square metres and converts to the
                selected area unit. Include M2 when using a different reference
                unit.
              </p>
            )}
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Purchasing and sales defaults
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(["purchaseDefault", "salesDefault"] as const).map((key) => (
                  <FormField
                    key={key}
                    label={
                      key === "purchaseDefault"
                        ? "Default purchase unit"
                        : "Default sales unit"
                    }
                    htmlFor={`category-${key}`}
                  >
                    <select
                      id={`category-${key}`}
                      className="app-control h-11 w-full rounded-md border bg-background px-3"
                      value={rows.find((r) => r[key])?.unitId || "reference"}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) => ({
                            ...r,
                            [key]: r.unitId === e.target.value,
                          })),
                        )
                      }
                    >
                      <option value="reference">
                        Reference unit ({base?.symbol ?? "unit"})
                      </option>
                      {rows
                        .filter((r) => r.unitId)
                        .map((r) => (
                          <option key={r.unitId} value={r.unitId}>
                            {units.find((u) => u.id === r.unitId)?.name}
                          </option>
                        ))}
                    </select>
                  </FormField>
                ))}
              </div>
            </details>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t pt-4">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active category
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button disabled={saving}>
                {saving
                  ? "Saving..."
                  : kind === "PACKAGING"
                    ? "Save profile"
                    : "Save category"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
