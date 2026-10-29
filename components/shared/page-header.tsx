import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  maxWidth = "max-w-[1600px]",
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <header className="workspace-page-header px-4 pb-6 pt-7 sm:px-6 lg:px-8">
      <div
        className={`mx-auto flex ${maxWidth} flex-wrap items-end justify-between gap-5`}
      >
        <div className="min-w-0">
          {breadcrumbs && (
            <nav aria-label="Breadcrumb" className="mb-3">
              <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {breadcrumbs.map((item, i) => (
                  <li
                    key={`${item.label}-${i}`}
                    className="flex items-center gap-2"
                  >
                    {i > 0 && (
                      <ChevronRightIcon className="size-3" aria-hidden="true" />
                    )}
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="rounded hover:text-primary focus-visible:outline-2"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{item.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
