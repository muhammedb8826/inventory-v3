"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const appModalSize = cva(
  "flex max-h-[min(96dvh,920px)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:w-full",
  {
    variants: {
      size: {
        sm: "sm:max-w-md",
        md: "sm:max-w-lg",
        lg: "sm:max-w-2xl",
        xl: "sm:max-w-4xl",
        full: "sm:max-w-[min(96vw,72rem)]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type AppModalSize = NonNullable<
  VariantProps<typeof appModalSize>["size"]
>;

export function useAppModal(defaultOpen = false) {
  const [open, setOpen] = React.useState(defaultOpen);
  return {
    open,
    setOpen,
    onOpenChange: setOpen,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
  };
}

/**
 * App-wide modal shell: sticky header + scrollable body + sticky footer.
 * Use for create/edit forms, confirmations with custom content, and pickers.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  showCloseButton = true,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
  preventOutsideClose = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: AppModalSize;
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  /** Keep the modal open on outside click / Escape when true. */
  preventOutsideClose?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(appModalSize({ size }), className)}
        onPointerDownOutside={
          preventOutsideClose ? (e) => e.preventDefault() : undefined
        }
        onInteractOutside={
          preventOutsideClose ? (e) => e.preventDefault() : undefined
        }
        onEscapeKeyDown={
          preventOutsideClose ? (e) => e.preventDefault() : undefined
        }
      >
        <DialogHeader
          className={cn(
            "app-modal-header shrink-0 space-y-1.5 border-b border-border bg-card text-left",
            headerClassName,
          )}
        >
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              Dialog
            </DialogDescription>
          )}
        </DialogHeader>

        <div
          className={cn(
            "app-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer != null && (
          <DialogFooter
            className={cn(
              "app-modal-footer shrink-0 border-t border-border bg-card",
              footerClassName,
            )}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper for cloning a custom trigger (or rendering a fallback) that opens a modal.
 */
export function bindAppModalTrigger(
  trigger: React.ReactNode | undefined,
  openModal: () => void,
  fallback: React.ReactNode,
) {
  if (trigger) {
    if (React.isValidElement<{ onClick?: React.MouseEventHandler }>(trigger)) {
      return React.cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e);
          if (!e.defaultPrevented) openModal();
        },
      });
    }
    return trigger;
  }
  return fallback;
}
