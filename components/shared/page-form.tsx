"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function PageForm({
  children,
  onSubmit,
  className,
  maxWidth = "max-w-3xl",
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
        "mx-auto w-full space-y-6 pb-24",
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
    <div
      className={cn(
        "app-surface overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
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
      <div className="space-y-1 px-5 pt-5 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-[var(--frappe-text)]">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-[var(--frappe-text-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">{children}</div>
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
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        cols === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
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
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
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
        "sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--frappe-border)] bg-[color-mix(in_oklab,var(--frappe-desk)_92%,transparent)] py-4 backdrop-blur",
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
