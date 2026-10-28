"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopHeader } from "@/components/app-top-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PageHeader } from '@/components/shared/page-header';
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
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "list" | "form" | "plain";
  /** frappe = ERP-style page content; default = shadcn dashboard-style page */
  layout?: "frappe" | "default";
  className?: string;
}) {

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
          <a href="#workspace-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground">Skip to content</a>
          <div className="workspace-page flex min-h-0 flex-1 flex-col">
            {variant !== 'plain' && <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={actions} />}
            <main id="workspace-content" tabIndex={-1} className={cn('workspace-content frappe-page-body-pad flex-1 overflow-auto px-4 pb-8 sm:px-7 lg:px-9', variant === 'form' && 'pb-12', className)}>
              <div className="mx-auto w-full max-w-[1600px]">{children}</div>
            </main>
          </div>
        </SidebarInset>
        <MobileBottomNav />
      </TooltipProvider>
    </SidebarProvider>
  );
}
