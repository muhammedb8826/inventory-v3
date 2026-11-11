"use client";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/page-form";
import type { AreaDimensions } from "@/lib/types";

/** How many selected LENGTH units equal one metre. */
export function lengthUnitsPerMetre(code: string): number | null {
  if (code === "M") return 1;
  if (code === "CM") return 100;
  if (code === "MM") return 1000;
  return null;
}

export function AreaCalculator({
  value,
  onApply,
  areaFactor = 1,
  symbol = "m2",
  mode = "AREA",
  defaultWidthMetres,
  lengthCode = "M",
}: {
  value?: AreaDimensions;
  areaFactor?: number;
  symbol?: string;
  /** AREA: quantity is m² (converted). LENGTH: quantity is length in stock unit. */
  mode?: "AREA" | "LENGTH";
  defaultWidthMetres?: number | null;
  /** Selected LENGTH unit code (M / CM / MM). */
  lengthCode?: string;
  onApply: (quantity: string, dimensions: AreaDimensions) => void;
}) {
  const [open, setOpen] = useState(false),
    [width, setWidth] = useState(
      String(value?.widthMetres ?? defaultWidthMetres ?? ""),
    ),
    [length, setLength] = useState(String(value?.lengthMetres ?? "")),
    [count, setCount] = useState(String(value?.count ?? 1));
  useEffect(() => {
    if (!open) return;
    setWidth(String(value?.widthMetres ?? defaultWidthMetres ?? ""));
    setLength(String(value?.lengthMetres ?? ""));
    setCount(String(value?.count ?? 1));
  }, [open, value, defaultWidthMetres]);

  const lengthPerMetre =
    mode === "LENGTH" ? lengthUnitsPerMetre(lengthCode) : 1;
  const area = Number(
    (Number(width) * Number(length) * Number(count)).toFixed(9),
  );
  const totalLength = Number(
    (Number(length) * Number(count) * (lengthPerMetre ?? 0)).toPrecision(15),
  );
  const convertedArea = Number((area * areaFactor).toPrecision(15));
  const quantity = mode === "LENGTH" ? totalLength : convertedArea;
  const widthOk =
    Number(width) >= 0.001 &&
    Math.abs(Number(width) - Number(Number(width).toFixed(3))) < 1e-9;
  const valid =
    widthOk &&
    Number(length) >= 0.001 &&
    Math.abs(Number(length) - Number(Number(length).toFixed(3))) < 1e-9 &&
    Number.isInteger(Number(count)) &&
    Number(count) > 0 &&
    Number.isFinite(area) &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    (mode === "AREA" ? areaFactor > 0 : lengthPerMetre != null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto whitespace-normal px-0 text-xs text-primary"
        >
          Calculate width × length
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3"
        align="start"
      >
        <p className="text-sm font-semibold">Calculate from dimensions</p>
        <FormField label="Width (m)">
          <Input
            type="number"
            min="0.001"
            step="0.001"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
        </FormField>
        <FormField label="Length (m)">
          <Input
            type="number"
            min="0.001"
            step="0.001"
            value={length}
            onChange={(e) => setLength(e.target.value)}
          />
        </FormField>
        <FormField label="Number of pieces">
          <Input
            type="number"
            min="1"
            step="1"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </FormField>
        {mode === "LENGTH" ? (
          <p className="text-sm">
            Length: {valid ? totalLength : "-"} {symbol}
            <span className="block text-muted-foreground">
              Coverage: {valid ? area : "-"} m<sup>2</sup>
            </span>
          </p>
        ) : (
          <p className="text-sm">
            Area: {valid ? area : "-"} m<sup>2</sup>
            {symbol !== "m2" && valid && (
              <span>
                {" "}
                = {convertedArea} {symbol}
              </span>
            )}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {mode === "LENGTH"
            ? "Stock moves by length. Width is a product characteristic used for coverage (m²)."
            : "Quantity must fit the stock unit precision. Dimensions are stored on the line; this does not plan nesting or remnants."}
        </p>
        {mode === "LENGTH" && lengthPerMetre == null && (
          <p role="alert" className="text-xs text-destructive">
            Dimension entry requires a standard length unit (M, CM or MM).
          </p>
        )}
        <Button
          type="button"
          disabled={!valid}
          onClick={() => {
            onApply(String(quantity), {
              widthMetres: Number(width),
              lengthMetres: Number(length),
              count: Number(count),
            });
            setOpen(false);
          }}
        >
          {mode === "LENGTH" ? "Use calculated length" : "Use calculated area"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
