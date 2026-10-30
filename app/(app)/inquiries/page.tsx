"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { FrappeButtonPrimary } from "@/components/frappe";
import { InquiryActions } from "@/components/inquiries/inquiry-actions";
import { inquiryReference } from "@/lib/inquiry-workflow";
import { MetricCard } from "@/components/shared/metric-card";
import {
  PlusIcon,
  ClipboardListIcon,
  ClockIcon,
  CheckCircle2Icon,
  ShoppingCartIcon,
} from "lucide-react";
import {
  InquiryAssignmentBadge,
  InquiryPriorityBadge,
  InquirySourceBadge,
  InquiryStatusBadge,
} from "@/components/inquiries/inquiry-status-badge";
import { buildInquiriesListPath } from "@/lib/list-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fetchCustomers } from "@/lib/party-fetch";
import { useFetch } from "@/hooks/use-fetch";
import {
  INQUIRY_ASSIGNMENT_STATUSES,
  INQUIRY_PRIORITIES,
  INQUIRY_STATUSES,
  inquiryItemsSummary,
  inquiryStatusLabel,
} from "@/lib/inquiries";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import type {
  Inquiry,
  InquiryAssignmentStatus,
  InquiryPriority,
  InquirySource,
  InquiryStatus,
  UserAdmin,
} from "@/lib/types";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { AccessDenied } from "@/components/shared/access-denied";

