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

export function DataCardTable<T extends { id: string }>({
  columns,
  rows,
  emptyTitle = "No records",
  emptyDescription,
  pagination,
  storageKey,
  filters,
  leading,
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
  /** Optional count / totals on the toolbar. */
  leading?: React.ReactNode;
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

  const hasToolbar = Boolean(filters || leading || toolbar || columnMenu);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--frappe-border)] bg-[var(--frappe-surface)] shadow-[var(--frappe-shadow)]",
        className
      )}
    >
      {hasToolbar ? (
        <div className="flex flex-col gap-3 border-b border-[var(--frappe-border)] px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:px-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {leading}
            {filters}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {toolbar}
            {columnMenu}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="p-6">
          <PageLoading />
        </div>
      ) : list.length === 0 ? (
        <div className="p-4 sm:p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="space-y-3 p-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-[var(--frappe-border)] bg-[var(--frappe-section-head)]/40 p-3.5"
              >
                <dl className="space-y-2.5">
                  {mobileColumns.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-start justify-between gap-3"
                    >
                      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {col.header || col.key}
                      </dt>
                      <dd className="min-w-0 text-right text-sm">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>

          {/* Desktop shadcn table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {visibleColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-11 bg-muted/40 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
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
                  <TableRow key={row.id}>
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn("px-3 py-3", col.className)}
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
