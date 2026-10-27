"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopHeader } from "@/components/app-top-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SiteHeader } from "@/components/site-header";
import {
  FrappePageBody,
  FrappePageHead,
  type FrappeBreadcrumb,
} from "@/components/frappe";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  subtitle,
  breadcrumbs,
  children,
  actions,
  variant = "list",
  layout = "frappe",
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: FrappeBreadcrumb[];
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "list" | "form" | "plain";
  /** frappe = ERP-style page content; default = shadcn dashboard-style page */
  layout?: "frappe" | "default";
  className?: string;
}) {
  const isFrappe = layout === "frappe";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <TooltipProvider>
        <AppSidebar variant="inset" />
        <SidebarInset className="flex flex-col overflow-hidden bg-[var(--frappe-desk)] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-[var(--frappe-border)] md:peer-data-[variant=inset]:shadow-[var(--frappe-shadow-lg)]">
          <AppTopHeader />
          {isFrappe ? (
            <div className="frappe-page flex min-h-0 flex-1 flex-col">
              {variant !== "plain" ? (
                <FrappePageHead
                  title={title}
                  subtitle={subtitle}
                  breadcrumbs={breadcrumbs}
                  actions={actions}
                />
              ) : null}
              <FrappePageBody
                className={cn(variant === "form" && "pb-8", className)}
              >
                {children}
              </FrappePageBody>
            </div>
          ) : (
            <>
              {variant !== "plain" ? (
                <SiteHeader title={title} actions={actions} />
              ) : null}
              <div
                className={cn(
                  "frappe-page-body-pad flex flex-1 flex-col gap-4 overflow-auto p-3 sm:p-4 md:gap-6 md:p-6",
                  className
                )}
              >
                {children}
              </div>
            </>
          )}
        </SidebarInset>
        <MobileBottomNav />
      </TooltipProvider>
    </SidebarProvider>
  );
}
