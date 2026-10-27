"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";

export function ListSearchField({
  id = "list-search",
  label = "Search",
  value,
  onChange,
  placeholder = "Search…",
  className,
  disabled,
  /** Inline toolbar style — no label, fits one row with filters. */
  compact = true,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const input = (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9 w-full min-w-[160px] pl-9 sm:w-[220px]"
      />
    </div>
  );

  if (compact) {
    return <div className={cn("min-w-0", className)}>{input}</div>;
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      {input}
    </div>
  );
}
