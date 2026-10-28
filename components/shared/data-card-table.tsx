"use client";

import { useMemo, useState, isValidElement, type ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  DownloadIcon,
  ListFilterIcon,
  XIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ColumnVisibilityMenu } from "@/components/shared/column-visibility-menu";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { unwrapList } from "@/lib/list-response";
import type { PaginatedResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { withRecordMetadata } from "@/components/shared/record-metadata";
import { recordBulkActions } from "@/lib/bulk-actions";
import { csvDocument, downloadText } from "@/lib/table-export";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  mobilePriority?: number;
  hideable?: boolean;
  defaultVisible?: boolean;
  priority?: number;
  sortValue?: (row: T) => string | number | null | undefined;
  exportValue?: (row: T) => string | number | null | undefined;
}
export interface BulkAction<T> {
  id: string;
  label: string;
  description: string;
  destructive?: boolean;
  eligible?: (row: T) => boolean;
  run: (row: T) => Promise<unknown>;
}
function textContent(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node))
    return textContent(node.props.children);
  return "";
}

export function DataCardTable<T extends { id: string }>({
  columns: inputColumns,
  rows,
  emptyTitle = "No records",
  emptyDescription,
  pagination,
  storageKey,
  filters,
  toolbar,
  loading,
  className,
  bulkActions: customBulkActions,
  onBulkComplete,
}: {
  columns: Column<T>[];
  rows: T[] | PaginatedResponse<T> | null | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: Omit<TablePaginationProps, "disabled"> & { disabled?: boolean };
  storageKey?: string;
  filters?: ReactNode;
  toolbar?: ReactNode;
  loading?: boolean;
  className?: string;
  bulkActions?: BulkAction<T>[];
  onBulkComplete?: () => void;
}) {
  const { user } = useAuth();
  const bulkActions =
    customBulkActions ?? recordBulkActions<T>(storageKey, user);
  const list = unwrapList(rows);
  const columns = useMemo(
    () =>
      withRecordMetadata(inputColumns, storageKey)
        .map((column, index) => ({ column, index }))
        .sort((a, b) => {
          const rank = (entry: typeof a) =>
            entry.column.key === "actions"
              ? 10000
              : (entry.column.priority ??
                ([
                  "item",
                  "name",
                  "fullName",
                  "title",
                  "description",
                  "reference",
                ].includes(entry.column.key)
                  ? 10
                  : entry.column.key === "status"
                    ? 30
                    : 100 + entry.index));
          return rank(a) - rank(b);
        })
        .map((entry) => entry.column),
    [inputColumns, storageKey],
  );
  const mobilePrimary = [...columns]
    .filter((column) => column.key !== "actions")
    .sort((a, b) => (a.mobilePriority ?? 50) - (b.mobilePriority ?? 50))[0];

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null);
  const [compact, setCompact] = useState(false);
  const [pending, setPending] = useState<BulkAction<T> | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [failures, setFailures] = useState<{ id: string; message: string }[]>(
    [],
  );
  const meta = useMemo(
    () =>
      columns.map((c) => ({
        key: c.key,
        hideable: c.hideable,
        defaultVisible: c.defaultVisible,
      })),
    [columns],
  );
  const visibility = useColumnVisibility(storageKey ?? "__none__", meta);
  const visible = storageKey
    ? columns.filter((c) => visibility.isVisible(c.key))
    : columns;
  const rowActionColumn = columns.find((column) => column.key === "actions");
  const mobileFields = [...visible]
    .filter((column) => column !== mobilePrimary && column.key !== "actions")
    .sort((a, b) => (a.mobilePriority ?? 50) - (b.mobilePriority ?? 50));
  const selected = list.filter((row) => selection.has(row.id));
  const all = list.length > 0 && selected.length === list.length;
  const data = [...list];
  const sortedColumn = columns.find((c) => c.key === sort?.key);
  if (sort && sortedColumn) {
    const value = (row: T) => {
      const record = row as Record<string, unknown>;
      let raw = sortedColumn.sortValue?.(row) ?? record[sortedColumn.key];
      if (raw == null && ["date", "created", "when"].includes(sortedColumn.key))
        raw = record.expenseDate ?? record.createdAt;
      if (typeof raw === "number") return raw;
      if (typeof raw === "string") {
        if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
        if (/^\d{4}-\d{2}-\d{2}/.test(raw) && Number.isFinite(Date.parse(raw)))
          return Date.parse(raw);
        return raw;
      }
      return textContent(sortedColumn.cell(row));
    };
    data.sort((a, b) => {
      const av = value(a),
        bv = value(b);
      return (
        (typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, {
              numeric: true,
            })) * (sort.desc ? -1 : 1)
      );
    });
  }
  function toggle(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectPage() {
    setSelection(all ? new Set() : new Set(list.map((row) => row.id)));
  }
  function exportSelected() {
    const cols = visible.filter((c) => c.key !== "actions" && c.header);
    downloadText(
      csvDocument([
        cols.map((c) => c.header),
        ...selected.map((row) =>
          cols.map((c) => c.exportValue?.(row) ?? textContent(c.cell(row))),
        ),
      ]),
      `${(storageKey ?? "records").replace(/[^a-z0-9-]/gi, "-")}-selected.csv`,
    );
  }
  async function execute() {
    if (!pending || busy) return;
    const targets = selected.filter((row) => pending.eligible?.(row) !== false);
    setBusy(true);
    setFailures([]);
    const failed: { id: string; message: string }[] = [];
    const succeeded = new Set<string>();
    for (let i = 0; i < targets.length; i++) {
      setProgress(`${i + 1} of ${targets.length}`);
      try {
        await pending.run(targets[i]);
        succeeded.add(targets[i].id);
      } catch (error) {
        failed.push({
          id: targets[i].id,
          message: error instanceof Error ? error.message : "Action failed",
        });
      }
    }
    setSelection(
      (prev) => new Set([...prev].filter((id) => !succeeded.has(id))),
    );
    setFailures(failed);
    setBusy(false);
    setPending(null);
    setProgress("");
    toast[failed.length ? "warning" : "success"](
      `${succeeded.size} completed${failed.length ? `, ${failed.length} failed` : ""}`,
    );
    if (onBulkComplete) onBulkComplete();
    else window.dispatchEvent(new Event("inventory:records-changed"));
  }
  return (
    <section
      className={cn("modern-data-table app-surface overflow-hidden", className)}
      aria-busy={loading || busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-4 sm:px-5">
        <div className="flex min-w-0 w-full flex-1 flex-wrap items-center gap-2 sm:w-auto">
          {filters}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={compact}
            onClick={() => setCompact(!compact)}
          >
            <ListFilterIcon className="size-4" />
            {compact ? "Compact" : "Comfortable"}
          </Button>
          {storageKey && (
            <ColumnVisibilityMenu
              columns={columns}
              isVisible={visibility.isVisible}
              locked={visibility.locked}
              onToggle={visibility.toggle}
              onReset={visibility.reset}
            />
          )}
        </div>
      </div>
      {selected.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary/5 px-5 py-3"
          role="region"
          aria-label="Bulk actions"
        >
          <span className="mr-2 text-sm font-semibold tabular-nums">
            {selected.length} selected on this page
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={exportSelected}
            disabled={busy || loading}
          >
            <DownloadIcon className="size-4" />
            Export selected
          </Button>
          {bulkActions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant={action.destructive ? "destructive" : "outline"}
              onClick={() => setPending(action)}
              disabled={
                busy ||
                loading ||
                !selected.some((row) => action.eligible?.(row) !== false)
              }
            >
              {action.label}
            </Button>
          ))}
          <Button
            className="ml-auto"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setSelection(new Set())}
          >
            <XIcon className="size-4" />
            Clear
          </Button>
        </div>
      )}
      {failures.length > 0 && (
        <div
          role="alert"
          className="border-b bg-destructive/5 px-5 py-3 text-sm"
        >
          <p className="font-semibold">Some records could not be updated</p>
          <ul className="mt-2 max-h-36 list-inside list-disc overflow-auto">
            {failures.map((f) => (
              <li key={f.id}>
                {f.id}: {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {loading ? (
        <div role="status" aria-label="Loading records" className="p-4 sm:p-5">
          <span className="sr-only">Loading records</span>
          <div className="space-y-3 motion-safe:animate-pulse">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="flex min-h-16 items-center gap-4 rounded-xl bg-muted/35 px-3"
              >
                <div className="size-4 rounded bg-muted" />
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="ml-auto h-4 w-1/5 rounded bg-muted" />
                <div className="hidden h-4 w-1/6 rounded bg-muted sm:block" />
              </div>
            ))}
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="p-12">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <>
          <div className="border-b px-4 py-3 sm:hidden">
            <label className="flex min-h-8 items-center gap-3 text-xs font-medium text-muted-foreground">
              <Checkbox
                aria-label="Select all rows on this page"
                checked={all ? true : selected.length ? "indeterminate" : false}
                onCheckedChange={selectPage}
                disabled={busy}
              />
              Select page{" "}
              <span className="ml-auto tabular-nums">
                {data.length} records
              </span>
            </label>
          </div>
          <div className="space-y-3 bg-muted/25 p-3 sm:hidden">
            {data.map((row) => (
              <article
                key={row.id}
                className={cn(
                  "rounded-xl border bg-card p-4 shadow-xs transition-colors",
                  selection.has(row.id) && "border-primary/40 bg-primary/3",
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    aria-label={`Select record ${row.id}`}
                    className="mt-1.5"
                    checked={selection.has(row.id)}
                    onCheckedChange={() => toggle(row.id)}
                    disabled={busy}
                  />
                  <div className="min-w-0 flex-1">
                    {mobilePrimary?.cell(row)}
                  </div>
                  {rowActionColumn && (
                    <div className="-mr-1 -mt-1 shrink-0">
                      {rowActionColumn.cell(row)}
                    </div>
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-3">
                  {mobileFields.slice(0, 4).map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="mb-1 text-[11px] font-medium text-muted-foreground">
                        {col.header}
                      </dt>
                      <dd className="break-words text-sm">{col.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
                {mobileFields.length > 4 && (
                  <details className="mt-3 border-t pt-3">
                    <summary className="cursor-pointer text-xs font-medium text-primary">
                      More details
                    </summary>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      {mobileFields.slice(4).map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="mb-1 text-[11px] text-muted-foreground">
                            {col.header}
                          </dt>
                          <dd className="break-words text-xs">
                            {col.cell(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <Table
              className="min-w-[680px]"
              aria-label={storageKey ?? "Records"}
            >
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 pl-5">
                    <Checkbox
                      aria-label="Select all rows on this page"
                      checked={
                        all ? true : selected.length ? "indeterminate" : false
                      }
                      onCheckedChange={selectPage}
                      disabled={busy}
                    />
                  </TableHead>
                  {visible.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-12 whitespace-nowrap bg-muted/40 text-xs font-semibold",
                        col.key === "actions" &&
                          "sticky right-0 z-20 w-14 min-w-14 bg-card shadow-[-8px_0_12px_-12px_var(--foreground)]",
                        col.className,
                      )}
                      aria-sort={
                        sort?.key === col.key
                          ? sort.desc
                            ? "descending"
                            : "ascending"
                          : "none"
                      }
                    >
                      {col.header && col.key !== "actions" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-md py-2 text-inherit hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                          onClick={() =>
                            setSort((prev) =>
                              prev?.key === col.key
                                ? prev.desc
                                  ? null
                                  : { key: col.key, desc: true }
                                : { key: col.key, desc: false },
                            )
                          }
                        >
                          {col.header}
                          {sort?.key === col.key ? (
                            sort.desc ? (
                              <ArrowDownIcon className="size-3.5" />
                            ) : (
                              <ArrowUpIcon className="size-3.5" />
                            )
                          ) : (
                            <ArrowUpDownIcon className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        <span className="sr-only">
                          {col.key === "actions" ? "Actions" : col.key}
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={selection.has(row.id) ? "selected" : undefined}
                    className="transition-colors hover:bg-muted/40 data-[state=selected]:bg-primary/5"
                  >
                    <TableCell className="pl-5">
                      <Checkbox
                        aria-label={`Select record ${row.id}`}
                        checked={selection.has(row.id)}
                        onCheckedChange={() => toggle(row.id)}
                        disabled={busy}
                      />
                    </TableCell>
                    {visible.map((col, i) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "text-[13px]",
                          compact ? "py-2" : "py-4",
                          i === 0 && "font-medium",
                          col.key === "actions" &&
                            "sticky right-0 bg-card text-right shadow-[-8px_0_12px_-12px_var(--foreground)]",
                          col.className,
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
          <div className="border-t px-5 py-2 text-xs text-muted-foreground">
            Sorting and selection apply to the current page.
          </div>
        </>
      )}
      {pagination && pagination.meta.total > 0 && (
        <TablePagination
          {...pagination}
          disabled={pagination.disabled || loading || busy}
          onPageChange={(page) => {
            setSelection(new Set());
            setFailures([]);
            pagination.onPageChange(page);
          }}
          onLimitChange={(limit) => {
            setSelection(new Set());
            pagination.onLimitChange(limit);
          }}
        />
      )}
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.description} This affects{" "}
              {
                selected.filter((row) => pending?.eligible?.(row) !== false)
                  .length
              }{" "}
              eligible selected records. Each record is processed separately;
              failures are reported.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              variant={pending?.destructive ? "destructive" : "default"}
              disabled={busy || loading}
              onClick={execute}
            >
              {busy && <LoaderCircleIcon className="size-4 animate-spin" />}
              {busy ? progress : "Confirm action"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
