"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type HubLink = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

export type HubSection = {
  label: string;
  description?: string;
  links: HubLink[];
};

export function SectionHub({
  title,
  subtitle,
  sections,
  accent = "#714B67",
}: {
  title: string;
  subtitle: string;
  sections: HubSection[];
  accent?: string;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {sections.map((section) => (
        <section key={section.label} className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {section.label}
            </h3>
            {section.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {section.description}
              </p>
            ) : null}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.links.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex h-full gap-3 rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${accent}18`, color: accent }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {link.title}
                        </span>
                        {link.badge ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {link.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {link.description}
                      </span>
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

export function ComingSoonPanel({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: { label: string; href: string }[];
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{body}</p>
      {actions?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium",
                "hover:bg-muted",
              )}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
