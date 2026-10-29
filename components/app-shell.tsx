"use client";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  subtitle,
  breadcrumbs,
  children,
  actions,
  variant = "list",
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "list" | "form" | "plain";
  layout?: "frappe" | "default";
  className?: string;
}) {
  return (
    <div className="workspace-page flex min-h-0 min-w-0 flex-1 flex-col">
      <main
        id="workspace-content"
        tabIndex={-1}
        className={cn(
          "workspace-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-28 outline-none md:pb-8",
          variant === "form" && "md:pb-12",
          className,
        )}
      >
        {variant !== "plain" && (
          <PageHeader
            maxWidth={variant === "form" ? "max-w-6xl" : "max-w-[1600px]"}
            title={title}
            subtitle={subtitle}
            breadcrumbs={breadcrumbs}
            actions={actions}
          />
        )}
        <div
          className={cn(
            "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8",
            variant === "plain" && "pt-6",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
