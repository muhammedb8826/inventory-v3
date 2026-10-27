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
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { adminNav, mainNav, masterNav, type NavItem } from "@/lib/navigation";
import { useBranding } from "@/components/branding/branding-provider";
import { CommandIcon } from "lucide-react";

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
    <SidebarMenu>
      {visible.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
              <Link href={item.href}>
                <Icon />
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
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">{appName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItems items={mainNav} user={user} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Master data</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItems items={masterNav} user={user} />
          </SidebarGroupContent>
        </SidebarGroup>
        {adminVisible.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={adminNav} user={user} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
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
    </Sidebar>
  );
}
