"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MessagesBell } from "@/components/messages/messages-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderClock } from "@/components/header-clock";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { cn } from "@/lib/utils";

/** Global chrome: always visible across pages (not page title/actions). */
export function AppTopHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "frappe-app-header sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--frappe-border)]/80 px-3 sm:px-4 lg:px-6",
        className
      )}
    >
      <SidebarTrigger className="size-9 shrink-0 rounded-xl text-[var(--frappe-text-muted)] hover:bg-[var(--frappe-section-head)] hover:text-[var(--frappe-text)]" />
      <div className="min-w-0 flex-1" />
      <div className="flex items-center gap-1 sm:gap-1.5">
        <HeaderClock />
        <ThemeToggle
          variant="ghost"
          className="size-9 rounded-xl text-[var(--frappe-text-muted)] hover:bg-[var(--frappe-section-head)] hover:text-[var(--frappe-text)]"
        />
        <MessagesBell />
        <NotificationBell />
        <div className="mx-0.5 hidden h-6 w-px bg-[var(--frappe-border)] sm:block" />
        <HeaderUserMenu />
      </div>
    </header>
  );
}
