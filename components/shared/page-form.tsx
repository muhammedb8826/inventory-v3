"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Single form width used across create/edit pages and detail layouts. */
export const PAGE_FORM_MAX_WIDTH = "max-w-5xl";

export function PageForm({
  children,
  onSubmit,
  className,
  maxWidth = PAGE_FORM_MAX_WIDTH,
}: {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "mx-auto w-full max-w-full space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:pb-24",
        maxWidth,
        className,
      )}
    >
      {children}
    </form>
  );
}

export function PageFormCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("app-surface overflow-hidden", className)}>{children}</div>
  );
}

export function PageFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-b border-[var(--frappe-border)] last:border-b-0",
        className,
      )}
    >
      <div className="space-y-1 px-4 pt-4 sm:px-6 sm:pt-5">
        <h2 className="text-base font-semibold tracking-tight text-[var(--frappe-text)]">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-[var(--frappe-text-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </section>
  );
}

export function FormGrid({
  children,
  cols = 2,
  className,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 md:grid-cols-2",
        cols === 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormField({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-sm font-medium text-[var(--frappe-text)]"
      >
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--frappe-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function PageFormActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex flex-col-reverse gap-2.5 border-t border-[var(--frappe-border)] bg-[color-mix(in_oklab,var(--frappe-desk)_92%,transparent)] px-0 py-3 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:py-4 [&_button]:w-full sm:[&_button]:w-auto [&_a]:w-full sm:[&_a]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageFormCancel({ href }: { href: string }) {
  return (
    <Button type="button" variant="outline" asChild>
      <Link href={href}>Cancel</Link>
    </Button>
  );
}
