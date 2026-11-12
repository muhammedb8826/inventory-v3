"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopHeader } from "@/components/app-top-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Persistent navigation keeps the sidebar, scroll regions and menus stable between pages. */
export function WorkspaceFrame({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const pathname = usePathname();
  const appsLauncher = pathname === "/apps";

  return (
    <SidebarProvider
      defaultOpen={appsLauncher ? false : defaultOpen}
      className="workspace-frame h-svh min-h-0 overflow-hidden"
      style={
        {
          "--sidebar-width": appsLauncher ? "0px" : "16rem",
          "--header-height": "4rem",
        } as React.CSSProperties
      }
    >
      <TooltipProvider>
        {!appsLauncher ? <AppSidebar variant="inset" /> : null}
        <SidebarInset
          className={cn(
            "workspace-inset flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
            !appsLauncher &&
              "md:m-2 md:ml-0 md:rounded-2xl md:border md:border-border/80",
          )}
        >
          <AppTopHeader appsLauncher={appsLauncher} />
          <a
            href="#workspace-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
          >
            Skip to content
          </a>
          {children}
        </SidebarInset>
        {!appsLauncher ? <MobileBottomNav /> : null}
      </TooltipProvider>
    </SidebarProvider>
  );
}
