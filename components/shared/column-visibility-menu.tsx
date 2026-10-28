"use client";

import { Columns3Icon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ColumnVisibilityMenu({
  columns,
  isVisible,
  locked,
  onToggle,
  onReset,
}: {
  columns: { key: string; header: string; hideable?: boolean }[];
  isVisible: (key: string) => boolean;
  locked: Set<string>;
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const tunable = columns.filter((c) => c.hideable !== false);

  if (tunable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Choose table columns"
          className="h-9 gap-2 rounded-xl border-border/80 bg-background px-3 text-sm font-medium shadow-none hover:bg-muted/60"
        >
          <Columns3Icon className="size-4 opacity-70" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 max-h-[min(70vh,520px)] overflow-y-auto rounded-xl p-1.5"
      >
        <DropdownMenuLabel className="px-2.5 py-2 text-xs text-muted-foreground">
          Customize columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tunable.map((col) => (
          <DropdownMenuCheckboxItem
            className="min-h-9 rounded-lg px-2.5"
            key={col.key}
            checked={isVisible(col.key)}
            disabled={locked.has(col.key)}
            onCheckedChange={() => onToggle(col.key)}
            onSelect={(e) => e.preventDefault()}
          >
            {col.header || col.key}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset} className="gap-2">
          <RotateCcwIcon className="size-3.5" />
          Reset columns
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
