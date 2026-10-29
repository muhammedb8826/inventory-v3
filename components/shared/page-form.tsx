"use client";
import { Children, isValidElement, useId, type ReactNode } from "react";
import Link from "next/link";
import { ClipboardCheckIcon, InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormFieldContext } from "@/components/shared/form-field-context";
export const PAGE_FORM_MAX_WIDTH = "max-w-6xl";
export function PageForm({
  children,
  onSubmit,
  className,
  maxWidth = PAGE_FORM_MAX_WIDTH,
  aside,
}: {
  children: ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  maxWidth?: string;
  aside?: ReactNode;
}) {
  const nodes = Children.toArray(children);
  const isAction = (node: ReactNode) =>
    isValidElement(node) && node.type === PageFormActions;
  return (
    <form
      onSubmit={onSubmit}
      className={cn("form-page mx-auto w-full min-w-0", maxWidth, className)}
    >
      <p className="form-required-note">
        <span aria-hidden="true">*</span> Required fields
      </p>
      {aside ? (
        <div className="form-layout">
          <div className="form-main">{nodes.filter((n) => !isAction(n))}</div>
          <aside
            className="form-aside"
            aria-label="Form summary and supporting information"
          >
            {aside}
          </aside>
        </div>
      ) : (
        <div className="form-main">{nodes.filter((n) => !isAction(n))}</div>
      )}
      {nodes.filter(isAction)}
    </form>
  );
}
export function PageFormCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("form-card", className)}>{children}</div>;
}
export function PageFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("form-section", className)}>
      <div className="form-section-heading">
        <span className="form-step" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id={id}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="form-section-body">{children}</div>
    </section>
  );
}
export function FormGrid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "form-grid grid gap-x-5 gap-y-5",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        cols === 3 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
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
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const generated = useId();
  const id = htmlFor ?? generated;
  const labelId = generated + "-label";
  const descriptionId = hint || error ? generated + "-description" : undefined;
  return (
    <FormFieldContext.Provider
      value={{ id, labelId, descriptionId, invalid: !!error, required }}
    >
      <div
        className={cn("form-field grid min-w-0 content-start gap-2", className)}
      >
        <Label id={labelId} htmlFor={id} className="form-label">
          {label}
          {required && (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          )}
        </Label>
        {children}
        {(error || hint) && (
          <p
            id={descriptionId}
            role={error ? "alert" : undefined}
            className={cn("form-help", error && "text-destructive")}
          >
            {error || hint}
          </p>
        )}
      </div>
    </FormFieldContext.Provider>
  );
}
export function PageFormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("form-actions", className)}>
      <span className="form-actions-note">
        <InfoIcon aria-hidden="true" className="size-4" />
        Review your details before saving.
      </span>
      <div className="form-action-buttons">{children}</div>
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
export function FormSummary({
  title = "Quick summary",
  rows,
  note,
  children,
}: {
  title?: string;
  rows: { label: string; value: ReactNode }[];
  note?: string;
  children?: ReactNode;
}) {
  return (
    <section className="form-summary" aria-label={title}>
      <h2>
        <ClipboardCheckIcon
          aria-hidden="true"
          className="size-4 text-primary"
        />
        {title}
      </h2>
      <dl>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {row.value === "" || row.value == null ? (
                <span className="font-normal text-muted-foreground">
                  Not set
                </span>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {children}
      {note && (
        <p className="form-summary-note">
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {note}
        </p>
      )}
    </section>
  );
}
