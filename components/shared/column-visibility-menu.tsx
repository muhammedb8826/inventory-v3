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
          className="h-9 gap-1.5 rounded-lg"
        >
          <Columns3Icon className="size-3.5" />
          <span className="hidden sm:inline">Customize Columns</span>
          <span className="sm:hidden">Columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tunable.map((col) => (
          <DropdownMenuCheckboxItem
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
