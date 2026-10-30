"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import type { ItemUnitOptions, UnitOfMeasure } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnitSelect } from "./unit-select";
import { FormField, PageFormSection } from "@/components/shared/page-form";
import { errorMessage } from "@/lib/format";
import { toast } from "sonner";
interface Row {
  unitId: string;
  factor: string;
  stockQuantity?: string;
  unitQuantity?: string;
  purchaseDefault?: boolean;
  salesDefault?: boolean;
}
export function ItemUnitSettings({
  itemId,
  onSaved,
}: {
  itemId: string;
  onSaved?: () => void;
}) {
  const { data, reload, error } = useFetch<ItemUnitOptions>(
    () => api(`/units/items/${itemId}`),
    [itemId],
  );
  const { data: units } = useFetch<UnitOfMeasure[]>(() => api("/units"), []);
  const [rows, setRows] = useState<Row[]>([]),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setRows(data.conversions);
  }, [data]);
  function patch(index: number, changes: Partial<Row>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...changes } : row)),
    );
  }
  async function save() {
    setSaving(true);
    try {
      if (
        rows.some(
          (r) =>
            !r.unitId ||
            (r.stockQuantity !== undefined || r.unitQuantity !== undefined
              ? !(Number(r.stockQuantity) > 0 && Number(r.unitQuantity) > 0)
              : !Number.isFinite(Number(r.factor)) || Number(r.factor) <= 0),
        )
      )
        throw new Error(
          "Select a unit and enter a positive conversion factor for every row.",
        );
      await api(`/units/items/${itemId}`, {
        method: "PATCH",
        body: {
          conversions: rows.map((r) => ({
            unitId: r.unitId,
            ...(r.stockQuantity !== undefined || r.unitQuantity !== undefined
              ? {
                  stockQuantity: Number(r.stockQuantity),
                  unitQuantity: Number(r.unitQuantity),
                }
              : { factor: Number(r.factor) }),
            ...(r.purchaseDefault === undefined
              ? {}
              : { purchaseDefault: r.purchaseDefault }),
            ...(r.salesDefault === undefined
              ? {}
              : { salesDefault: r.salesDefault }),
          })),
        },
      });
      toast.success("Unit conversions saved");
      reload();
      onSaved?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <PageFormSection
      title="Units and conversions"
      description="Set any item-specific ratio for purchases, sales, BOMs and production. Common measurement conversions are provided automatically; your saved ratio takes priority for this item."
    >
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(error)}
        </p>
      )}
      {data && (
        <p className="text-sm text-muted-foreground">
          Stock is tracked in {data.baseUnit.name} ({data.baseUnit.symbol}).
          Changes apply to future entries; existing document factors stay
          unchanged.
        </p>
      )}
      <div className="space-y-4">
        {rows.map((row, i) => {
          const option = data?.options.find((o) => o.unit.id === row.unitId);
          const unit = units?.find((u) => u.id === row.unitId);
          const fixed = unit?.id === data?.baseUnit.id;
          const ratio =
            row.stockQuantity !== undefined || row.unitQuantity !== undefined;
          const factor = ratio
            ? Number(row.stockQuantity) / Number(row.unitQuantity)
            : Number(row.factor);
          return (
            <div
              key={i}
              className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2"
            >
              <FormField label="Alternative unit">
                <UnitSelect
                  value={row.unitId}
                  units={(units ?? []).filter(
                    (u) =>
                      u.id === row.unitId ||
                      (u.id !== data?.baseUnit.id &&
                        !rows.some((r) => r.unitId === u.id)),
                  )}
                  onChange={(unitId) => {
                    const next = data?.options.find(
                      (o) => o.unit.id === unitId,
                    );
                    const useRatio =
                      data?.baseUnit.category === "COUNT" &&
                      units?.find((u) => u.id === unitId)?.category === "AREA";
                    patch(i, {
                      unitId,
                      factor: next?.factor ?? "1",
                      stockQuantity: useRatio
                        ? (next?.factor ?? "1")
                        : undefined,
                      unitQuantity: useRatio ? "1" : undefined,
                    });
                  }}
                />
              </FormField>
              {ratio && !fixed ? (
                <>
                  <FormField
                    label={`Stock quantity (${data?.baseUnit.symbol ?? ""})`}
                  >
                    <Input
                      aria-label="Stock reference quantity"
                      type="number"
                      min="0.001"
                      step="any"
                      value={row.stockQuantity ?? ""}
                      onChange={(e) =>
                        patch(i, { stockQuantity: e.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    label={`Equivalent quantity (${unit?.symbol ?? ""})`}
                  >
                    <Input
                      aria-label="Alternative reference quantity"
                      type="number"
                      min="0.001"
                      step="any"
                      value={row.unitQuantity ?? ""}
                      onChange={(e) =>
                        patch(i, { unitQuantity: e.target.value })
                      }
                    />
                  </FormField>
                  <p className="text-sm font-medium sm:col-span-2">
                    {row.stockQuantity || "?"} {data?.baseUnit.symbol} ={" "}
                    {row.unitQuantity || "?"} {unit?.symbol}. This ratio applies
                    to this item only.
                  </p>
                </>
              ) : (
                <FormField
                  label={`Stock units per ${unit?.symbol ?? "unit"}`}
                  hint={`1 ${unit?.symbol ?? "unit"} = ${fixed && option ? option.factor : row.factor || "?"} ${data?.baseUnit.symbol ?? "stock units"}`}
                >
                  <Input
                    aria-label="Conversion factor"
                    type="number"
                    min="0.0000000001"
                    step="any"
                    value={fixed && option ? option.factor : row.factor}
                    readOnly={!!fixed}
                    onChange={(e) => patch(i, { factor: e.target.value })}
                  />
                </FormField>
              )}
              {!fixed &&
                !(
                  data?.baseUnit.category === "COUNT" &&
                  unit?.category === "AREA"
                ) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-start"
                    onClick={() =>
                      patch(
                        i,
                        ratio
                          ? {
                              stockQuantity: undefined,
                              unitQuantity: undefined,
                              factor: String(
                                Number.isFinite(factor) && factor > 0
                                  ? factor
                                  : 1,
                              ),
                            }
                          : { stockQuantity: row.factor, unitQuantity: "1" },
                      )
                    }
                  >
                    {ratio ? "Use a factor instead" : "Use a quantity ratio"}
                  </Button>
                )}
              {unit && data && (
                <ConversionPreview
                  key={row.unitId}
                  unit={unit}
                  base={data.baseUnit}
                  factor={fixed && option ? Number(option.factor) : factor}
                />
              )}
              {data?.baseUnit.category === "COUNT" &&
                unit?.category === "AREA" && (
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Use this ratio only when every piece has the same area.
                    Partial areas that produce fractional stock pieces cannot be
                    posted.
                  </p>
                )}
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.purchaseDefault === true}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, j) => ({
                        ...r,
                        purchaseDefault: j === i ? e.target.checked : false,
                      })),
                    )
                  }
                />
                Default purchase unit
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.salesDefault === true}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, j) => ({
                        ...r,
                        salesDefault: j === i ? e.target.checked : false,
                      })),
                    )
                  }
                />
                Default sales unit
              </label>
              <Button
                type="button"
                variant="ghost"
                className="justify-self-start text-destructive"
                onClick={() =>
                  setRows((prev) => prev.filter((_, j) => j !== i))
                }
              >
                Remove unit
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Create custom units in the Units catalog first. A custom ratio replaces
        the standard conversion only for this item. Removing it restores the
        standard ratio.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setRows((prev) => [...prev, { unitId: "", factor: "1" }])
          }
        >
          Add alternative unit
        </Button>
        <Button type="button" disabled={saving || !data} onClick={save}>
          {saving ? "Saving..." : "Save unit settings"}
        </Button>
      </div>
    </PageFormSection>
  );
}

