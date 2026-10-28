"use client";

import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Wide CRM modal — gray canvas body, white form card, padded footer. */
export const inquiryDialogContentClass =
  "flex max-h-[min(92vh,880px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-5xl";

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
    <DialogHeader className="shrink-0 space-y-2 border-b border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-6 pb-4 pt-5 text-left">
      <DialogTitle>{title}</DialogTitle>
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
    <div className="app-canvas min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-5">
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
    <DialogFooter className="app-modal-footer shrink-0 !flex-col-reverse gap-2.5 border-t border-[var(--frappe-border)] bg-[var(--frappe-surface)] sm:!flex-row sm:justify-end">
      {children}
    </DialogFooter>
  );
}
