"use client";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/page-form";
import type { AreaDimensions } from "@/lib/types";
export function AreaCalculator({
  value,
  onApply,
  areaFactor = 1,
  symbol = "m2",
}: {
  value?: AreaDimensions;
  areaFactor?: number;
  symbol?: string;
  onApply: (quantity: string, dimensions: AreaDimensions) => void;
}) {
  const [open, setOpen] = useState(false),
    [width, setWidth] = useState(String(value?.widthMetres ?? "")),
    [length, setLength] = useState(String(value?.lengthMetres ?? "")),
    [count, setCount] = useState(String(value?.count ?? 1));
  const area = Number(
    (Number(width) * Number(length) * Number(count)).toFixed(9),
  );
  const converted = Number((area * areaFactor).toPrecision(15));
  const valid =
    Number(width) > 0 &&
    Number(length) > 0 &&
    Number.isInteger(Number(count)) &&
    Number(count) > 0 &&
    Number.isFinite(area) &&
    Number.isFinite(converted) &&
    areaFactor > 0 &&
    area > 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto whitespace-normal px-0 text-xs text-primary"
        >
          Calculate width x length
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3"
        align="start"
      >
        <p className="text-sm font-semibold">Calculate fabric area</p>
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
        <p className="text-sm">
          Area: {valid ? area : "-"} m<sup>2</sup>
          {symbol !== "m2" && valid && (
            <span>
              {" "}
              = {converted} {symbol}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          The converted area must fit the stock unit precision. This records
          dimensions; it does not manage cutting layouts.
        </p>
        <Button
          type="button"
          disabled={!valid}
          onClick={() => {
            onApply(String(converted), {
              widthMetres: Number(width),
              lengthMetres: Number(length),
              count: Number(count),
            });
            setOpen(false);
          }}
        >
          Use calculated area
        </Button>
      </PopoverContent>
    </Popover>
  );
}
