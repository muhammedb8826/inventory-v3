import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { ArrowUpRightIcon } from "lucide-react";
import type { Column } from "@/components/shared/data-card-table";
export interface RecordMetadata {
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: { fullName?: string; email?: string } | null;
  updatedBy?: { fullName?: string; email?: string } | null;
}
export function timestampText(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value ||
    !Number.isFinite(Date.parse(value))
  )
    return "\u2014";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function RecordTimestamp({ value }: { value: unknown }) {
  const label = timestampText(value);
  return label === "\u2014" ? (
    <span className="text-muted-foreground">{"\u2014"}</span>
  ) : (
    <time
      dateTime={String(value)}
      title={String(value)}
      className="whitespace-nowrap text-xs text-muted-foreground tabular-nums"
    >
      {label}
    </time>
  );
}
const resourceKeys =
  /^(inventory-(all|low)|master-|sales-list|purchases-list|users-list|roles-list|banks-accounts|expenses-list|boms-list|production-orders-list|stock-transfers-list|stocktakes-list|inquiries-list|notifications-list)/;
export function withRecordMetadata<T extends { id: string }>(
  input: Column<T>[],
  storageKey?: string,
): Column<T>[] {
  const orders: Record<string, string[]> = {
    "sales-list": [
      "id",
      "customer",
      "total",
      "status",
      "payment",
      "location",
      "date",
      "soldBy",
      "commission",
    ],
    "purchases-list": [
      "id",
      "supplier",
      "total",
      "status",
      "payment",
      "location",
      "date",
    ],
    "production-orders-list": [
      "id",
      "finished",
      "qty",
      "status",
      "location",
      "bom",
      "date",
    ],
    "stock-transfers-list": ["id", "status", "from", "to", "date"],
    "stocktakes-list": ["location", "status", "created", "by"],
    "boms-list": ["name", "finished", "status", "version", "date"],
    "users-list": ["name", "role", "status", "email"],
    "roles-list": ["name", "desc", "perms"],
    "banks-accounts": [
      "name",
      "balance",
      "status",
      "type",
      "bank",
      "holder",
      "number",
    ],
    "inquiries-list": [
      "contact",
      "subject",
      "status",
      "priority",
      "assignment",
      "items",
      "assigned",
      "source",
      "createdAt",
    ],
    "expenses-list": ["desc", "amount", "category", "date"],
    "notifications-list": ["title", "status", "type", "module", "when"],
  };
  const order = storageKey?.startsWith("master-")
    ? ["name", "status", "type", "parent", "phone", "email", "address"]
    : orders[storageKey ?? ""];
  const cols = input.map((column) => ({
    ...column,
    priority:
      column.priority ??
      (order?.includes(column.key)
        ? 10 + order.indexOf(column.key) * 10
        : undefined),
  }));
  if (!storageKey || !resourceKeys.test(storageKey)) return cols;
  const routes: Record<string, string> = {
    "sales-list": "/sales",
    "purchases-list": "/purchases",
    "boms-list": "/boms",
    "production-orders-list": "/production-orders",
    "stock-transfers-list": "/stock-transfers",
  };
  if (routes[storageKey] && !cols.some((c) => c.key === "actions"))
    cols.push({
      key: "actions",
      header: "Actions",
      hideable: false,
      priority: 10000,
      className: "w-14 text-right",
      cell: (row) => (
        <RowActionsMenu
          label={`record ${row.id.slice(0, 8)}`}
          actions={[
            {
              label: "Open record",
              icon: ArrowUpRightIcon,
              href: `${routes[storageKey]}/${row.id}`,
            },
          ]}
        />
      ),
    });
  const record = (row: T) => row as T & RecordMetadata;
  for (const field of ["createdAt", "updatedAt"] as const)
    if (
      !(field === "updatedAt" && storageKey === "notifications-list") &&
      !cols.some((c) => c.key === field)
    )
      cols.push({
        key: field,
        header: field === "createdAt" ? "Created at" : "Updated at",
        defaultVisible: false,
        priority: field === "createdAt" ? 800 : 810,
        cell: (row) => <RecordTimestamp value={record(row)[field]} />,
        sortValue: (row) => record(row)[field] ?? "",
        exportValue: (row) => record(row)[field] ?? "",
      });
  if (
    /^(sales-list|purchases-list|production-orders-list|stock-transfers-list|stocktakes-list|inquiries-list)$/.test(
      storageKey,
    )
  ) {
    if (!cols.some((c) => c.key === "notes"))
      cols.push({
        key: "notes",
        header: "Notes",
        defaultVisible: false,
        priority: 750,
        cell: (row) => (
          <span
            className="block max-w-xs truncate"
            title={String((row as unknown as { notes?: string }).notes ?? "")}
          >
            {(row as unknown as { notes?: string }).notes || "\u2014"}
          </span>
        ),
      });
  }
  if (
    /^(sales-list|purchases-list|production-orders-list|stock-transfers-list)$/.test(
      storageKey,
    ) &&
    !cols.some((c) => c.key === "lineCount")
  )
    cols.push({
      key: "lineCount",
      header: "Line items",
      defaultVisible: false,
      priority: 740,
      cell: (row) =>
        (row as unknown as { lines?: unknown[] }).lines?.length ?? "\u2014",
      sortValue: (row) =>
        (row as unknown as { lines?: unknown[] }).lines?.length ?? 0,
    });
  if (
    /^(sales-list|purchases-list|production-orders-list|stock-transfers-list|stocktakes-list|expenses-list)$/.test(
      storageKey,
    ) &&
    !cols.some((c) => c.key === "createdBy")
  )
    cols.push({
      key: "createdBy",
      header: "Created by",
      defaultVisible: false,
      priority: 820,
      cell: (row) => record(row).createdBy?.fullName ?? "\u2014",
      sortValue: (row) => record(row).createdBy?.fullName ?? "",
    });
  if (!cols.some((c) => c.key === "recordId"))
    cols.push({
      key: "recordId",
      header: "Record ID",
      defaultVisible: false,
      priority: 900,
      cell: (row) => (
        <span
          title={row.id}
          className="font-mono text-xs text-muted-foreground"
        >
          {row.id}
        </span>
      ),
    });
  return cols;
}
