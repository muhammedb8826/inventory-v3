"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { adminNav, mainNav, masterNav, type NavItem } from "@/lib/navigation";
import { useBranding } from "@/components/branding/branding-provider";
import { BoxesIcon } from "lucide-react";

function filterNav(
  items: NavItem[],
  user: ReturnType<typeof useAuth>["user"]
) {
  return items.filter((item) => {
    if (item.permission) return hasPermission(user, item.permission);
    if (item.permissions) return hasAnyPermission(user, item.permissions);
    return true;
  });
}

function NavItems({
  items,
  user,
}: {
  items: NavItem[];
  user: ReturnType<typeof useAuth>["user"];
}) {
  const pathname = usePathname();
  const visible = filterNav(items, user);

  if (visible.length === 0) return null;

  return (
    <SidebarMenu className="gap-0.5">
      {visible.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={item.title}
              className="h-10 rounded-xl px-3 text-[13px] font-medium"
            >
              <Link href={item.href}>
                <Icon className="size-4 opacity-90" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { appName } = useBranding();
  const adminVisible = filterNav(adminNav, user);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="h-12 rounded-xl px-2.5 data-[slot=sidebar-menu-button]:p-2!"
            >
              <Link href="/dashboard">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 ring-1 ring-teal-600/25 dark:from-teal-500/25 dark:to-teal-700/20 dark:text-teal-300 dark:ring-teal-400/30">
                  <BoxesIcon className="size-5" />
                </span>
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-[15px] font-semibold tracking-tight text-slate-800 dark:text-sidebar-foreground">
                    {appName}
                  </span>
                  <span className="truncate text-[11px] text-slate-500 dark:text-muted-foreground">
                    Stock operations
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-1 px-3">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItems items={mainNav} user={user} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-4 p-0">
          <SidebarGroupLabel className="mb-1 px-3">Master data</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItems items={masterNav} user={user} />
          </SidebarGroupContent>
        </SidebarGroup>
        {adminVisible.length > 0 ? (
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="mb-1 px-3">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={adminNav} user={user} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {user ? (
          <NavUser
            user={{
              name: user.fullName,
              email: user.email,
              role: user.role.name,
            }}
          />
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
