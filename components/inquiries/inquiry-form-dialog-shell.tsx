"use client";

import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Wide CRM-style modal — matches sales / production form width. */
export const inquiryDialogContentClass =
  "flex max-h-[min(92vh,880px)] w-full max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-xl sm:max-w-5xl";

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
    <DialogHeader className="shrink-0 space-y-2 border-b border-border/80 bg-muted/30 px-6 py-4 text-left">
      <DialogTitle className="text-lg font-semibold tracking-tight">
        {title}
      </DialogTitle>
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
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-background px-6 py-5">
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
    <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border/80 bg-muted/30 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-end">
      {children}
    </DialogFooter>
  );
}
