"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { appModules, type AppModule } from "@/lib/modules";
import { cn } from "@/lib/utils";

function canSeeModule(
  module: AppModule,
  user: ReturnType<typeof useAuth>["user"],
) {
  return hasAnyPermission(user, module.permissions);
}

/** Odoo-style app launcher grid (used on /apps with the sidebar). */
export function AppsHome() {
  const { user } = useAuth();
  const visible = appModules.filter((m) => canSeeModule(m, user));

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No applications are available for your role.
      </p>
    );
  }

  return (
    <div className="apps-launcher w-full max-w-5xl">
      <div className="apps-launcher-grid" role="list">
        {visible.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              role="listitem"
              className="apps-launcher-item group"
            >
              <span
                className={cn("apps-launcher-icon", mod.tint)}
                style={{ boxShadow: `0 10px 24px ${mod.color}33` }}
              >
                <Icon className="size-9" style={{ color: mod.color }} />
              </span>
              <span className="apps-launcher-label">{mod.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ModuleMenuGrid({ module }: { module: AppModule }) {
  const { user } = useAuth();

  const groups = module.menus
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => {
        if (link.permission) return hasPermission(user, link.permission);
        if (link.permissions) return hasAnyPermission(user, link.permissions);
        return true;
      }),
    }))
    .filter((g) => g.links.length > 0);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No menus in this application for your role.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.label} aria-labelledby={`menu-${group.label}`}>
          <h2
            id={`menu-${group.label}`}
            className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            {group.label}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.links.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex h-full gap-3 rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        module.tint,
                      )}
                    >
                      <Icon className="size-5" style={{ color: module.color }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {link.title}
                      </span>
                      {link.description ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {link.description}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
