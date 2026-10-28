"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Quick-create fields rendered inside a full-page form (e.g. purchase/sale).
 * Uses a div instead of nested <form> so the parent form is not submitted.
 */
export function QuickCreateDialogShell({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-xl p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 space-y-1 border-b border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-6 pb-4 pt-5 text-left">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="app-canvas px-6 py-5">{children}</div>
        <DialogFooter className="app-modal-footer border-t border-[var(--frappe-border)] bg-[var(--frappe-surface)]">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useQuickCreateDialog() {
  const [open, setOpen] = React.useState(false);
  return { open, setOpen, onOpenChange: setOpen };
}

export function bindQuickCreateTrigger(
  trigger: React.ReactNode | undefined,
  openDialog: () => void,
  fallback: React.ReactNode
) {
  if (trigger) {
    if (React.isValidElement<{ onClick?: React.MouseEventHandler }>(trigger)) {
      return React.cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e);
          if (!e.defaultPrevented) openDialog();
        },
      });
    }
    return trigger;
  }
  return fallback;
}
