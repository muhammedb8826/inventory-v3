"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MessagesBell } from "@/components/messages/messages-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderClock } from "@/components/header-clock";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { WorkspaceSearch } from "@/components/workspace-search";
import { useBranding } from "@/components/branding/branding-provider";
import {
  mainNav,
  configNav,
  adminNav,
  isNavItemActive,
  navigationPath,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { BoxesIcon } from "lucide-react";

export function AppTopHeader({
  className,
  appsLauncher = false,
}: {
  className?: string;
  appsLauncher?: boolean;
}) {
  const rawPath = usePathname();
  const path = navigationPath(rawPath);
  const { appName } = useBranding();
  const section = [...mainNav, ...configNav, ...adminNav]
    .filter((item) => isNavItemActive(path, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <header
      className={cn(
        "workspace-top-header z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/75 bg-card/95 px-3 backdrop-blur-xl sm:px-5 lg:px-7",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {appsLauncher ? (
          <Link
            href="/apps"
            className="flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-1 hover:bg-accent/60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <BoxesIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                {appName}
              </p>
              <p className="hidden text-[10px] font-medium uppercase tracking-[.14em] text-muted-foreground sm:block">
                Applications
              </p>
            </div>
          </Link>
        ) : (
          <>
            <SidebarTrigger className="size-9 shrink-0 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary" />
            <div className="h-5 w-px bg-border/80" />
            <div className="min-w-0">
              <p className="hidden text-[10px] font-medium uppercase tracking-[.14em] text-muted-foreground lg:block">
                Workspace
              </p>
              <p className="max-w-28 truncate text-xs font-semibold sm:max-w-40 sm:text-sm">
                {section?.title ?? "Account"}
              </p>
            </div>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {!appsLauncher ? <WorkspaceSearch /> : null}
        <div className="hidden xl:block">
          <HeaderClock />
        </div>
        <div className="hidden md:block">
          <ThemeToggle
            variant="ghost"
            className="size-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary"
          />
        </div>
        <MessagesBell />
        <NotificationBell />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <HeaderUserMenu />
      </div>
    </header>
  );
}