function ConversionPreview({
  unit,
  base,
  factor,
}: {
  unit: UnitOfMeasure;
  base: UnitOfMeasure;
  factor: number;
}) {
  const [quantity, setQuantity] = useState("1"),
    [price, setPrice] = useState("");
  const source = Number(quantity),
    stock = source * factor,
    rate = Number(price) / factor;
  const fits = (value: number, places: number) =>
    Number.isFinite(value) &&
    Math.abs(value - Number(value.toFixed(places))) < 1e-8;
  const valid =
    source > 0 &&
    factor > 0 &&
    fits(source, unit.decimalPlaces) &&
    fits(stock, base.decimalPlaces);
  const format = (value: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(
      value,
    );
  return (
    <details className="rounded-lg border bg-background p-3 sm:col-span-2">
      <summary className="cursor-pointer text-sm font-medium">
        Preview quantity and cost
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormField label={`Quantity (${unit.symbol})`}>
          <Input
            aria-label="Preview quantity"
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </FormField>
        <FormField label={`Price per ${unit.symbol}`}>
          <Input
            aria-label="Preview unit price"
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </FormField>
        <p className="text-sm sm:col-span-2">
          {valid
            ? `${format(source)} ${unit.symbol} = ${format(stock)} ${base.symbol}`
            : "This quantity does not fit the selected unit precision. Choose a quantity that produces a valid stock quantity."}
        </p>
        {valid && price !== "" && Number(price) >= 0 && (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Stock unit cost: {format(rate)} per {base.symbol}. Total:{" "}
            {format(source * Number(price))}.
          </p>
        )}
      </div>
    </details>
  );
}
