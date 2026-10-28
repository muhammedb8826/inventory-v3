"use client";

import { cn } from "@/lib/utils";
import { FrappeBreadcrumbs } from "./frappe-breadcrumbs";

export interface FrappeBreadcrumb {
  label: string;
  href?: string;
}

/** Page-specific title, breadcrumbs, and actions (not global chrome). */
export function FrappePageHead({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: FrappeBreadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "frappe-page-head shrink-0 border-b border-[var(--frappe-border)]/60",
        className
      )}
    >
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-4 sm:py-5 lg:px-6">
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <FrappeBreadcrumbs items={breadcrumbs} className="mb-1.5" />
          ) : null}
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:truncate sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&_a]:min-w-0 [&_button]:min-w-0">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FrappePageBody({
  children,
  className,
  noPadding,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "frappe-page-body-pad flex-1 overflow-auto bg-[var(--frappe-desk)]",
        !noPadding && "p-3 sm:p-4 lg:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Compact filter/search row — prefer passing as DataCardTable `filters`. */
export function FrappeFilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "frappe-filter-bar flex min-w-0 flex-wrap items-center gap-2 [&_[data-slot=select-trigger]]:h-9 [&_[data-slot=select-trigger]]:rounded-xl [&_[data-slot=select-trigger]]:border-border/80 [&_[data-slot=select-trigger]]:bg-background [&_[data-slot=select-trigger]]:shadow-none",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FrappeListToolbar({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground [&>:not(:first-child)]:before:mr-2 [&>:not(:first-child)]:before:text-muted-foreground/40 [&>:not(:first-child)]:before:content-['·']",
        className
      )}
    >
      {children ?? null}
    </div>
  );
}

export function FrappeFormToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-3 -mt-3 mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-3 py-2.5 shadow-sm sm:-mx-4 sm:-mt-4 sm:px-4 lg:-mx-6 lg:-mt-6 lg:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FrappeDocument({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--frappe-border)] bg-[var(--frappe-surface)] shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
