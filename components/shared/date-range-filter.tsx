"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  className,
  disabled,
  compact = true,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputClass = cn(
    "h-9 rounded-xl border-border/80 bg-background shadow-none",
    compact ? "w-[138px]" : "w-full"
  );

  return (
    <div
      className={cn(
        compact
          ? "flex flex-wrap items-center gap-2"
          : "grid grid-cols-2 gap-3",
        className
      )}
    >
      <div className={cn(!compact && "grid gap-1.5")}>
        {!compact ? (
          <Label htmlFor="date-from" className="text-sm text-muted-foreground">
            From
          </Label>
        ) : null}
        <Input
          id="date-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          disabled={disabled}
          aria-label="From date"
          className={inputClass}
        />
      </div>
      <div className={cn(!compact && "grid gap-1.5")}>
        {!compact ? (
          <Label htmlFor="date-to" className="text-sm text-muted-foreground">
            To
          </Label>
        ) : null}
        <Input
          id="date-to"
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          disabled={disabled}
          aria-label="To date"
          className={inputClass}
        />
      </div>
    </div>
  );
}
