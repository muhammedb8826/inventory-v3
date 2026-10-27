"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, paginationLabel } from "@/lib/pagination";
import type { PaginatedMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

export interface TablePaginationProps {
  meta: PaginatedMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  className?: string;
  disabled?: boolean;
}

export function TablePagination({
  meta,
  onPageChange,
  onLimitChange,
  className,
  disabled = false,
}: TablePaginationProps) {
  const { page, limit, total, totalPages } = meta;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-[var(--frappe-border)] bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">{paginationLabel(meta)}</p>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="rows-per-page"
            className="text-sm font-normal text-muted-foreground"
          >
            Rows
          </Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger
              id="rows-per-page"
              size="sm"
              className="h-8 w-[72px] rounded-lg"
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
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => onPageChange(1)}
            disabled={disabled || !canPrev || total === 0}
            aria-label="First page"
          >
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || !canPrev || total === 0}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-[4.5rem] px-1 text-center text-sm tabular-nums text-foreground">
            {total === 0 ? "0 / 0" : `${page} / ${totalPages}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || !canNext || total === 0}
            aria-label="Next page"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || !canNext || total === 0}
            aria-label="Last page"
          >
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
