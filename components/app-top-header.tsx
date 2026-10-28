"use client";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MessagesBell } from "@/components/messages/messages-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderClock } from "@/components/header-clock";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { WorkspaceSearch } from "@/components/workspace-search";
import { mainNav, masterNav, adminNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
export function AppTopHeader({ className }: { className?: string }) {
  const path = usePathname();
  const section = [...mainNav, ...masterNav, ...adminNav]
    .filter((item) => path === item.href || path.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <header
      className={cn(
        "workspace-top-header z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/75 bg-card/95 px-3 backdrop-blur-xl sm:px-5 lg:px-7",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <WorkspaceSearch />
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
