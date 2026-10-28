"use client";

import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Wide CRM modal — nearly full-viewport on phone, capped on tablet/desktop.
 */
export const inquiryDialogContentClass =
  "flex max-h-[min(96dvh,920px)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl";

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
    <DialogHeader className="shrink-0 space-y-2 border-b border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-4 pb-3 pt-4 text-left sm:px-6 sm:pb-4 sm:pt-5">
      <DialogTitle className="pr-8 text-base sm:text-lg">{title}</DialogTitle>
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
    <div className="app-canvas min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
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
    <DialogFooter className="app-modal-footer shrink-0 border-t border-[var(--frappe-border)] bg-[var(--frappe-surface)] sm:!flex-row sm:justify-end">
      {children}
    </DialogFooter>
  );
}