export default function InquiriesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("id");

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [source, setSource] = useState<InquirySource | "">("");
  const [priority, setPriority] = useState<InquiryPriority | "">("");
  const [assignmentStatus, setAssignmentStatus] = useState<
    InquiryAssignmentStatus | ""
  >("");
  const [customerId, setCustomerId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const canRead = hasPermission(user, "inquiries.read");
  const { data: customers } = useFetch(() => fetchCustomers(), [], {
    enabled: canRead && hasPermission(user, "customers.read"),
  });
  const { data: users } = useFetch(
    () => api<UserAdmin[]>("/users/assignees"),
    [],
    { enabled: canRead },
  );
  useEffect(() => {
    if (!deepLinkId) return;
    router.replace(`/inquiries/${encodeURIComponent(deepLinkId)}`);
  }, [deepLinkId, router]);

  const { rows, meta, totals, setPage, setLimit, loading, reload } =
    usePaginatedList<
      Inquiry,
      {
        total: number;
        converted?: number;
        byStatus: Partial<Record<InquiryStatus, number>>;
      }
    >(
      (page, limit) =>
        canRead
          ? buildInquiriesListPath(
              {
                from: from || undefined,
                to: to || undefined,
                search: debouncedSearch || undefined,
                status: status || undefined,
                source: source || undefined,
                priority: priority || undefined,
                assignmentStatus: assignmentStatus || undefined,
                customerId: customerId || undefined,
                assignedToUserId: assignedToUserId || undefined,
              },
              page,
              limit,
            )
          : null,
      [
        canRead,
        from,
        to,
        debouncedSearch,
        status,
        source,
        priority,
        assignmentStatus,
        customerId,
        assignedToUserId,
      ],
    );

  const activeFilterCount = useMemo(
    () =>
      countActiveFilters([
        from,
        to,
        status,
        source,
        priority,
        assignmentStatus,
        customerId,
        assignedToUserId,
      ]),
    [
      from,
      to,
      status,
      source,
      priority,
      assignmentStatus,
      customerId,
      assignedToUserId,
    ],
  );

  function resetFilters() {
    setFrom("");
    setTo("");
    setStatus("");
    setSource("");
    setPriority("");
    setAssignmentStatus("");
    setCustomerId("");
    setAssignedToUserId("");
  }

  if (authLoading) {
    return (
      <AppShell title="Inquiries">
        <PageLoading />
      </AppShell>
    );
  }

  if (!canRead) {
    return (
      <AppShell title="Inquiries">
        <AccessDenied />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Inquiries"
      subtitle="Review customer requests, confirm requirements and track fulfillment."
      breadcrumbs={[
        { label: "Home", href: "/dashboard" },
        { label: "Inquiries" },
      ]}
      actions={
        <PermissionGate permission="inquiries.write">
          <FrappeButtonPrimary asChild>
            <Link href="/inquiries/new">
              <PlusIcon className="size-3.5" />
              New inquiry
            </Link>
          </FrappeButtonPrimary>
        </PermissionGate>
      }
    >
      <div className="space-y-5">
        <section
          aria-label="Inquiry overview"
          className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        >
          <MetricCard
            compactOnMobile
            label="Total inquiries"
            value={loading ? "\u2014" : meta.total}
            hint="Matching current filters"
            icon={ClipboardListIcon}
          />
          <MetricCard
            compactOnMobile
            label="Open inquiries"
            value={
              loading
                ? "\u2014"
                : totals
                  ? (totals.byStatus.NEW ?? 0) +
                    (totals.byStatus.IN_PROGRESS ?? 0) +
                    (totals.byStatus.QUOTED ?? 0)
                  : "\u2014"
            }
            hint="New, in progress or confirmed"
            icon={ClockIcon}
            tone="amber"
          />
          <MetricCard
            compactOnMobile
            label="Confirmed"
            value={
              loading
                ? "\u2014"
                : totals
                  ? (totals.byStatus.QUOTED ?? 0)
                  : "\u2014"
            }
            hint="Requirements ready for fulfillment"
            icon={CheckCircle2Icon}
            tone="teal"
          />
          <MetricCard
            compactOnMobile
            label="Converted to sale"
            value={
              loading
                ? "\u2014"
                : totals
                  ? (totals.converted ?? totals.byStatus.CONVERTED ?? 0)
                  : "\u2014"
            }
            hint="Sales created from inquiries"
            icon={ShoppingCartIcon}
            tone="sky"
          />
        </section>
        <DataCardTable
          storageKey="inquiries-list"
          rows={rows}
          loading={loading}
          filters={
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search reference, customer or product..."
            />
          }
          toolbar={
            <TableFiltersSheet
              activeCount={activeFilterCount}
              onReset={resetFilters}
            >
              <FilterField label="Date range">
                <DateRangeFilter
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                  compact={false}
                />
              </FilterField>
              <FilterField label="Status">
                <Select
                  value={status || "__all__"}
                  onValueChange={(v) =>
                    setStatus(v === "__all__" ? "" : (v as InquiryStatus))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    {INQUIRY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {inquiryStatusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Priority">
                <Select
                  value={priority || "__all__"}
                  onValueChange={(v) =>
                    setPriority(v === "__all__" ? "" : (v as InquiryPriority))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All priorities</SelectItem>
                    {INQUIRY_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Assignment">
                <Select
                  value={assignmentStatus || "__all__"}
                  onValueChange={(v) =>
                    setAssignmentStatus(
                      v === "__all__" ? "" : (v as InquiryAssignmentStatus),
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All assignments</SelectItem>
                    {INQUIRY_ASSIGNMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Customer">
                <Select
                  value={customerId || "__all__"}
                  onValueChange={(v) => setCustomerId(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All customers</SelectItem>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Assigned to">
                <Select
                  value={assignedToUserId || "__all__"}
                  onValueChange={(v) =>
                    setAssignedToUserId(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Anyone assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Anyone assigned</SelectItem>
                    {(users ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </TableFiltersSheet>
          }
          emptyTitle="No inquiries"
          emptyDescription="Create an inquiry to record a customer request and its products."
          pagination={{
            meta,
            onPageChange: setPage,
            onLimitChange: setLimit,
            disabled: loading,
          }}
          columns={[
            {
              key: "reference",
              header: "Reference",
              priority: 10,
              cell: (r) => (
                <Link
                  href={`/inquiries/${r.id}`}
                  className="whitespace-nowrap font-medium text-primary hover:underline"
                >
                  {inquiryReference(r)}
                </Link>
              ),
            },
            {
              key: "requestedDeliveryDate",
              header: "Requested delivery",
              priority: 60,
              cell: (r) => r.requestedDeliveryDate ?? "Not specified",
            },
            {
              key: "createdAt",
              header: "Created",
              defaultVisible: false,
              priority: 80,
              cell: (r) => formatDate(r.createdAt),
            },
            {
              key: "contact",
              header: "Customer",
              priority: 30,
              cell: (r) => (
                <span className="font-medium">
                  {r.customer?.name ??
                    (r.source === "PUBLIC"
                      ? r.contactName
                      : "Internal request")}
                </span>
              ),
            },
            {
              key: "subject",
              header: "Inquiry",
              defaultVisible: false,
              priority: 20,
              cell: (r) => (
                <Link
                  href={`/inquiries/${r.id}`}
                  className="block max-w-[280px] truncate text-left font-medium text-primary hover:underline"
                >
                  {r.subject}
                </Link>
              ),
            },
            {
              key: "items",
              header: "Products",
              priority: 40,
              cell: (r) => (
                <span
                  className="line-clamp-2 max-w-[220px] text-sm text-[var(--frappe-text-muted)]"
                  title={inquiryItemsSummary(r)}
                >
                  {inquiryItemsSummary(r)}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              priority: 50,
              cell: (r) => <InquiryStatusBadge status={r.status} />,
            },
            {
              key: "assignment",
              header: "Assignment",
              defaultVisible: false,
              cell: (r) => (
                <InquiryAssignmentBadge status={r.assignmentStatus} />
              ),
            },
            {
              key: "priority",
              header: "Priority",
              defaultVisible: false,
              cell: (r) => <InquiryPriorityBadge priority={r.priority} />,
            },
            {
              key: "source",
              header: "Source",
              defaultVisible: false,
              cell: (r) => <InquirySourceBadge source={r.source} />,
            },
            {
              key: "assigned",
              header: "Assigned to",
              priority: 70,
              cell: (r) => r.assignedTo?.fullName || r.assignedTo?.email || "—",
            },
            {
              key: "actions",
              header: "Actions",
              hideable: false,
              priority: 10000,
              className: "w-14 text-right",
              cell: (r) => (
                <InquiryActions
                  inquiry={r}
                  compact
                  onChanged={() => void reload()}
                />
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
