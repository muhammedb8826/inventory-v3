"use client";

import * as React from "react";
import {
  AppModal,
  bindAppModalTrigger,
  useAppModal,
} from "@/components/shared/app-modal";

/**
 * Quick-create fields rendered inside a full-page form (e.g. purchase/sale).
 * Uses a div instead of nested <form> so the parent form is not submitted.
 */
export function QuickCreateDialogShell({
  open,
  onOpenChange,
  title,
  description = "Enter the details below. Fields marked with * are required.",
  children,
  footer,
  size = "sm",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      size={size}
    >
      {children}
    </AppModal>
  );
}

export function useQuickCreateDialog() {
  return useAppModal();
}

export function bindQuickCreateTrigger(
  trigger: React.ReactNode | undefined,
  openDialog: () => void,
  fallback: React.ReactNode,
) {
  return bindAppModalTrigger(trigger, openDialog, fallback);
}
