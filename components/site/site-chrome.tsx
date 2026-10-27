"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBranding } from "@/components/branding/branding-provider";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { appName } = useBranding();
  const onHero = pathname === "/";

  return (
    <header
      className={cn(
        "z-20",
        onHero
          ? "absolute inset-x-0 top-0"
          : "sticky top-0 border-b border-[var(--site-line)] bg-[var(--site-surface)]/90 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className={cn(
            "site-display text-2xl font-semibold tracking-tight sm:text-3xl",
            onHero ? "text-white drop-shadow-sm" : "text-[var(--site-ink)]"
          )}
        >
          {appName}
        </Link>
        <nav
          className={cn(
            "flex items-center gap-5 text-sm",
            onHero ? "text-white/90" : "text-[var(--site-ink-soft)]"
          )}
        >
          <a
            href={onHero ? "#inquire" : "/#inquire"}
            className={cn(
              "hidden font-medium transition-opacity hover:opacity-100 sm:inline",
              onHero ? "opacity-90" : "hover:text-[var(--site-ink)]"
            )}
          >
            Request a quote
          </a>
          <Link
            href="/login"
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              onHero
                ? "border border-white/35 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                : "border border-[var(--site-line)] bg-[var(--site-paper)] text-[var(--site-ink)] hover:border-[var(--site-accent)]"
            )}
          >
            Staff sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { appName } = useBranding();

  return (
    <footer className="border-t border-[var(--site-line)] bg-[var(--site-surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-[var(--site-ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="site-display text-lg text-[var(--site-ink)]">{appName}</p>
        <p>Questions about products, availability, or custom quotes.</p>
        <Link
          href="/login"
          className="font-medium text-[var(--site-accent)] underline-offset-4 hover:underline"
        >
          Staff sign in
        </Link>
      </div>
    </footer>
  );
}
