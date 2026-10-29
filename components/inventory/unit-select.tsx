"use client";
import { useId, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UnitOfMeasure } from "@/lib/types";
export function UnitSelect({
  units,
  value,
  onChange,
  disabled = false,
}: {
  units: UnitOfMeasure[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const id = useId();
  const selected = units.find((unit) => unit.id === value);
  const filtered = units.filter(
    (unit) =>
      ((unit.isActive && !unit.requiresReview) || unit.id === value) &&
      `${unit.name} ${unit.symbol} ${unit.code} ${unit.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Stock unit"
          aria-expanded={open}
          aria-controls={id}
          disabled={disabled}
          className="h-10 w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected
              ? `${selected.name} (${selected.symbol})`
              : "Select a stock unit"}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(24rem,calc(100vw-2rem))] p-2"
      >
        <Input
          autoFocus
          aria-label="Search units"
          placeholder="Search name, symbol or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              document
                .getElementById(id)
                ?.querySelector<HTMLButtonElement>("button")
                ?.focus();
            }
          }}
        />
        <div
          id={id}
          role="listbox"
          aria-label="Stock units"
          className="mt-2 max-h-64 overflow-y-auto"
        >
          {filtered.map((unit) => (
            <button
              type="button"
              role="option"
              aria-selected={unit.id === value}
              key={unit.id}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const next =
                    e.key === "ArrowDown"
                      ? e.currentTarget.nextElementSibling
                      : e.currentTarget.previousElementSibling;
                  (next as HTMLElement | null)?.focus();
                }
              }}
              onClick={() => {
                onChange(unit.id);
                setOpen(false);
                setSearch("");
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
            >
              <span className="flex-1">
                <span className="block text-sm font-medium">
                  {unit.name}{" "}
                  <span className="text-muted-foreground">({unit.symbol})</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {unit.category.toLowerCase()}
                  {" \u00b7 "}
                  {unit.decimalPlaces === 0
                    ? "whole numbers"
                    : `up to ${unit.decimalPlaces} decimals`}
                  {unit.requiresReview ? " \u00b7 review required" : ""}
                </span>
              </span>
              {unit.id === value && (
                <CheckIcon className="size-4 text-primary" />
              )}
            </button>
          ))}
          {!filtered.length && (
            <p className="p-3 text-sm text-muted-foreground">
              No matching active units. Ask an inventory manager to add one.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
