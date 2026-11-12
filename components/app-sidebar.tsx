"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { isNavItemActive } from "@/lib/navigation";
import {
  appModules,
  resolveActiveApp,
  type AppModule,
  type ModuleLink,
} from "@/lib/modules";
import { useBranding } from "@/components/branding/branding-provider";
import { BoxesIcon, LayoutGridIcon, ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

function canSeeLink(
  link: Pick<ModuleLink, "permission" | "permissions">,
  user: ReturnType<typeof useAuth>["user"],
) {
  if (link.permission) return hasPermission(user, link.permission);
  if (link.permissions) return hasAnyPermission(user, link.permissions);
  return true;
}

function canSeeApp(mod: AppModule, user: ReturnType<typeof useAuth>["user"]) {
  return hasAnyPermission(user, mod.permissions);
}

function linkIsActive(
  pathname: string,
  search: string,
  href: string,
): boolean {
  const [pathPart, queryPart] = href.split("?");
  if (queryPart) {
    if (pathname !== pathPart && !pathname.startsWith(`${pathPart}/`)) {
      return false;
    }
    const want = new URLSearchParams(queryPart);
    const have = new URLSearchParams(search);
    for (const [key, value] of want.entries()) {
      if (have.get(key) !== value) return false;
    }
    return true;
  }
  if (href === "/inventory") {
    const tab = new URLSearchParams(search).get("tab");
    if (tab === "adjustments" || tab === "movements") return false;
    return (
      pathname === "/inventory" ||
      /^\/inventory\/[^/]+(\/edit)?$/.test(pathname)
    );
  }
  return isNavItemActive(pathname, href);
}

function AppsSwitcherNav({
  user,
}: {
  user: ReturnType<typeof useAuth>["user"];
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const visible = appModules.filter((m) => canSeeApp(m, user));

  return (
    <SidebarGroup className="px-0 pb-1 pt-2">
      <SidebarGroupLabel className="mb-1 px-3">Applications</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {visible.map((mod) => {
            const Icon = mod.icon;
            const active =
              pathname === mod.href ||
              (mod.href !== "/apps" &&
                (pathname === mod.href ||
                  pathname.startsWith(`${mod.href}/`)));
            return (
              <SidebarMenuItem key={mod.id}>
                <SidebarMenuButton
                  asChild
                  isActive={active && pathname !== "/apps"}
                  tooltip={mod.name}
                  className="workspace-nav-link h-10 rounded-xl px-3 text-[13px] font-medium"
                >
                  <Link
                    href={mod.href}
                    onClick={() => setOpenMobile(false)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-4 opacity-90" style={{ color: mod.color }} />
                    <span>{mod.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function InAppNav({
  app,
  user,
}: {
  app: AppModule;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { setOpenMobile } = useSidebar();

  return (
    <>
      <SidebarGroup className="px-0 pb-1 pt-2">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="All apps"
                className="workspace-nav-link h-10 rounded-xl px-3 text-[13px] font-medium"
              >
                <Link href="/apps" onClick={() => setOpenMobile(false)}>
                  <ArrowLeftIcon className="size-4 opacity-90" />
                  <span>All apps</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === app.href}
                tooltip={`${app.name} home`}
                className="workspace-nav-link h-10 rounded-xl px-3 text-[13px] font-medium"
              >
                <Link href={app.href} onClick={() => setOpenMobile(false)}>
                  <LayoutGridIcon className="size-4 opacity-90" />
                  <span>{app.name} overview</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {app.menus.map((group) => {
        const links = group.links.filter((link) => canSeeLink(link, user));
        if (links.length === 0) return null;
        return (
          <SidebarGroup key={group.label} className="px-0 pb-1 pt-2">
            <SidebarGroupLabel className="mb-1 px-3">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = linkIsActive(pathname, search, link.href);
                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={link.title}
                        className="workspace-nav-link h-10 rounded-xl px-3 text-[13px] font-medium"
                      >
                        <Link
                          href={link.href}
                          onClick={() => setOpenMobile(false)}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon className="size-4 opacity-90" />
                          <span>{link.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}

function SidebarBody() {
  const pathname = usePathname();
  const { user } = useAuth();
  const activeApp = resolveActiveApp(pathname);

  if (!activeApp) {
    return <AppsSwitcherNav user={user} />;
  }

  return <InAppNav app={activeApp} user={user} />;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { appName } = useBranding();
  const pathname = usePathname();
  const activeApp = resolveActiveApp(pathname);
  const HeaderIcon = activeApp?.icon ?? BoxesIcon;

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
              <Link href={activeApp ? activeApp.href : "/apps"}>
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl text-primary-foreground shadow-sm ring-1 ring-primary/20",
                    activeApp ? "" : "bg-primary shadow-primary/20",
                  )}
                  style={
                    activeApp
                      ? {
                          backgroundColor: activeApp.color,
                          boxShadow: `0 4px 14px ${activeApp.color}44`,
                        }
                      : undefined
                  }
                >
                  <HeaderIcon className="size-5" />
                </span>
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-[15px] font-semibold tracking-tight text-slate-800 dark:text-sidebar-foreground">
                    {activeApp ? activeApp.name : appName}
                  </span>
                  <span className="truncate text-[11px] text-slate-500 dark:text-muted-foreground">
                    {activeApp ? "Application" : "All applications"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2.5 py-3">
        <Suspense fallback={null}>
          <SidebarBody />
        </Suspense>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {user ? (
          <NavUser
            user={{
              name: user.fullName,
              email: user.email,
              role: user.role?.name,
            }}
          />
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
