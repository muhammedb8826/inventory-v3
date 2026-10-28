"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ColumnVisibilityMenu } from "@/components/shared/column-visibility-menu";
import { PageLoading } from "@/components/shared/page-loading";
import {
  TablePagination,
  type TablePaginationProps,
} from "@/components/shared/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { unwrapList } from "@/lib/list-response";
import type { PaginatedResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Prefer showing on mobile cards. Default: first 3 visible. */
  mobilePriority?: number;
  /** When false, cannot be hidden. Default true. */
  hideable?: boolean;
  /** When false, starts hidden until user enables. Default true. */
  defaultVisible?: boolean;
}

function isRightAligned(className?: string) {
  return Boolean(className?.includes("text-right"));
}

export function DataCardTable<T extends { id: string }>({
  columns,
  rows,
  emptyTitle = "No records",
  emptyDescription,
  pagination,
  storageKey,
  filters,
  toolbar,
  loading,
  className,
}: {
  columns: Column<T>[];
  rows: T[] | PaginatedResponse<T> | null | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: Omit<TablePaginationProps, "disabled"> & { disabled?: boolean };
  storageKey?: string;
  filters?: React.ReactNode;
  toolbar?: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
  const list = unwrapList(rows);
  const showPagination = pagination && pagination.meta.total > 0;

  const meta = useMemo(
    () =>
      columns.map((c) => ({
        key: c.key,
        hideable: c.hideable,
        defaultVisible: c.defaultVisible,
      })),
    [columns]
  );

  const visibility = useColumnVisibility(storageKey ?? "__none__", meta);
  const visibleColumns = storageKey
    ? columns.filter((c) => visibility.isVisible(c.key))
    : columns;

  const mobileColumns = useMemo(() => {
    const ranked = [...visibleColumns].sort(
      (a, b) => (a.mobilePriority ?? 50) - (b.mobilePriority ?? 50)
    );
    return ranked.slice(0, Math.min(4, ranked.length));
  }, [visibleColumns]);

  const columnMenu =
    storageKey && columns.some((c) => c.hideable !== false) ? (
      <ColumnVisibilityMenu
        columns={columns}
        isVisible={visibility.isVisible}
        locked={visibility.locked}
        onToggle={visibility.toggle}
        onReset={visibility.reset}
      />
    ) : null;

  const hasToolbar = Boolean(filters || toolbar || columnMenu);

  return (
    <div
      className={cn(
        "app-surface overflow-hidden",
        className
      )}
    >
      {hasToolbar ? (
        <div className="flex flex-col gap-3 border-b border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {filters}
          </div>
          {(toolbar || columnMenu) && (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {toolbar}
              {columnMenu}
            </div>
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="p-10">
          <PageLoading />
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 sm:p-10">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <>
          <div className="space-y-2.5 p-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-4"
              >
                <dl className="space-y-2.5">
                  {mobileColumns.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-start justify-between gap-3"
                    >
                      <dt className="shrink-0 text-xs font-medium text-muted-foreground">
                        {col.header || col.key}
                      </dt>
                      <dd className="min-w-0 text-right text-sm text-foreground">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  {visibleColumns.map((col, index) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-11 border-b border-border/60 bg-muted/40 px-4 text-[13px] font-medium text-muted-foreground",
                        index === 0 && "pl-5",
                        index === visibleColumns.length - 1 && "pr-5",
                        isRightAligned(col.className) && "text-right",
                        col.className
                      )}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/25"
                  >
                    {visibleColumns.map((col, index) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "border-0 px-4 py-4 text-[13px] text-foreground",
                          index === 0 && "pl-5",
                          index === visibleColumns.length - 1 && "pr-5",
                          isRightAligned(col.className) && "text-right",
                          col.className
                        )}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {showPagination ? (
            <TablePagination
              meta={pagination.meta}
              onPageChange={pagination.onPageChange}
              onLimitChange={pagination.onLimitChange}
              disabled={pagination.disabled || loading}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
