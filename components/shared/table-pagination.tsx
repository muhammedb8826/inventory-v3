"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import type { PaginatedMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export interface TablePaginationProps {
  meta: PaginatedMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  className?: string;
  disabled?: boolean;
}

function resultsLabel(meta: PaginatedMeta) {
  const { page, limit, total } = meta;
  if (total <= 0) return "Results: 0";
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return `Results: ${from} – ${to} of ${total}`;
}

export function TablePagination({
  meta,
  onPageChange,
  onLimitChange,
  className,
  disabled = false,
}: TablePaginationProps) {
  const rowsId = useId();
  const { page, limit, total, totalPages } = meta;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <p className="text-sm text-[var(--frappe-text-muted)]">
          {resultsLabel(meta)}
        </p>
        <div className="flex items-center gap-2">
          <Label
            htmlFor={rowsId}
            className="whitespace-nowrap text-sm font-normal text-[var(--frappe-text-muted)]"
          >
            Rows
          </Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger
              id={rowsId}
              className="app-control h-9 w-[4.5rem] px-2.5 shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 shadow-none"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !canPrev || total === 0}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="min-w-[4.75rem] px-2 text-center text-sm tabular-nums text-[var(--frappe-text)]">
          {total === 0 ? "0 / 0" : `${page} / ${totalPages}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 shadow-none"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !canNext || total === 0}
          aria-label="Next page"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
