"use client";

import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Wide Frappe-style modal for multi-section inquiry forms. */
export const inquiryDialogContentClass =
  "flex max-h-[min(90vh,720px)] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl";

export function InquiryFormDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogContent className={cn(inquiryDialogContentClass, className)}>
      {children}
    </DialogContent>
  );
}

export function InquiryFormDialogHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <DialogHeader className="shrink-0 border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-5 py-4">
      <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
      {children}
    </DialogHeader>
  );
}

export function InquiryFormDialogBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-5">
      {children}
    </div>
  );
}

export function InquiryFormDialogFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DialogFooter className="shrink-0 gap-2 border-t border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-5 py-3 sm:justify-end">
      {children}
    </DialogFooter>
  );
}
