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
  /** Persist column visibility under this key (localStorage). */
  storageKey?: string;
  /** Search + filters — rendered on the same row as Customize Columns. */
  filters?: React.ReactNode;
  /** Extra controls on the right (beside Customize Columns). */
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
        "overflow-hidden rounded-2xl border border-[var(--frappe-border)] bg-[var(--frappe-surface)] shadow-[var(--frappe-shadow)]",
        className
      )}
    >
      {hasToolbar ? (
        <div className="flex flex-col gap-3 border-b border-[var(--frappe-border)] px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {filters}
          </div>
          {(toolbar || columnMenu) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {toolbar}
              {columnMenu}
            </div>
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="p-8">
          <PageLoading />
        </div>
      ) : list.length === 0 ? (
        <div className="p-6 sm:p-8">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <>
          <div className="space-y-3 p-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-[var(--frappe-border)] bg-muted/30 p-4"
              >
                <dl className="space-y-2.5">
                  {mobileColumns.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-start justify-between gap-3"
                    >
                      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
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
                <TableRow className="border-b border-[var(--frappe-border)] hover:bg-transparent">
                  {visibleColumns.map((col, index) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-12 bg-muted/50 px-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground",
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
                    className="border-b border-[var(--frappe-border)]/70 transition-colors last:border-0 hover:bg-muted/35"
                  >
                    {visibleColumns.map((col, index) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "px-4 py-3.5 text-sm text-foreground",
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
