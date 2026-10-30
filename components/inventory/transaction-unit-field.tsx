"use client";
import { AreaCalculator } from "./area-calculator";
import type { AreaDimensions } from "@/lib/types";
import { useEffect, useMemo, useRef } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import type { ItemUnitOptions } from "@/lib/types";
import { FormField } from "@/components/shared/page-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatQty } from "@/lib/format";

export function TransactionUnitField({
  itemId,
  value,
  quantity,
  kind,
  onChange,
  savedFactor,
  dimensions,
  onAreaChange,
  frozenSnapshot,
  onResolved,
}: {
  itemId: string;
  value?: string;
  quantity: string;
  kind?: "purchase" | "sales";
  savedFactor?: number;
  dimensions?: AreaDimensions;
  onAreaChange?: (quantity: string, dimensions: AreaDimensions) => void;
  frozenSnapshot?: import("@/lib/types").UnitSnapshot;
  onResolved?: (
    unitId: string,
    factor: number,
    meta: {
      symbol: string;
      decimalPlaces: number;
      baseDecimalPlaces: number;
      baseSymbol: string;
    },
  ) => void;
  onChange: (
    unitId: string,
    factor: number,
    oldFactor: number,
    meta?: {
      symbol: string;
      decimalPlaces: number;
      baseDecimalPlaces: number;
      baseSymbol: string;
    },
  ) => void;
}) {
  const { data, loading, error } = useFetch<ItemUnitOptions | null>(
    () => (itemId ? api(`/units/items/${itemId}`) : Promise.resolve(null)),
    [itemId],
  );
  const options = useMemo(() => {
    if (!data) return [];
    if (!frozenSnapshot) return data.options;
    const original = data.options.find(
      (o) => o.unit.id === frozenSnapshot.unitId,
    );
    const unit = original?.unit ?? {
      id: frozenSnapshot.unitId,
      code: frozenSnapshot.code,
      name: frozenSnapshot.code,
      symbol: frozenSnapshot.symbol,
      category:
        frozenSnapshot.category ??
        (frozenSnapshot.code === "M2" ? "AREA" : "OTHER"),
      decimalPlaces: frozenSnapshot.decimalPlaces ?? 3,
      isActive: true,
      requiresReview: false,
      uneceCode: null,
    };
    return [
      ...data.options.filter((o) => o.unit.id !== frozenSnapshot.unitId),
      {
        ...original,
        unit: {
          ...unit,
          decimalPlaces: frozenSnapshot.decimalPlaces ?? unit.decimalPlaces,
        },
        factor: frozenSnapshot.factor,
        purchaseDefault: original?.purchaseDefault ?? false,
        salesDefault: original?.salesDefault ?? false,
      },
    ];
  }, [data, frozenSnapshot]);
  const selected = options.find(
    (o) => o.unit.id === (value || data?.baseUnit.id),
  );
  const frozenActive = frozenSnapshot?.unitId === selected?.unit.id;
  const squareMetre = (frozenActive ? options : (data?.options ?? [])).find(
    (o) => o.unit.code === "M2" && o.unit.category === "AREA",
  );
  const resolvedRef = useRef(onResolved);
  useEffect(() => {
    resolvedRef.current = onResolved;
  }, [onResolved]);
  useEffect(() => {
    const option = options.find(
      (o) => o.unit.id === (value || data?.baseUnit.id),
    );
    if (option && data)
      resolvedRef.current?.(option.unit.id, Number(option.factor), {
        symbol: option.unit.symbol,
        decimalPlaces: option.unit.decimalPlaces,
        baseDecimalPlaces: data.baseUnit.decimalPlaces,
        baseSymbol: data.baseUnit.symbol,
      });
  }, [options, value, data]);
  const entered = Number(quantity),
    stock = entered * Number(selected?.factor ?? 1);
  const fits = (value: number, places: number) =>
    Number.isFinite(value) &&
    Math.abs(value - Number(value.toFixed(places))) < 1e-8;
  const sourcePrecisionError =
    entered > 0 && selected && !fits(entered, selected.unit.decimalPlaces);
  const precisionError =
    entered > 0 &&
    selected &&
    data &&
    (!fits(entered, selected.unit.decimalPlaces) ||
      !fits(stock, data.baseUnit.decimalPlaces));
  useEffect(() => {
    if (!data || value !== undefined) return;
    const preferred =
      kind &&
      options.find((o) =>
        kind === "purchase" ? o.purchaseDefault : o.salesDefault,
      );
    const option =
      preferred || options.find((o) => o.unit.id === data.baseUnit.id);
    if (option) onChange(option.unit.id, Number(option.factor), 1);
  }, [data, options, value, kind, onChange]);
  return (
    <div className="form-line-field min-w-0">
      <FormField label="Unit" className="form-line-field">
        <Select
          value={selected?.unit.id ?? ""}
          disabled={!itemId || loading || !data}
          onValueChange={(id) => {
            const next = options.find((o) => o.unit.id === id);
            if (next)
              onChange(id, Number(next.factor), Number(selected?.factor ?? 1));
          }}
        >
          <SelectTrigger aria-label="Transaction unit">
            <SelectValue
              placeholder={loading ? "Loading units..." : "Stock unit"}
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.unit.id} value={o.unit.id}>
                {o.unit.name} ({o.unit.symbol})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {error
            ? "Could not load unit options. Reload before changing units."
            : selected && data
              ? `${formatQty(Number(quantity || 0) * Number(selected.factor))} ${data.baseUnit.symbol} in stock units`
              : "Choose an item first"}
        </span>
      </FormField>
      {frozenActive && (
        <p className="text-xs text-muted-foreground">
          Using the saved inquiry conversion for this unit.
        </p>
      )}
      {precisionError && data && (
        <p role="alert" className="text-xs text-destructive">
          {sourcePrecisionError && selected
            ? selected.unit.decimalPlaces === 0
              ? `Enter a whole number of ${selected.unit.symbol}, or choose another unit.`
              : `Entered quantity supports ${selected.unit.decimalPlaces} decimal places in ${selected.unit.symbol}.`
            : `This quantity cannot be posted in ${data.baseUnit.symbol}. ${data.baseUnit.decimalPlaces === 0 ? "The stock quantity must be a whole number." : `Stock supports ${data.baseUnit.decimalPlaces} decimal places.`} Review the quantity and selected unit.`}
        </p>
      )}
      {selected &&
        !frozenActive &&
        savedFactor !== undefined &&
        Math.abs(savedFactor - Number(selected.factor)) > 1e-10 && (
          <p
            role="status"
            className="text-xs text-amber-700 dark:text-amber-400"
          >
            Saved factor: {savedFactor}. Current factor: {selected.factor}.
            Editing this line applies the current factor.
          </p>
        )}
      {selected?.unit.category === "AREA" && squareMetre && onAreaChange && (
        <AreaCalculator
          value={dimensions}
          onApply={onAreaChange}
          areaFactor={
            Number(
              (frozenActive ? frozenSnapshot?.squareMetreFactor : undefined) ??
                squareMetre.factor,
            ) / Number(selected.factor)
          }
          symbol={selected.unit.symbol}
        />
      )}
    </div>
  );
}
